import { z } from 'zod';
import { openApiRegistry } from '@/core/openapi/registry';

export const AutomationRuleSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    isEnabled: z.boolean(),
    triggerType: z.string(),
    triggerCondition: z.record(z.any()),
    actions: z.array(
        z.object({
            deviceId: z.string().uuid(),
            action: z.string(),
            payload: z.record(z.any()),
        }),
    ),
    homeId: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const CreateAutomationRequestSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    isEnabled: z.boolean().default(true),
    triggerType: z.enum(['TIME_CRON', 'DEVICE_EVENT', 'ENERGY_THRESHOLD', 'SECURITY_ALARM']),
    triggerCondition: z.record(z.any()),
    actions: z.array(
        z.object({
            deviceId: z.string().uuid(),
            action: z.string().min(1),
            payload: z.record(z.any()).default({}),
        }),
    ),
    homeId: z.string().uuid(),
});

export const ExecuteAutomationResponseSchema = z.object({
    success: z.boolean(),
    automationId: z.string().uuid(),
    executedActionsCount: z.number(),
    durationMs: z.number(),
    status: z.enum(['SUCCESS', 'FAILED', 'PARTIAL']),
});

export type AutomationRuleResponse = z.infer<typeof AutomationRuleSchema>;
export type CreateAutomationRequest = z.infer<typeof CreateAutomationRequestSchema>;
export type ExecuteAutomationResponse = z.infer<typeof ExecuteAutomationResponseSchema>;

openApiRegistry.register('AutomationRule', AutomationRuleSchema);
openApiRegistry.register('CreateAutomationRequest', CreateAutomationRequestSchema);
openApiRegistry.register('ExecuteAutomationResponse', ExecuteAutomationResponseSchema);

openApiRegistry.registerPath({
    method: 'get',
    path: '/automations',
    tags: ['Automations'],
    summary: 'List all automation rules',
    description: 'Retrieves all active Trigger-Condition-Action automation rules.',
    responses: {
        200: {
            description: 'Automations retrieved',
            content: {
                'application/json': {
                    schema: z.array(AutomationRuleSchema),
                },
            },
        },
    },
});

openApiRegistry.registerPath({
    method: 'post',
    path: '/automations',
    tags: ['Automations'],
    summary: 'Create a new automation rule',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateAutomationRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Automation rule created',
            content: {
                'application/json': {
                    schema: AutomationRuleSchema,
                },
            },
        },
    },
});

openApiRegistry.registerPath({
    method: 'post',
    path: '/automations/{id}/execute',
    tags: ['Automations'],
    summary: 'Manually execute an automation rule',
    request: {
        params: z.object({ id: z.string().uuid() }),
    },
    responses: {
        200: {
            description: 'Automation executed',
            content: {
                'application/json': {
                    schema: ExecuteAutomationResponseSchema,
                },
            },
        },
        404: {
            description: 'Automation not found',
        },
    },
});
