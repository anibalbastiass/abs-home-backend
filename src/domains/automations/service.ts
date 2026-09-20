import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/core/errors/app-error';
import { logger } from '@/core/logger/logger';
import { KafkaClientManager } from '@/core/events/kafka-client';
import { AutomationTriggeredEvent, KAFKA_TOPICS } from '@/core/events/domain-events';
import { DeviceService } from '../devices/service';
import {
    CreateAutomationRequest,
    AutomationRuleResponse,
    ExecuteAutomationResponse,
} from './schemas';

export interface AutomationService {
    listAutomations(homeId?: string): Promise<AutomationRuleResponse[]>;
    getAutomationById(id: string): Promise<AutomationRuleResponse>;
    createAutomation(req: CreateAutomationRequest): Promise<AutomationRuleResponse>;
    executeAutomation(id: string, triggerSource?: string): Promise<ExecuteAutomationResponse>;
}

export class AutomationServiceImpl implements AutomationService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly deviceService: DeviceService,
        private readonly kafkaManager: KafkaClientManager,
    ) {}

    public async listAutomations(homeId?: string): Promise<AutomationRuleResponse[]> {
        const automations = await this.prisma.automationRule.findMany({
            where: homeId ? { homeId } : {},
            orderBy: { name: 'asc' },
        });

        return automations.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            isEnabled: a.isEnabled,
            triggerType: a.triggerType,
            triggerCondition: (a.triggerCondition as Record<string, unknown>) || {},
            actions: (a.actions as Array<{ deviceId: string; action: string; payload: Record<string, unknown> }>) || [],
            homeId: a.homeId,
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
        }));
    }

    public async getAutomationById(id: string): Promise<AutomationRuleResponse> {
        const automation = await this.prisma.automationRule.findUnique({
            where: { id },
        });

        if (!automation) {
            throw new NotFoundError(`Automation rule with ID "${id}" was not found`);
        }

        return {
            id: automation.id,
            name: automation.name,
            description: automation.description,
            isEnabled: automation.isEnabled,
            triggerType: automation.triggerType,
            triggerCondition: (automation.triggerCondition as Record<string, unknown>) || {},
            actions:
                (automation.actions as Array<{
                    deviceId: string;
                    action: string;
                    payload: Record<string, unknown>;
                }>) || [],
            homeId: automation.homeId,
            createdAt: automation.createdAt.toISOString(),
            updatedAt: automation.updatedAt.toISOString(),
        };
    }

    public async createAutomation(req: CreateAutomationRequest): Promise<AutomationRuleResponse> {
        const created = await this.prisma.automationRule.create({
            data: {
                name: req.name,
                description: req.description,
                isEnabled: req.isEnabled,
                triggerType: req.triggerType,
                triggerCondition: req.triggerCondition,
                actions: req.actions,
                homeId: req.homeId,
            },
        });

        return {
            id: created.id,
            name: created.name,
            description: created.description,
            isEnabled: created.isEnabled,
            triggerType: created.triggerType,
            triggerCondition: (created.triggerCondition as Record<string, unknown>) || {},
            actions:
                (created.actions as Array<{
                    deviceId: string;
                    action: string;
                    payload: Record<string, unknown>;
                }>) || [],
            homeId: created.homeId,
            createdAt: created.createdAt.toISOString(),
            updatedAt: created.updatedAt.toISOString(),
        };
    }

    public async executeAutomation(id: string, triggerSource = 'MANUAL_EXECUTION'): Promise<ExecuteAutomationResponse> {
        const automation = await this.getAutomationById(id);
        const startTime = Date.now();
        logger.info({ automationId: id, name: automation.name }, 'Executing automation rule');

        let executedCount = 0;
        let hasError = false;
        let lastErrorMessage: string | undefined;

        for (const act of automation.actions) {
            try {
                await this.deviceService.executeCommand(act.deviceId, {
                    action: act.action,
                    params: act.payload,
                });
                executedCount++;
            } catch (err: unknown) {
                hasError = true;
                lastErrorMessage = err instanceof Error ? err.message : String(err);
                logger.error({ err, act }, 'Failed executing automation action');
            }
        }

        const durationMs = Date.now() - startTime;
        const status = hasError ? (executedCount > 0 ? 'PARTIAL' : 'FAILED') : 'SUCCESS';

        // Record execution log in database
        await this.prisma.automationExecutionLog.create({
            data: {
                automationId: id,
                status,
                triggerEvent: { source: triggerSource },
                durationMs,
                error: lastErrorMessage,
            },
        });

        // Publish domain event
        const event: AutomationTriggeredEvent = {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventType: 'AUTOMATION_TRIGGERED',
            timestamp: new Date().toISOString(),
            source: 'abs-backend-gateway',
            data: {
                automationId: id,
                name: automation.name,
                triggerSource,
                executedActionsCount: executedCount,
                durationMs,
                status,
            },
        };

        await this.kafkaManager.publishEvent(KAFKA_TOPICS.AUTOMATION_EVENTS, event);

        return {
            success: status !== 'FAILED',
            automationId: id,
            executedActionsCount: executedCount,
            durationMs,
            status,
        };
    }
}
