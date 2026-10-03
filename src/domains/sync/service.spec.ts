import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncServiceImpl } from './service';
import { DeviceVendor, DeviceType } from '@prisma/client';

describe('SyncServiceImpl', () => {
    let mockPrisma: any;
    let service: SyncServiceImpl;

    beforeEach(() => {
        mockPrisma = {
            user: {
                upsert: vi.fn(),
            },
            home: {
                findFirst: vi.fn(),
                create: vi.fn(),
            },
            room: {
                upsert: vi.fn(),
            },
            device: {
                upsert: vi.fn(),
            },
            automationRule: {
                upsert: vi.fn(),
                create: vi.fn(),
            },
        };
        service = new SyncServiceImpl(mockPrisma);
    });

    it('should seed database with user, rooms, devices, and automations', async () => {
        mockPrisma.user.upsert.mockResolvedValueOnce({ id: 'user-uuid', email: 'test@abshome.dev', name: 'User test' });
        mockPrisma.home.findFirst.mockResolvedValueOnce({ id: 'home-uuid', name: 'Home' });
        mockPrisma.room.upsert.mockResolvedValueOnce({ id: 'room-uuid', name: 'Living Room' });
        mockPrisma.device.upsert.mockResolvedValueOnce({ id: 'dev-uuid' });
        mockPrisma.automationRule.upsert.mockResolvedValueOnce({ id: 'auto-uuid' });

        const result = await service.seedDatabase({
            userId: 'test',
            exportedAt: '2026-10-03T20:00:00Z',
            clientPlatform: 'ComposeMultiplatform',
            clientVersion: '1.43.0',
            environment: 'local',
            devices: [
                {
                    externalId: 'hue_1',
                    vendor: 'HUE',
                    type: 'LIGHT',
                    name: 'Living Lamp',
                    roomName: 'Living Room',
                    capabilities: ['on_off'],
                    state: { on: true },
                    isOnline: true,
                },
            ],
            rooms: [
                {
                    id: 'room-uuid',
                    name: 'Living Room',
                    icon: 'sofa',
                },
            ],
            routines: [
                {
                    id: 'routine-uuid',
                    name: 'Evening Chill',
                    isEnabled: true,
                    triggerType: 'MANUAL',
                    executionCount: 1,
                    actions: [
                        {
                            targetVendor: 'HUE',
                            actionType: 'TOGGLE',
                            parameters: {},
                        },
                    ],
                },
            ],
            userPreferences: {
                darkTheme: 'DARK',
                language: 'EN',
                experienceMode: 'STANDARD',
                biometricLockEnabled: true,
            },
        });

        expect(result.success).toBe(true);
        expect(result.summary.devicesSeeded).toBe(1);
        expect(result.summary.roomsSeeded).toBe(1);
        expect(result.summary.routinesSeeded).toBe(1);
        expect(result.summary.preferencesUpdated).toBe(true);
    });

    it('should create home if user has no home and handle email userId and routine without id', async () => {
        mockPrisma.user.upsert.mockResolvedValueOnce({ id: 'user-uuid', email: 'user@example.com', name: 'User user@example.com' });
        mockPrisma.home.findFirst.mockResolvedValueOnce(null);
        mockPrisma.home.create.mockResolvedValueOnce({ id: 'new-home-uuid', name: "User user@example.com's Residence" });
        mockPrisma.room.upsert.mockResolvedValueOnce({ id: 'room-1', name: 'Kitchen' });
        mockPrisma.device.upsert.mockResolvedValueOnce({ id: 'dev-1' });
        mockPrisma.automationRule.create.mockResolvedValueOnce({ id: 'auto-new' });

        const result = await service.seedDatabase({
            userId: 'user@example.com',
            devices: [
                {
                    externalId: 'nest_1',
                    vendor: 'GOOGLE_NEST',
                    type: 'THERMOSTAT',
                    name: 'Thermostat',
                    roomName: null,
                    capabilities: [],
                    state: {},
                    isOnline: false,
                },
            ],
            rooms: [
                {
                    name: 'Kitchen',
                    icon: 'kitchen',
                },
            ],
            routines: [
                {
                    name: 'Morning Routine',
                    isEnabled: false,
                    triggerType: 'SCHEDULE',
                    executionCount: 0,
                    actions: [],
                },
            ],
            userPreferences: null,
        });

        expect(mockPrisma.home.create).toHaveBeenCalled();
        expect(mockPrisma.automationRule.create).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.summary.preferencesUpdated).toBe(false);
    });

    it('should correctly map all vendor types', async () => {
        mockPrisma.user.upsert.mockResolvedValueOnce({ id: 'u1', email: 'u1@abshome.dev' });
        mockPrisma.home.findFirst.mockResolvedValueOnce({ id: 'h1' });
        mockPrisma.device.upsert.mockResolvedValue({ id: 'd1' });

        const vendors = [
            'HUE',
            'PHILIPS_HUE',
            'NEST',
            'GOOGLE_NEST',
            'SWITCHBOT',
            'RING',
            'BLINK',
            'ENERGY_METER',
            'SHELLY',
            'UNKNOWN_VENDOR',
        ];

        await service.seedDatabase({
            userId: 'vendor_test',
            devices: vendors.map((v, i) => ({
                externalId: `ext_${i}`,
                vendor: v,
                type: 'LIGHT',
                name: `Device ${i}`,
                capabilities: [],
                state: {},
                isOnline: true,
            })),
            rooms: [],
            routines: [],
        });

        expect(mockPrisma.device.upsert).toHaveBeenCalledTimes(vendors.length);
    });

    it('should correctly map all device types', async () => {
        mockPrisma.user.upsert.mockResolvedValueOnce({ id: 'u1', email: 'u1@abshome.dev' });
        mockPrisma.home.findFirst.mockResolvedValueOnce({ id: 'h1' });
        mockPrisma.device.upsert.mockResolvedValue({ id: 'd1' });

        const types = [
            'LIGHT',
            'THERMOSTAT',
            'CURTAIN',
            'BOT',
            'CAMERA',
            'DOORBELL',
            'PLUG',
            'SENSOR',
            'ENERGY_METER',
            'UNKNOWN_TYPE',
        ];

        await service.seedDatabase({
            userId: 'type_test',
            devices: types.map((t, i) => ({
                externalId: `ext_${i}`,
                vendor: 'HUE',
                type: t,
                name: `Device ${i}`,
                capabilities: [],
                state: {},
                isOnline: true,
            })),
            rooms: [],
            routines: [],
        });

        expect(mockPrisma.device.upsert).toHaveBeenCalledTimes(types.length);
    });
});
