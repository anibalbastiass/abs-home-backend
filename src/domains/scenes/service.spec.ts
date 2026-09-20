import { describe, it, expect, vi } from 'vitest';
import { SceneServiceImpl } from './service';
import { NotFoundError } from '@/core/errors/app-error';
import { createSceneFixture, FIXTURE_IDS } from '@/test/fixtures';

describe('SceneServiceImpl', () => {
    const mockPrisma: any = {
        scene: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
        },
    };

    const mockDeviceService: any = {
        executeCommand: vi.fn().mockResolvedValue({ success: true }),
    };

    const service = new SceneServiceImpl(mockPrisma, mockDeviceService);

    it('should list scenes with or without homeId using fixtures', async () => {
        const fixture = createSceneFixture();
        mockPrisma.scene.findMany.mockResolvedValueOnce([fixture]);

        const scenesWithHome = await service.listScenes(FIXTURE_IDS.HOME_ID);
        expect(scenesWithHome).toHaveLength(1);
        expect(scenesWithHome[0].id).toBe(fixture.id);

        mockPrisma.scene.findMany.mockResolvedValueOnce([]);
        const scenesWithoutHome = await service.listScenes();
        expect(scenesWithoutHome).toHaveLength(0);
    });

    it('should create scene with custom action order using fixtures', async () => {
        const fixture = createSceneFixture({
            actions: [
                {
                    id: 'act_1',
                    deviceId: FIXTURE_IDS.DEVICE_HUE,
                    action: 'dim',
                    payload: { brightness: 20 },
                    order: 5,
                },
            ],
        });

        mockPrisma.scene.create.mockResolvedValueOnce(fixture);

        const created = await service.createScene({
            name: fixture.name,
            icon: fixture.icon,
            homeId: fixture.homeId,
            actions: [
                {
                    deviceId: FIXTURE_IDS.DEVICE_HUE,
                    action: 'dim',
                    payload: { brightness: 20 },
                    order: 5,
                },
            ],
        });

        expect(created.name).toBe(fixture.name);
        expect(created.actions[0].order).toBe(5);
    });

    it('should trigger scene and gracefully handle failed actions using fixtures', async () => {
        const fixture = createSceneFixture({
            actions: [
                {
                    id: 'act_1',
                    deviceId: FIXTURE_IDS.DEVICE_HUE,
                    action: 'turn_off',
                    payload: { on: false },
                    order: 1,
                },
                {
                    id: 'act_2',
                    deviceId: 'dev_fail',
                    action: 'turn_off',
                    payload: { on: false },
                    order: 2,
                },
            ],
        });

        mockPrisma.scene.findUnique.mockResolvedValueOnce(fixture);

        mockDeviceService.executeCommand
            .mockResolvedValueOnce({ success: true })
            .mockRejectedValueOnce(new Error('Device unreachable'));

        const res = await service.triggerScene(fixture.id);
        expect(res.success).toBe(true);
        expect(res.executedActionsCount).toBe(1);
    });

    it('should throw NotFoundError for missing scene', async () => {
        mockPrisma.scene.findUnique.mockResolvedValueOnce(null);
        await expect(service.getSceneById('missing_id')).rejects.toThrow(NotFoundError);
    });
});
