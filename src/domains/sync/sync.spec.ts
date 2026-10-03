import { createSign, generateKeyPairSync } from 'node:crypto';
import { Context } from 'koa';
import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/core/errors/app-error';
import { generateOpenApiDocument } from '@/core/openapi/registry';
import { SyncController } from './controller';
import { SeedUserDataRequestSchema } from './schemas';
import { SyncServiceImpl } from './service';
import { FirebaseTokenVerifier } from './token-verifier';

const payload = SeedUserDataRequestSchema.parse({
    userId: 'firebase-user-1',
    exportedAt: '2026-10-03T12:00:00Z',
    devices: [
        {
            externalId: 'light-1',
            vendor: 'HUE',
            type: 'LIGHT',
            name: 'Kitchen light',
            roomName: 'Kitchen',
            state: { isOn: true },
        },
    ],
    rooms: [{ id: 'kitchen', name: 'Kitchen' }],
    routines: [{ id: 'night', name: 'Night', actions: [{ targetVendor: 'HUE', actionType: 'TURN_OFF_ALL' }] }],
    userPreferences: { darkTheme: 'DARK' },
});

describe('mobile sync contract', () => {
    it('registers the seed and user snapshot endpoints in OpenAPI', () => {
        const paths = generateOpenApiDocument().paths!;
        expect(paths['/sync/seed']?.post).toBeDefined();
        expect(paths['/sync/users/{userId}']?.get).toBeDefined();
    });

    it('rejects requests without a token or for another user before reading or writing data', async () => {
        const service = { seedUserData: vi.fn(), getUserSnapshot: vi.fn() };
        const controller = new SyncController(service, {
            verify: vi.fn().mockResolvedValue({ uid: 'firebase-user-1', googleUserIds: [] }),
        });
        const context = {
            get: vi.fn().mockReturnValue(''),
            request: { body: payload },
            params: { userId: 'firebase-user-2' },
        } as unknown as Context;

        await expect(controller.seed(context)).rejects.toBeInstanceOf(UnauthorizedError);
        context.get = vi.fn().mockReturnValue('Bearer valid-token');
        await expect(controller.getUserSnapshot(context)).rejects.toBeInstanceOf(ForbiddenError);
        context.request.body = { ...payload, userId: 'firebase-user-2' };
        await expect(controller.seed(context)).rejects.toBeInstanceOf(ForbiddenError);
        expect(service.seedUserData).not.toHaveBeenCalled();
        expect(service.getUserSnapshot).not.toHaveBeenCalled();
    });

    it('rejects invalid tokens from verifier', async () => {
        const service = { seedUserData: vi.fn(), getUserSnapshot: vi.fn() };
        const verifier = { verify: vi.fn().mockRejectedValue(new UnauthorizedError('Invalid token')) };
        const controller = new SyncController(service, verifier);
        const context = {
            get: vi.fn().mockReturnValue('Bearer invalid-firebase-token'),
            request: { body: payload },
            params: { userId: payload.userId },
        } as unknown as Context;

        await expect(controller.seed(context)).rejects.toBeInstanceOf(UnauthorizedError);
        await expect(controller.getUserSnapshot(context)).rejects.toBeInstanceOf(UnauthorizedError);
        expect(verifier.verify).toHaveBeenCalledWith('invalid-firebase-token');
        expect(service.seedUserData).not.toHaveBeenCalled();
        expect(service.getUserSnapshot).not.toHaveBeenCalled();
    });

    it('accepts dev- prefixed tokens for local development', async () => {
        const result = {
            success: true as const,
            seededAt: '2026-10-03T12:01:00.000Z',
            userId: payload.userId,
            summary: { devicesSeeded: 1, roomsSeeded: 1, routinesSeeded: 1, preferencesUpdated: true },
            message: 'Seeded',
        };
        const service = { seedUserData: vi.fn().mockResolvedValue(result), getUserSnapshot: vi.fn().mockResolvedValue(payload) };
        const verifier = { verify: vi.fn() };
        const controller = new SyncController(service, verifier);
        const context = {
            get: vi.fn().mockReturnValue(`Bearer dev-${payload.userId}`),
            request: { body: payload },
            params: { userId: payload.userId },
        } as unknown as Context;

        await controller.seed(context);
        expect(context.status).toBe(200);
        expect(context.body).toEqual(result);
        expect(verifier.verify).not.toHaveBeenCalled();
    });

    it('validates and routes a matching user export', async () => {
        const result = {
            success: true as const,
            seededAt: '2026-10-03T12:01:00.000Z',
            userId: payload.userId,
            summary: { devicesSeeded: 1, roomsSeeded: 1, routinesSeeded: 1, preferencesUpdated: true },
            message: 'Seeded',
        };
        const service = { seedUserData: vi.fn().mockResolvedValue(result), getUserSnapshot: vi.fn().mockResolvedValue(payload) };
        const controller = new SyncController(service, {
            verify: vi.fn().mockResolvedValue({ uid: payload.userId, googleUserIds: [] }),
        });
        const context = {
            get: vi.fn().mockReturnValue('Bearer valid-token'),
            request: { body: payload },
            params: { userId: payload.userId },
        } as unknown as Context;

        await controller.seed(context);
        expect(context.status).toBe(200);
        expect(context.body).toEqual(result);
        expect(service.seedUserData).toHaveBeenCalledWith(payload);
        await controller.getUserSnapshot(context);
        expect(service.getUserSnapshot).toHaveBeenCalledWith(payload.userId);
    });

    it('allows a verified Google identity to read an older export keyed by Google subject', async () => {
        const service = { seedUserData: vi.fn(), getUserSnapshot: vi.fn().mockResolvedValue(payload) };
        const controller = new SyncController(service, {
            verify: vi.fn().mockResolvedValue({ uid: 'firebase-uid', googleUserIds: [payload.userId] }),
        });
        const context = {
            get: vi.fn().mockReturnValue('Bearer valid-token'),
            request: { body: payload },
            params: { userId: payload.userId },
        } as unknown as Context;

        await controller.getUserSnapshot(context);
        expect(service.getUserSnapshot).toHaveBeenCalledWith(payload.userId);
        await controller.seed(context);
        expect(service.seedUserData).toHaveBeenCalledWith(payload);
        context.params.userId = 'another-google-user';
        await expect(controller.getUserSnapshot(context)).rejects.toBeInstanceOf(ForbiddenError);
    });
});

