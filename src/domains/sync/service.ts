import { Prisma, PrismaClient, Role, DeviceVendor, DeviceType } from '@prisma/client';
import { NotFoundError } from '@/core/errors/app-error';
import { logger } from '@/core/logger/logger';
import {
    SeedUserDataRequest,
    SeedUserDataResult,
    SyncedPreferencesSchema,
    SyncedUserSnapshot,
    SyncedUserSnapshotSchema,
} from './schemas';

export interface SyncService {
    seedUserData(request: SeedUserDataRequest): Promise<SeedUserDataResult>;
    getUserSnapshot(userId: string): Promise<SyncedUserSnapshot>;
}

export class SyncServiceImpl implements SyncService {
    constructor(private readonly prisma: PrismaClient) {}

    public async seedUserData(request: SeedUserDataRequest): Promise<SeedUserDataResult> {
        const devices = [...new Map(request.devices.map((item) => [`${item.vendor}\0${item.externalId}`, item])).values()];
        const rooms = [...new Map(request.rooms.map((item) => [item.id, item])).values()];
        const routines = [...new Map(request.routines.map((item) => [item.id, item])).values()];
        const seededAt = new Date();

        await this.prisma.$transaction(async (tx) => {
            // 1. Snapshot update in Synced* tables
            await tx.syncedUser.upsert({
                where: { id: request.userId },
                create: {
                    id: request.userId,
                    exportedAt: new Date(request.exportedAt),
                    seededAt,
                    clientPlatform: request.clientPlatform,
                    clientVersion: request.clientVersion,
                    environment: request.environment,
                    preferences: request.userPreferences
                        ? (request.userPreferences as Prisma.InputJsonValue)
                        : Prisma.DbNull,
                },
                update: {
                    exportedAt: new Date(request.exportedAt),
                    seededAt,
                    clientPlatform: request.clientPlatform,
                    clientVersion: request.clientVersion,
                    environment: request.environment,
                    preferences: request.userPreferences
                        ? (request.userPreferences as Prisma.InputJsonValue)
                        : Prisma.DbNull,
                },
            });

            await tx.syncedDevice.deleteMany({ where: { userId: request.userId } });
            await tx.syncedRoom.deleteMany({ where: { userId: request.userId } });
            await tx.syncedRoutine.deleteMany({ where: { userId: request.userId } });

            if (devices.length) {
                await tx.syncedDevice.createMany({
                    data: devices.map((item) => ({
                        userId: request.userId,
                        externalId: item.externalId,
                        vendor: item.vendor,
                        type: item.type,
                        name: item.name,
                        roomName: item.roomName ?? null,
                        capabilities: item.capabilities as Prisma.InputJsonValue,
                        state: item.state as Prisma.InputJsonValue,
                        isOnline: item.isOnline,
                    })),
                });
            }
            if (rooms.length) {
                await tx.syncedRoom.createMany({
                    data: rooms.map((item) => ({
                        userId: request.userId,
                        sourceId: item.id,
                        name: item.name,
                        icon: item.icon,
                    })),
                });
            }
            if (routines.length) {
                await tx.syncedRoutine.createMany({
                    data: routines.map((item) => ({
                        userId: request.userId,
                        sourceId: item.id,
                        name: item.name,
                        isEnabled: item.isEnabled,
                        triggerType: item.triggerType,
                        executionCount: item.executionCount,
                        actions: item.actions as Prisma.InputJsonValue,
                    })),
                });
            }

            // 2. Synchronize to Active Domain Entities (User, Home, Room, Device, AutomationRule)
            const userEmail = request.userId.includes('@')
                ? request.userId
                : `${request.userId.toLowerCase().replace(/[^a-z0-9]/g, '_')}@abshome.dev`;

            let user = await tx.user.findFirst({
                where: {
                    OR: [
                        { id: request.userId },
                        { email: userEmail },
                        { email: request.userId },
                    ],
                },
            });

            if (!user) {
                user = await tx.user.create({
                    data: {
                        email: userEmail,
                        name: `User ${request.userId}`,
                        role: Role.MEMBER,
                    },
                });
            }

            let home = await tx.home.findFirst({
                where: { ownerId: user.id },
            });

            if (!home) {
                home = await tx.home.create({
                    data: {
                        name: `${user.name}'s Residence`,
                        timezone: 'America/Santiago',
                        ownerId: user.id,
                    },
                });
            }

            // Upsert Domain Rooms
            const roomMap = new Map<string, string>();
            for (const r of rooms) {
                let roomRecord = await tx.room.findFirst({
                    where: {
                        homeId: home.id,
                        name: { equals: r.name, mode: 'insensitive' },
                    },
                });

                if (!roomRecord) {
                    roomRecord = await tx.room.create({
                        data: {
                            name: r.name,
                            icon: r.icon || 'sofa',
                            homeId: home.id,
                        },
                    });
                } else {
                    roomRecord = await tx.room.update({
                        where: { id: roomRecord.id },
                        data: { icon: r.icon || roomRecord.icon },
                    });
                }
                roomMap.set(r.name.toLowerCase(), roomRecord.id);
            }

            // Upsert Domain Devices
            for (const dev of devices) {
                const vendor = this.mapVendor(dev.vendor);
                const type = this.mapType(dev.type);
                const roomId = dev.roomName ? roomMap.get(dev.roomName.toLowerCase()) : undefined;

                await tx.device.upsert({
                    where: {
                        vendor_externalId: {
                            vendor,
                            externalId: dev.externalId,
                        },
                    },
                    create: {
                        externalId: dev.externalId,
                        vendor,
                        type,
                        name: dev.name,
                        roomId: roomId || null,
                        homeId: home.id,
                        state: (dev.state || {}) as Prisma.InputJsonValue,
                        capabilities: (dev.capabilities || []) as Prisma.InputJsonValue,
                        isOnline: dev.isOnline ?? true,
                    },
                    update: {
                        name: dev.name,
                        type,
                        roomId: roomId || null,
                        homeId: home.id,
                        state: (dev.state || {}) as Prisma.InputJsonValue,
                        capabilities: (dev.capabilities || []) as Prisma.InputJsonValue,
                        isOnline: dev.isOnline ?? true,
                        lastSeenAt: new Date(),
                    },
                });
            }

            // Upsert Domain Automations
            for (const routine of routines) {
                const existingAuto = await tx.automationRule.findFirst({
                    where: {
                        homeId: home.id,
                        name: routine.name,
                    },
                });

                if (existingAuto) {
                    await tx.automationRule.update({
                        where: { id: existingAuto.id },
                        data: {
                            isEnabled: routine.isEnabled,
                            triggerType: routine.triggerType || 'MANUAL',
                            triggerCondition: { type: routine.triggerType || 'MANUAL' },
                            actions: (routine.actions || []) as Prisma.InputJsonValue,
                        },
                    });
                } else {
                    await tx.automationRule.create({
                        data: {
                            name: routine.name,
                            isEnabled: routine.isEnabled,
                            triggerType: routine.triggerType || 'MANUAL',
                            triggerCondition: { type: routine.triggerType || 'MANUAL' },
                            actions: (routine.actions || []) as Prisma.InputJsonValue,
                            homeId: home.id,
                        },
                    });
                }
            }
        });

        logger.info(
            { userId: request.userId, deviceCount: devices.length, roomCount: rooms.length },
            '🌱 Mobile IoT fleet, rooms, and automations synced successfully to active domain models',
        );

        return {
            success: true,
            seededAt: seededAt.toISOString(),
            userId: request.userId,
            summary: {
                devicesSeeded: devices.length,
                roomsSeeded: rooms.length,
                routinesSeeded: routines.length,
                preferencesUpdated: request.userPreferences != null,
            },
            message: 'Mobile user data seeded and synced to smart home domain successfully.',
        };
    }

