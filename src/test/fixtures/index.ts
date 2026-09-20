import { DeviceVendor, DeviceType, ArmStatus, IncidentSeverity } from '@prisma/client';
import { IoTCommandPayload } from '@/core/queues/queue-manager';
import { HealthStatus } from '@/domains/health/schemas';

export const FIXTURE_IDS = {
    USER_ID: '00000000-0000-0000-0000-000000000001',
    HOME_ID: '00000000-0000-0000-0000-000000000002',
    ROOM_LIVING: '00000000-0000-0000-0000-000000000010',
    ROOM_BEDROOM: '00000000-0000-0000-0000-000000000011',
    DEVICE_HUE: '00000000-0000-0000-0000-000000000020',
    DEVICE_NEST: '00000000-0000-0000-0000-000000000021',
    DEVICE_SWITCHBOT: '00000000-0000-0000-0000-000000000022',
    DEVICE_RING: '00000000-0000-0000-0000-000000000023',
    DEVICE_BLINK: '00000000-0000-0000-0000-000000000024',
    DEVICE_ENERGY: '00000000-0000-0000-0000-000000000025',
    SCENE_ID: '00000000-0000-0000-0000-000000000030',
    AUTOMATION_ID: '00000000-0000-0000-0000-000000000040',
    ZONE_ID: '00000000-0000-0000-0000-000000000050',
    INCIDENT_ID: '00000000-0000-0000-0000-000000000060',
    ENERGY_METRIC_ID: '00000000-0000-0000-0000-000000000070',
};

export const createDeviceFixture = (overrides: Record<string, unknown> = {}) => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    return {
        id: FIXTURE_IDS.DEVICE_HUE,
        externalId: 'hue_living_main',
        vendor: DeviceVendor.HUE,
        type: DeviceType.LIGHT,
        name: 'Living Room Ceiling Light',
        roomId: FIXTURE_IDS.ROOM_LIVING,
        homeId: FIXTURE_IDS.HOME_ID,
        state: { on: true, brightness: 85, colorTemp: 3000 },
        capabilities: ['on_off', 'brightness', 'color_temp'],
        isOnline: true,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
};

export const createSceneFixture = (overrides: Record<string, unknown> = {}) => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    return {
        id: FIXTURE_IDS.SCENE_ID,
        name: 'Good Night',
        icon: 'bedtime',
        homeId: FIXTURE_IDS.HOME_ID,
        actions: [
            {
                id: '00000000-0000-0000-0000-000000000101',
                deviceId: FIXTURE_IDS.DEVICE_HUE,
                action: 'turn_off',
                payload: { on: false },
                order: 1,
            },
        ],
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
};

export const createAutomationFixture = (overrides: Record<string, unknown> = {}) => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    return {
        id: FIXTURE_IDS.AUTOMATION_ID,
        name: 'Night Motion Lighting',
        description: 'Turns on dim light when motion is detected at night',
        isEnabled: true,
        triggerType: 'DEVICE_EVENT',
        triggerCondition: { event: 'MOTION_DETECTED', zone: 'Hallway' },
        actions: [
            {
                deviceId: FIXTURE_IDS.DEVICE_HUE,
                action: 'turn_on',
                payload: { on: true, brightness: 20 },
            },
        ],
        homeId: FIXTURE_IDS.HOME_ID,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
};

export const createEnergyMetricFixture = (overrides: Record<string, unknown> = {}) => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    return {
        id: FIXTURE_IDS.ENERGY_METRIC_ID,
        meterId: 'shelly_3em_panel',
        timestamp: now,
        phaseAVoltage: 221.4,
        phaseACurrent: 8.5,
        phaseAPower: 1880,
        phaseAPowerFactor: 0.96,
        phaseBVoltage: 220.8,
        phaseBCurrent: 6.2,
        phaseBPower: 1360,
        phaseBPowerFactor: 0.95,
        phaseCVoltage: 222.1,
        phaseCCurrent: 9.8,
        phaseCPower: 2170,
        phaseCPowerFactor: 0.97,
        totalActivePower: 5410,
        dailyEnergyKwh: 14.8,
        ...overrides,
    };
};

export const createSecurityZoneFixture = (overrides: Record<string, unknown> = {}) => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    return {
        id: FIXTURE_IDS.ZONE_ID,
        name: 'Perimeter & Entrance',
        armStatus: ArmStatus.ARMED_HOME,
        homeId: FIXTURE_IDS.HOME_ID,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
};

export const createSecurityIncidentFixture = (overrides: Record<string, unknown> = {}) => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    return {
        id: FIXTURE_IDS.INCIDENT_ID,
        severity: IncidentSeverity.HIGH,
        alertType: 'MOTION_DETECTED',
        sourceDevice: 'Front Doorbell Camera',
        details: { zone: 'Entrance', confidence: 0.95 },
        resolvedAt: null,
        createdAt: now,
        ...overrides,
    };
};

export const createHealthStatusFixture = (overrides: Partial<HealthStatus> = {}): HealthStatus => {
    return {
        status: 'UP',
        timestamp: new Date('2026-09-20T12:00:00.000Z').toISOString(),
        uptime: 3600,
        version: '1.0.0',
        environment: 'test',
        components: {
            database: { status: 'UP', details: 'PostgreSQL connection active' },
            redis: { status: 'UP', details: 'Redis cache & queues active' },
        },
        ...overrides,
    };
};

export const createIoTCommandPayloadFixture = (
    overrides: Partial<IoTCommandPayload> = {},
): IoTCommandPayload => {
    return {
        commandId: 'cmd_fixture_123',
        vendor: 'hue',
        deviceId: 'hue_living_main',
        action: 'turn_on',
        params: { on: true, brightness: 100 },
        timestamp: Date.now(),
        ...overrides,
    };
};
