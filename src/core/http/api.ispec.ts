import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { createContainer } from '../di/container';
import {
    createDeviceFixture,
    createSceneFixture,
    createAutomationFixture,
    createEnergyMetricFixture,
    createSecurityZoneFixture,
    createSecurityIncidentFixture,
    createHealthStatusFixture,
    FIXTURE_IDS,
} from '@/test/fixtures';

describe('ABS Smart Home Backend — Integration Tests (Fixtures)', () => {
    const healthFixture = createHealthStatusFixture();
    const deviceFixture = createDeviceFixture();
    const sceneFixture = createSceneFixture();
    const automationFixture = createAutomationFixture();
    const energyFixture = createEnergyMetricFixture();
    const zoneFixture = createSecurityZoneFixture();
    const incidentFixture = createSecurityIncidentFixture();

    const mockHealthService: any = {
        getLiveness: vi.fn().mockReturnValue({ status: 'UP', timestamp: healthFixture.timestamp }),
        getReadiness: vi.fn().mockResolvedValue({
            isReady: true,
            health: healthFixture,
        }),
    };

    const mockDeviceService: any = {
        listDevices: vi.fn().mockResolvedValue([
            {
                ...deviceFixture,
                lastSeenAt: deviceFixture.lastSeenAt.toISOString(),
                createdAt: deviceFixture.createdAt.toISOString(),
                updatedAt: deviceFixture.updatedAt.toISOString(),
            },
        ]),
        getDeviceById: vi.fn().mockResolvedValue({
            ...deviceFixture,
            lastSeenAt: deviceFixture.lastSeenAt.toISOString(),
            createdAt: deviceFixture.createdAt.toISOString(),
            updatedAt: deviceFixture.updatedAt.toISOString(),
        }),
        updateDevice: vi.fn().mockResolvedValue({
            ...deviceFixture,
            name: 'Renamed Light',
            lastSeenAt: deviceFixture.lastSeenAt.toISOString(),
            createdAt: deviceFixture.createdAt.toISOString(),
            updatedAt: deviceFixture.updatedAt.toISOString(),
        }),
        executeCommand: vi.fn().mockResolvedValue({
            success: true,
            jobId: 'cmd_1',
            status: 'EXECUTED',
            message: 'Command executed',
            updatedState: { on: false },
        }),
    };

    const mockSceneService: any = {
        listScenes: vi.fn().mockResolvedValue([
            {
                ...sceneFixture,
                createdAt: sceneFixture.createdAt.toISOString(),
                updatedAt: sceneFixture.updatedAt.toISOString(),
            },
        ]),
        getSceneById: vi.fn().mockResolvedValue({
            ...sceneFixture,
            createdAt: sceneFixture.createdAt.toISOString(),
            updatedAt: sceneFixture.updatedAt.toISOString(),
        }),
        createScene: vi.fn().mockResolvedValue({
            ...sceneFixture,
            name: 'Movie Time',
            createdAt: sceneFixture.createdAt.toISOString(),
            updatedAt: sceneFixture.updatedAt.toISOString(),
        }),
        triggerScene: vi.fn().mockResolvedValue({
            success: true,
            sceneId: sceneFixture.id,
            executedActionsCount: 2,
            message: 'Scene executed',
        }),
    };

    const mockAutomationService: any = {
        listAutomations: vi.fn().mockResolvedValue([]),
        getAutomationById: vi.fn().mockResolvedValue({
            ...automationFixture,
            createdAt: automationFixture.createdAt.toISOString(),
            updatedAt: automationFixture.updatedAt.toISOString(),
        }),
        createAutomation: vi.fn().mockResolvedValue({
            ...automationFixture,
            createdAt: automationFixture.createdAt.toISOString(),
            updatedAt: automationFixture.updatedAt.toISOString(),
        }),
        executeAutomation: vi.fn().mockResolvedValue({
            success: true,
            automationId: automationFixture.id,
            executedActionsCount: 1,
            durationMs: 45,
            status: 'SUCCESS',
        }),
    };

    const mockEnergyService: any = {
        getSummary: vi.fn().mockResolvedValue({
            meterId: energyFixture.meterId,
            currentPowerWatts: energyFixture.totalActivePower,
            dailyEnergyKwh: energyFixture.dailyEnergyKwh,
            phaseBalancePercentage: 98,
            phases: {
                phaseA: { voltage: 220, current: 5.3, activePower: 1166, powerFactor: 0.98 },
                phaseB: { voltage: 221, current: 5.2, activePower: 1150, powerFactor: 0.98 },
                phaseC: { voltage: 219, current: 5.4, activePower: 1184, powerFactor: 0.98 },
            },
            latestSampleAt: energyFixture.timestamp.toISOString(),
        }),
        ingestSample: vi.fn().mockResolvedValue({
            ...energyFixture,
            timestamp: energyFixture.timestamp.toISOString(),
            phaseA: { voltage: 220, current: 5, activePower: 1100, powerFactor: 1.0 },
            phaseB: { voltage: 220, current: 5, activePower: 1100, powerFactor: 1.0 },
            phaseC: { voltage: 220, current: 5, activePower: 1100, powerFactor: 1.0 },
        }),
    };

    const mockSecurityService: any = {
        getStatus: vi.fn().mockResolvedValue({
            overallStatus: 'ARMED_HOME',
            zones: [
                {
                    ...zoneFixture,
                    createdAt: zoneFixture.createdAt.toISOString(),
                    updatedAt: zoneFixture.updatedAt.toISOString(),
                },
            ],
            activeIncidentsCount: 0,
            recentIncidents: [],
        }),
        setArmStatus: vi.fn().mockResolvedValue({
            overallStatus: 'ARMED_AWAY',
            zones: [
                {
                    ...zoneFixture,
                    armStatus: 'ARMED_AWAY',
                    createdAt: zoneFixture.createdAt.toISOString(),
                    updatedAt: zoneFixture.updatedAt.toISOString(),
                },
            ],
            activeIncidentsCount: 0,
            recentIncidents: [],
        }),
        raiseIncident: vi.fn().mockResolvedValue({
            ...incidentFixture,
            createdAt: incidentFixture.createdAt.toISOString(),
        }),
    };

    const container = createContainer({
        healthService: mockHealthService,
        deviceService: mockDeviceService,
        sceneService: mockSceneService,
        automationService: mockAutomationService,
        energyService: mockEnergyService,
        securityService: mockSecurityService,
    });

    const app = createApp(container);
    const agent = request(app.callback());

    // Health
    it('GET /health/live returns 200 UP', async () => {
        const res = await agent.get('/health/live');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('UP');
    });

    it('GET /health/ready returns 200 and subsystem statuses', async () => {
        const res = await agent.get('/health/ready');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('UP');
        expect(res.body.components.database.status).toBe('UP');
    });

    // OpenAPI Spec
    it('GET /api/v1/openapi.json returns valid OpenAPI 3.1 schema', async () => {
        const res = await agent.get('/api/v1/openapi.json');
        expect(res.status).toBe(200);
        expect(res.body.openapi).toBe('3.1.0');
        expect(res.body.info.title).toContain('ABS Smart Home Backend');
    });

    // Devices
    it('GET /api/v1/devices returns list of devices', async () => {
        const res = await agent.get('/api/v1/devices');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].name).toBe(deviceFixture.name);
    });

    it('GET /api/v1/devices/:id returns device details', async () => {
        const res = await agent.get(`/api/v1/devices/${FIXTURE_IDS.DEVICE_HUE}`);
        expect(res.status).toBe(200);
        expect(res.body.name).toBe(deviceFixture.name);
    });

    it('PATCH /api/v1/devices/:id updates device name', async () => {
        const res = await agent
            .patch(`/api/v1/devices/${FIXTURE_IDS.DEVICE_HUE}`)
            .send({ name: 'Renamed Light' });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Renamed Light');
    });

    it('POST /api/v1/devices/:id/command executes IoT action', async () => {
        const res = await agent
            .post(`/api/v1/devices/${FIXTURE_IDS.DEVICE_HUE}/command`)
            .send({ action: 'turn_off', params: { on: false } });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // Scenes
    it('GET /api/v1/scenes returns list of scenes', async () => {
        const res = await agent.get('/api/v1/scenes');
        expect(res.status).toBe(200);
        expect(res.body[0].name).toBe(sceneFixture.name);
    });

    it('POST /api/v1/scenes creates a new scene', async () => {
        const res = await agent.post('/api/v1/scenes').send({
            name: 'Movie Time',
            icon: 'movie',
            homeId: FIXTURE_IDS.HOME_ID,
            actions: [],
        });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Movie Time');
    });

    it('POST /api/v1/scenes/:id/trigger executes scene', async () => {
        const res = await agent.post(`/api/v1/scenes/${FIXTURE_IDS.SCENE_ID}/trigger`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // Automations
    it('GET /api/v1/automations returns automation rules', async () => {
        const res = await agent.get('/api/v1/automations');
        expect(res.status).toBe(200);
    });

    it('POST /api/v1/automations creates an automation rule', async () => {
        const res = await agent.post('/api/v1/automations').send({
            name: automationFixture.name,
            triggerType: 'DEVICE_EVENT',
            triggerCondition: {},
            actions: [],
            homeId: FIXTURE_IDS.HOME_ID,
        });
        expect(res.status).toBe(201);
    });

    it('POST /api/v1/automations/:id/execute executes automation', async () => {
        const res = await agent.post(`/api/v1/automations/${FIXTURE_IDS.AUTOMATION_ID}/execute`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    // Energy
    it('GET /api/v1/energy/summary returns three-phase telemetry', async () => {
        const res = await agent.get('/api/v1/energy/summary');
        expect(res.status).toBe(200);
        expect(res.body.currentPowerWatts).toBe(energyFixture.totalActivePower);
        expect(res.body.phaseBalancePercentage).toBe(98);
    });

    it('POST /api/v1/energy/telemetry ingests power sample', async () => {
        const res = await agent.post('/api/v1/energy/telemetry').send({
            meterId: 'shelly_3em',
            phaseA: { voltage: 220, current: 5, activePower: 1100, powerFactor: 1.0 },
            phaseB: { voltage: 220, current: 5, activePower: 1100, powerFactor: 1.0 },
            phaseC: { voltage: 220, current: 5, activePower: 1100, powerFactor: 1.0 },
            dailyEnergyKwh: 12.0,
        });
        expect(res.status).toBe(201);
    });

    // Security
    it('GET /api/v1/security/status returns security status', async () => {
        const res = await agent.get('/api/v1/security/status');
        expect(res.status).toBe(200);
        expect(res.body.overallStatus).toBe('ARMED_HOME');
    });

    it('POST /api/v1/security/arm updates arm status', async () => {
        const res = await agent.post('/api/v1/security/arm').send({ armStatus: 'ARMED_AWAY' });
        expect(res.status).toBe(200);
        expect(res.body.overallStatus).toBe('ARMED_AWAY');
    });

    it('POST /api/v1/security/incident raises incident', async () => {
        const res = await agent.post('/api/v1/security/incident').send({
            severity: incidentFixture.severity,
            alertType: incidentFixture.alertType,
            sourceDevice: incidentFixture.sourceDevice,
        });
        expect(res.status).toBe(201);
        expect(res.body.alertType).toBe(incidentFixture.alertType);
    });
});
