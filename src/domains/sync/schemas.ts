import { z } from 'zod';
import { openApiRegistry } from '@/core/openapi/registry';

export const UserIdSchema = z.string().min(1).max(128);

export const SyncedDeviceSchema = z.object({
    externalId: z.string().min(1).max(200),
    vendor: z.string().min(1).max(40),
    type: z.string().min(1).max(40),
    name: z.string().min(1).max(200),
    roomName: z.string().max(200).nullable().optional(),
    capabilities: z.array(z.string()).default([]),
    state: z.record(z.any()).default({}),
    isOnline: z.boolean().default(true),
});

export const SyncedRoomSchema = z.object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(200),
    icon: z.string().default('sofa'),
});

export const SyncedRoutineActionSchema = z.object({
    targetVendor: z.string().min(1),
    actionType: z.string().min(1),
    parameters: z.record(z.any()).default({}),
});

export const SyncedRoutineSchema = z.object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(200),
    isEnabled: z.boolean().default(true),
    triggerType: z.string().default('MANUAL'),
    executionCount: z.number().int().nonnegative().default(0),
    actions: z.array(SyncedRoutineActionSchema).default([]),
});

export const SyncedPreferencesSchema = z.object({
    darkTheme: z.string().default('SYSTEM'),
    language: z.string().default('SYSTEM'),
    experienceMode: z.string().default('STANDARD'),
    biometricLockEnabled: z.boolean().default(false),
});

export const SeedUserDataRequestSchema = z.object({
    userId: UserIdSchema,
    exportedAt: z.string().datetime(),
    clientPlatform: z.string().default('ComposeMultiplatform'),
    clientVersion: z.string().default('unknown'),
    environment: z.string().default('local'),
    devices: z.array(SyncedDeviceSchema).max(500).default([]),
    rooms: z.array(SyncedRoomSchema).max(100).default([]),
    routines: z.array(SyncedRoutineSchema).max(100).default([]),
    userPreferences: SyncedPreferencesSchema.nullable().optional(),
});

export const SeedUserDataResultSchema = z.object({
    success: z.literal(true),
    seededAt: z.string(),
    userId: UserIdSchema,
    summary: z.object({
        devicesSeeded: z.number().int(),
        roomsSeeded: z.number().int(),
        routinesSeeded: z.number().int(),
        preferencesUpdated: z.boolean(),
    }),
    message: z.string(),
});

export const SyncedUserSnapshotSchema = z.object({
    userId: UserIdSchema,
    exportedAt: z.string(),
    seededAt: z.string(),
    clientPlatform: z.string(),
    clientVersion: z.string(),
    environment: z.string(),
    devices: z.array(SyncedDeviceSchema),
    rooms: z.array(SyncedRoomSchema),
    routines: z.array(SyncedRoutineSchema),
    userPreferences: SyncedPreferencesSchema.nullable(),
});

export type SeedUserDataRequest = z.infer<typeof SeedUserDataRequestSchema>;
export type SeedUserDataResult = z.infer<typeof SeedUserDataResultSchema>;
export type SyncedUserSnapshot = z.infer<typeof SyncedUserSnapshotSchema>;

openApiRegistry.register('SeedUserDataRequest', SeedUserDataRequestSchema);
openApiRegistry.register('SeedUserDataResult', SeedUserDataResultSchema);
openApiRegistry.register('SyncedUserSnapshot', SyncedUserSnapshotSchema);

openApiRegistry.registerPath({
    method: 'post',
    path: '/sync/seed',
    tags: ['Sync'],
    summary: 'Seed user data exported by the mobile app',
    request: {
        body: {
            content: { 'application/json': { schema: SeedUserDataRequestSchema } },
        },
    },
    responses: {
        200: {
            description: 'User data seeded successfully',
            content: { 'application/json': { schema: SeedUserDataResultSchema } },
        },
        422: { description: 'Invalid mobile export' },
        401: { description: 'Missing or invalid Firebase ID token' },
        403: { description: 'Token user does not match the export user' },
    },
});

openApiRegistry.registerPath({
    method: 'get',
    path: '/sync/users/{userId}',
    tags: ['Sync'],
    summary: 'Inspect a user data export',
    request: { params: z.object({ userId: UserIdSchema }) },
    responses: {
        200: {
            description: 'User export found',
            content: { 'application/json': { schema: SyncedUserSnapshotSchema } },
        },
        404: { description: 'No export found for this user' },
        401: { description: 'Missing or invalid Firebase ID token' },
        403: { description: 'Token user does not match the requested user' },
    },
});
