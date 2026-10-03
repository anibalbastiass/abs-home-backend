import { z } from 'zod';

export const BackendDeviceSeedSchema = z.object({
    externalId: z.string(),
    vendor: z.string(),
    type: z.string(),
    name: z.string(),
    roomName: z.string().nullable().optional(),
    capabilities: z.array(z.string()).default([]),
    state: z.record(z.any()).default({}),
    isOnline: z.boolean().default(true),
});

export const BackendRoomSeedSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    icon: z.string().default('sofa'),
});

export const BackendRoutineActionSeedSchema = z.object({
    targetVendor: z.string(),
    actionType: z.string(),
    parameters: z.record(z.any()).default({}),
});

export const BackendRoutineSeedSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    isEnabled: z.boolean().default(true),
    triggerType: z.string().default('MANUAL'),
    executionCount: z.number().default(0),
    actions: z.array(BackendRoutineActionSeedSchema).default([]),
});

export const BackendUserPreferencesSeedSchema = z
    .object({
        darkTheme: z.string().default('SYSTEM'),
        language: z.string().default('SYSTEM'),
        experienceMode: z.string().default('STANDARD'),
        biometricLockEnabled: z.boolean().default(false),
    })
    .nullable()
    .optional();

export const BackendSeedPayloadSchema = z.object({
    userId: z.string(),
    exportedAt: z.string().optional(),
    clientPlatform: z.string().optional(),
    clientVersion: z.string().optional(),
    environment: z.string().optional(),
    devices: z.array(BackendDeviceSeedSchema).default([]),
    rooms: z.array(BackendRoomSeedSchema).default([]),
    routines: z.array(BackendRoutineSeedSchema).default([]),
    userPreferences: BackendUserPreferencesSeedSchema,
});

export type BackendSeedPayload = z.infer<typeof BackendSeedPayloadSchema>;
export type BackendDeviceSeed = z.infer<typeof BackendDeviceSeedSchema>;
export type BackendRoomSeed = z.infer<typeof BackendRoomSeedSchema>;
export type BackendRoutineSeed = z.infer<typeof BackendRoutineSeedSchema>;

export interface BackendSeedResult {
    success: boolean;
    seededAt: string;
    userId: string;
    message: string;
    summary: {
        devicesSeeded: number;
        roomsSeeded: number;
        routinesSeeded: number;
        preferencesUpdated: boolean;
    };
}
