import { describe, it, expect, vi } from 'vitest';
import { AutomationServiceImpl } from './service';
import { KafkaClientManager } from '@/core/events/kafka-client';
import { NotFoundError } from '@/core/errors/app-error';
import { createAutomationFixture, FIXTURE_IDS } from '@/test/fixtures';

describe('AutomationServiceImpl', () => {
    const mockPrisma: any = {
        automationRule: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        automationExecutionLog: {
            create: vi.fn().mockResolvedValue({}),
        },
    };

    const mockDeviceService: any = {
        executeCommand: vi.fn().mockResolvedValue({ success: true }),
    };

    const mockKafkaManager = new KafkaClientManager();
    const service = new AutomationServiceImpl(mockPrisma, mockDeviceService, mockKafkaManager);

    it('should list automation rules using fixtures', async () => {
        const fixture = createAutomationFixture();
        mockPrisma.automationRule.findMany.mockResolvedValueOnce([fixture]);

        const listWithHome = await service.listAutomations(FIXTURE_IDS.HOME_ID);
        expect(listWithHome).toHaveLength(1);
        expect(listWithHome[0].id).toBe(fixture.id);

        mockPrisma.automationRule.findMany.mockResolvedValueOnce([]);
        const listWithoutHome = await service.listAutomations();
        expect(listWithoutHome).toHaveLength(0);
    });

    it('should create automation rule using fixture', async () => {
        const fixture = createAutomationFixture({ name: 'Sunset Curtains' });
        mockPrisma.automationRule.create.mockResolvedValueOnce(fixture);

        const created = await service.createAutomation({
            name: fixture.name,
            description: fixture.description || undefined,
            isEnabled: fixture.isEnabled,
            triggerType: fixture.triggerType as any,
            triggerCondition: fixture.triggerCondition,
            actions: fixture.actions as any,
            homeId: fixture.homeId,
        });

        expect(created.name).toBe('Sunset Curtains');
    });

    it('should execute automation rule and record log using fixture', async () => {
        const fixture = createAutomationFixture();
        mockPrisma.automationRule.findUnique.mockResolvedValueOnce(fixture);

        const res = await service.executeAutomation(fixture.id);
        expect(res.success).toBe(true);
        expect(res.status).toBe('SUCCESS');
        expect(res.executedActionsCount).toBe(1);
        expect(mockPrisma.automationExecutionLog.create).toHaveBeenCalled();
    });

    it('should handle partial or failed execution when actions fail', async () => {
        const fixture = createAutomationFixture({
            actions: [
                { deviceId: 'dev_ok', action: 'turn_on', payload: {} },
                { deviceId: 'dev_fail', action: 'turn_off', payload: {} },
            ],
        });

        mockPrisma.automationRule.findUnique.mockResolvedValueOnce(fixture);

        mockDeviceService.executeCommand
            .mockResolvedValueOnce({ success: true })
            .mockRejectedValueOnce(new Error('Network error'));

        const res = await service.executeAutomation(fixture.id);
        expect(res.success).toBe(true);
        expect(res.status).toBe('PARTIAL');
        expect(res.executedActionsCount).toBe(1);
    });

    it('should handle completely failed execution when all actions fail', async () => {
        const fixture = createAutomationFixture({
            actions: [{ deviceId: 'dev_fail', action: 'turn_off', payload: {} }],
        });

        mockPrisma.automationRule.findUnique.mockResolvedValueOnce(fixture);
        mockDeviceService.executeCommand.mockRejectedValueOnce(new Error('All fail'));

        const res = await service.executeAutomation(fixture.id);
        expect(res.success).toBe(false);
        expect(res.status).toBe('FAILED');
        expect(res.executedActionsCount).toBe(0);
    });

    it('should throw NotFoundError for missing automation', async () => {
        mockPrisma.automationRule.findUnique.mockResolvedValueOnce(null);
        await expect(service.getAutomationById('missing_id')).rejects.toThrow(NotFoundError);
    });
});
