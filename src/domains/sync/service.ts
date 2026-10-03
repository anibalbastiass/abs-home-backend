import { PrismaClient, Role, DeviceVendor, DeviceType } from '@prisma/client';
import { logger } from '@/core/logger/logger';
import { BackendSeedPayload, BackendSeedResult } from './schemas';

export interface SyncService {
    seedDatabase(payload: BackendSeedPayload): Promise<BackendSeedResult>;
}

export class SyncServiceImpl implements SyncService {
    constructor(private readonly prisma: PrismaClient) {}

    async seedDatabase(payload: BackendSeedPayload): Promise<BackendSeedResult> {
        logger.info({ userId: payload.userId, deviceCount: payload.devices.length }, '🌱 Seeding backend database from mobile payload...');

        const email = payload.userId.includes('@') ? payload.userId : `${payload.userId.toLowerCase().replace(/[^a-z0-9]/g, '_')}@abshome.dev`;

        // 1. Upsert User
        const user = await this.prisma.user.upsert({
            where: { email },
            update: { name: `User ${payload.userId}` },
            create: {
                email,
                name: `User ${payload.userId}`,
                role: Role.MEMBER,
            },
        });

        // 2. Ensure Home exists for user
        let home = await this.prisma.home.findFirst({
            where: { ownerId: user.id },
        });

        if (!home) {
            home = await this.prisma.home.create({
                data: {
                    name: `${user.name}'s Residence`,
                    timezone: 'America/Santiago',
                    ownerId: user.id,
                },
            });
        }

        // 3. Upsert Rooms
        const roomMap = new Map<string, string>(); // name -> id
        let roomsSeeded = 0;

        for (const room of payload.rooms) {
            const upserted = await this.prisma.room.upsert({
                where: { id: room.id || '00000000-0000-0000-0000-000000000000' },
                update: {
                    name: room.name,
                    icon: room.icon || 'sofa',
                    homeId: home.id,
                },
                create: {
                    name: room.name,
                    icon: room.icon || 'sofa',
                    homeId: home.id,
                },
            });
            roomMap.set(room.name.toLowerCase(), upserted.id);
            roomsSeeded++;
        }

        // 4. Upsert Devices
        let devicesSeeded = 0;
        for (const dev of payload.devices) {
            const vendor = this.mapVendor(dev.vendor);
            const type = this.mapType(dev.type);
            const roomId = dev.roomName ? roomMap.get(dev.roomName.toLowerCase()) : undefined;

            await this.prisma.device.upsert({
                where: {
                    vendor_externalId: {
                        vendor,
                        externalId: dev.externalId,
                    },
                },
                update: {
                    name: dev.name,
                    type,
                    roomId: roomId || null,
                    homeId: home.id,
                    state: dev.state || {},
                    capabilities: dev.capabilities || [],
                    isOnline: dev.isOnline ?? true,
                    lastSeenAt: new Date(),
                },
                create: {
                    externalId: dev.externalId,
                    vendor,
                    type,
                    name: dev.name,
                    roomId: roomId || null,
                    homeId: home.id,
                    state: dev.state || {},
                    capabilities: dev.capabilities || [],
                    isOnline: dev.isOnline ?? true,
                },
            });
            devicesSeeded++;
        }

        // 5. Upsert Routines as Automations
        let routinesSeeded = 0;
        for (const routine of payload.routines) {
            if (routine.id) {
                await this.prisma.automationRule.upsert({
                    where: { id: routine.id },
                    update: {
                        name: routine.name,
                        isEnabled: routine.isEnabled,
                        triggerType: routine.triggerType || 'MANUAL',
                        triggerCondition: { type: routine.triggerType || 'MANUAL' },
                        actions: routine.actions || [],
                        homeId: home.id,
                    },
                    create: {
                        id: routine.id,
                        name: routine.name,
                        isEnabled: routine.isEnabled,
                        triggerType: routine.triggerType || 'MANUAL',
                        triggerCondition: { type: routine.triggerType || 'MANUAL' },
                        actions: routine.actions || [],
                        homeId: home.id,
                    },
                });
            } else {
                await this.prisma.automationRule.create({
                    data: {
                        name: routine.name,
                        isEnabled: routine.isEnabled,
                        triggerType: routine.triggerType || 'MANUAL',
                        triggerCondition: { type: routine.triggerType || 'MANUAL' },
                        actions: routine.actions || [],
                        homeId: home.id,
                    },
                });
            }
            routinesSeeded++;
        }

        logger.info(
            { devicesSeeded, roomsSeeded, routinesSeeded, userId: payload.userId },
            '✅ Database successfully seeded from mobile payload',
        );

        return {
            success: true,
            seededAt: new Date().toISOString(),
            userId: payload.userId,
            message: 'Backend database seeded successfully with mobile IoT fleet & routines',
            summary: {
                devicesSeeded,
                roomsSeeded,
                routinesSeeded,
                preferencesUpdated: payload.userPreferences !== null,
            },
        };
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