describe('sync persistence', () => {
    it('replaces a user export atomically and deduplicates repeated device IDs', async () => {
        const transaction = {
            syncedUser: { upsert: vi.fn() },
            syncedDevice: { deleteMany: vi.fn(), createMany: vi.fn() },
            syncedRoom: { deleteMany: vi.fn(), createMany: vi.fn() },
            syncedRoutine: { deleteMany: vi.fn(), createMany: vi.fn() },
            user: {
                findFirst: vi.fn().mockResolvedValue({ id: 'user-1', name: 'User test', email: 'user@abshome.dev' }),
                create: vi.fn().mockResolvedValue({ id: 'user-1', name: 'User test', email: 'user@abshome.dev' }),
            },
            home: {
                findFirst: vi.fn().mockResolvedValue({ id: 'home-1', name: 'Home' }),
                create: vi.fn().mockResolvedValue({ id: 'home-1', name: 'Home' }),
            },
            room: {
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue({ id: 'room-1', name: 'Kitchen' }),
                update: vi.fn().mockResolvedValue({ id: 'room-1', name: 'Kitchen' }),
            },
            device: {
                upsert: vi.fn().mockResolvedValue({ id: 'device-1' }),
            },
            automationRule: {
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue({ id: 'auto-1' }),
                update: vi.fn().mockResolvedValue({ id: 'auto-1' }),
            },
        };
        const prisma = {
            $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<void>) => callback(transaction)),
        } as unknown as PrismaClient;
        const service = new SyncServiceImpl(prisma);
        const result = await service.seedUserData({ ...payload, devices: [...payload.devices, payload.devices[0]] });

        expect(result.summary).toEqual({
            devicesSeeded: 1,
            roomsSeeded: 1,
            routinesSeeded: 1,
            preferencesUpdated: true,
        });
        expect(transaction.syncedUser.upsert).toHaveBeenCalledOnce();
        expect(transaction.syncedDevice.deleteMany).toHaveBeenCalledWith({ where: { userId: payload.userId } });
        expect(transaction.syncedDevice.createMany).toHaveBeenCalledWith({
            data: [expect.objectContaining({ userId: payload.userId, externalId: 'light-1' })],
        });
    });

    it('syncs all vendor and device types into domain entities with room and routine upserting', async () => {
        const transaction = {
            syncedUser: { upsert: vi.fn() },
            syncedDevice: { deleteMany: vi.fn(), createMany: vi.fn() },
            syncedRoom: { deleteMany: vi.fn(), createMany: vi.fn() },
            syncedRoutine: { deleteMany: vi.fn(), createMany: vi.fn() },
            user: {
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue({ id: 'user-new', name: 'User new', email: 'user@example.com' }),
            },
            home: {
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue({ id: 'home-new', name: 'New Home' }),
            },
            room: {
                findFirst: vi.fn().mockResolvedValue({ id: 'room-existing', name: 'Kitchen', icon: 'sofa' }),
                create: vi.fn().mockResolvedValue({ id: 'room-new', name: 'Kitchen' }),
                update: vi.fn().mockResolvedValue({ id: 'room-existing', name: 'Kitchen' }),
            },
            device: {
                upsert: vi.fn().mockResolvedValue({ id: 'device-1' }),
            },
            automationRule: {
                findFirst: vi.fn().mockResolvedValue({ id: 'auto-existing', name: 'Night' }),
                create: vi.fn().mockResolvedValue({ id: 'auto-new' }),
                update: vi.fn().mockResolvedValue({ id: 'auto-existing' }),
            },
        };

        const prisma = {
            $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<void>) => callback(transaction)),
        } as unknown as PrismaClient;
        const service = new SyncServiceImpl(prisma);

        const vendors = ['HUE', 'PHILIPS_HUE', 'NEST', 'GOOGLE_NEST', 'SWITCHBOT', 'RING', 'BLINK', 'ENERGY_METER', 'SHELLY', 'UNKNOWN'];
        const types = ['LIGHT', 'THERMOSTAT', 'CURTAIN', 'BOT', 'CAMERA', 'DOORBELL', 'PLUG', 'SENSOR', 'ENERGY_METER', 'UNKNOWN'];

        const devices = vendors.map((v, i) => ({
            externalId: `dev-${i}`,
            vendor: v,
            type: types[i % types.length],
            name: `Device ${i}`,
            roomName: 'Kitchen',
            state: { on: true },
            capabilities: ['on_off'],
            isOnline: true,
        }));

        const result = await service.seedUserData({
            userId: 'user@example.com',
            exportedAt: '2026-10-03T12:00:00Z',
            clientPlatform: 'ComposeMultiplatform',
            clientVersion: '1.43.0',
            environment: 'local',
            devices,
            rooms: [{ id: 'kitchen', name: 'Kitchen', icon: 'kitchen' }],
            routines: [{
                id: 'night',
                name: 'Night',
                isEnabled: true,
                triggerType: 'MANUAL',
                executionCount: 0,
                actions: [{ targetVendor: 'HUE', actionType: 'TURN_OFF_ALL', parameters: {} }],
            }],
            userPreferences: null,
        });

        expect(result.success).toBe(true);
        expect(transaction.user.create).toHaveBeenCalled();
        expect(transaction.home.create).toHaveBeenCalled();
        expect(transaction.device.upsert).toHaveBeenCalledTimes(vendors.length);
        expect(transaction.automationRule.update).toHaveBeenCalled();
    });

    it('returns a typed snapshot and rejects unknown users', async () => {
        const prisma = {
            syncedUser: {
                findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
                    id: payload.userId,
                    exportedAt: new Date(payload.exportedAt),
                    seededAt: new Date(payload.exportedAt),
                    clientPlatform: payload.clientPlatform,
                    clientVersion: payload.clientVersion,
                    environment: payload.environment,
                    preferences: payload.userPreferences,
                    devices: [{ ...payload.devices[0], roomName: 'Kitchen' }],
                    rooms: [{ sourceId: 'kitchen', name: 'Kitchen', icon: 'sofa' }],
                    routines: [{ sourceId: 'night', ...payload.routines[0] }],
                }),
            },
        } as unknown as PrismaClient;
        const service = new SyncServiceImpl(prisma);
        await expect(service.getUserSnapshot('missing')).rejects.toBeInstanceOf(NotFoundError);
        const snapshot = await service.getUserSnapshot(payload.userId);
        expect(snapshot.devices[0].name).toBe('Kitchen light');
        expect(snapshot.rooms[0].id).toBe('kitchen');
        expect(snapshot.routines[0].id).toBe('night');
    });
});

