import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/core/errors/app-error';
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
        });

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
            message: 'Mobile user data seeded successfully.',
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
}