    public async getUserSnapshot(userId: string): Promise<SyncedUserSnapshot> {
        const user = await this.prisma.syncedUser.findUnique({
            where: { id: userId },
            include: { devices: true, rooms: true, routines: true },
        });
        if (!user) throw new NotFoundError(`No mobile export found for user "${userId}"`);

        return SyncedUserSnapshotSchema.parse({
            userId: user.id,
            exportedAt: user.exportedAt.toISOString(),
            seededAt: user.seededAt.toISOString(),
            clientPlatform: user.clientPlatform,
            clientVersion: user.clientVersion,
            environment: user.environment,
            userPreferences: user.preferences ? SyncedPreferencesSchema.parse(user.preferences) : null,
            devices: user.devices.map((item) => ({
                externalId: item.externalId,
                vendor: item.vendor,
                type: item.type,
                name: item.name,
                roomName: item.roomName,
                capabilities: item.capabilities,
                state: item.state,
                isOnline: item.isOnline,
            })),
            rooms: user.rooms.map((item) => ({
                id: item.sourceId,
                name: item.name,
                icon: item.icon,
            })),
            routines: user.routines.map((item) => ({
                id: item.sourceId,
                name: item.name,
                isEnabled: item.isEnabled,
                triggerType: item.triggerType,
                executionCount: item.executionCount,
                actions: item.actions,
            })),
        });
    }

    private mapVendor(raw: string): DeviceVendor {
        const upper = (raw || '').toUpperCase();
        switch (upper) {
            case 'HUE':
            case 'PHILIPS_HUE':
                return DeviceVendor.HUE;
            case 'NEST':
            case 'GOOGLE_NEST':
                return DeviceVendor.NEST;
            case 'SWITCHBOT':
                return DeviceVendor.SWITCHBOT;
            case 'RING':
                return DeviceVendor.RING;
            case 'BLINK':
                return DeviceVendor.BLINK;
            case 'ENERGY_METER':
            case 'SHELLY':
                return DeviceVendor.ENERGY_METER;
            default:
                return DeviceVendor.CUSTOM;
        }
    }

    private mapType(raw: string): DeviceType {
        const upper = (raw || '').toUpperCase();
        switch (upper) {
            case 'LIGHT':
                return DeviceType.LIGHT;
            case 'THERMOSTAT':
                return DeviceType.THERMOSTAT;
            case 'CURTAIN':
                return DeviceType.CURTAIN;
            case 'BOT':
                return DeviceType.BOT;
            case 'CAMERA':
                return DeviceType.CAMERA;
            case 'DOORBELL':
                return DeviceType.DOORBELL;
            case 'PLUG':
                return DeviceType.PLUG;
            case 'SENSOR':
                return DeviceType.SENSOR;
            case 'ENERGY_METER':
                return DeviceType.ENERGY_METER;
            default:
                return DeviceType.LIGHT;
        }
    }
}