describe('Firebase token verification', () => {
    const projectId = 'abs-smart-home-manager';
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const makeToken = (claims: Record<string, unknown>) => {
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url');
        const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
        const signer = createSign('RSA-SHA256');
        signer.update(`${header}.${body}`);
        signer.end();
        return `${header}.${body}.${signer.sign(privateKey).toString('base64url')}`;
    };
    const claims = () => ({
        aud: projectId,
        iss: `https://securetoken.google.com/${projectId}`,
        sub: payload.userId,
        iat: Math.floor(Date.now() / 1000) - 60,
        auth_time: Math.floor(Date.now() / 1000) - 120,
        exp: Math.floor(Date.now() / 1000) + 3600,
    });

    it('verifies signature and claims and caches Google public keys', async () => {
        const fetchCertificates = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ 'test-key': publicPem }), {
                headers: { 'cache-control': 'public, max-age=3600' },
            }),
        );
        const verifier = new FirebaseTokenVerifier(projectId, fetchCertificates);
        const linkedClaims = {
            ...claims(),
            firebase: { identities: { 'google.com': ['google-subject-1'] } },
        };
        expect(await verifier.verify(makeToken(linkedClaims))).toEqual({
            uid: payload.userId,
            googleUserIds: ['google-subject-1'],
        });
        expect(await verifier.verify(makeToken(linkedClaims))).toEqual({
            uid: payload.userId,
            googleUserIds: ['google-subject-1'],
        });
        expect(fetchCertificates).toHaveBeenCalledOnce();
        await expect(verifier.verify(makeToken({ ...claims(), aud: 'other-project' }))).rejects.toBeInstanceOf(
            UnauthorizedError,
        );
        await expect(verifier.verify(makeToken({ ...claims(), exp: 1 }))).rejects.toBeInstanceOf(UnauthorizedError);
    });
});
