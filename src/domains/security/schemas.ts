import { z } from 'zod';
import { openApiRegistry } from '@/core/openapi/registry';

export const ArmStatusEnum = z.enum(['DISARMED', 'ARMED_HOME', 'ARMED_AWAY']);
export const IncidentSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const SecurityZoneSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    armStatus: ArmStatusEnum,
    homeId: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const SetArmStatusRequestSchema = z.object({
    armStatus: ArmStatusEnum,
    homeId: z.string().uuid().optional(),
    zoneId: z.string().uuid().optional(),
});

export const SecurityIncidentResponseSchema = z.object({
    id: z.string().uuid(),
    severity: IncidentSeverityEnum,
    alertType: z.string(),
    sourceDevice: z.string(),
    details: z.record(z.any()),
    resolvedAt: z.string().nullable().optional(),
    createdAt: z.string(),
});

export const RaiseIncidentRequestSchema = z.object({
    severity: IncidentSeverityEnum.default('MEDIUM'),
    alertType: z.enum(['MOTION_DETECTED', 'DOOR_OPENED', 'GLASS_BREAK', 'TAMPER', 'OFFLINE_BREACH']),
    sourceDevice: z.string().min(1),
    details: z.record(z.any()).default({}),
});

export const SecuritySystemStatusResponseSchema = z.object({
    overallStatus: ArmStatusEnum,
    zones: z.array(SecurityZoneSchema),
    activeIncidentsCount: z.number(),
    recentIncidents: z.array(SecurityIncidentResponseSchema),
});

export type SecurityZoneResponse = z.infer<typeof SecurityZoneSchema>;
export type SetArmStatusRequest = z.infer<typeof SetArmStatusRequestSchema>;
export type SecurityIncidentResponse = z.infer<typeof SecurityIncidentResponseSchema>;
export type RaiseIncidentRequest = z.infer<typeof RaiseIncidentRequestSchema>;
export type SecuritySystemStatusResponse = z.infer<typeof SecuritySystemStatusResponseSchema>;

openApiRegistry.register('SecurityZone', SecurityZoneSchema);
openApiRegistry.register('SetArmStatusRequest', SetArmStatusRequestSchema);
openApiRegistry.register('SecurityIncident', SecurityIncidentResponseSchema);
openApiRegistry.register('SecuritySystemStatus', SecuritySystemStatusResponseSchema);

openApiRegistry.registerPath({
    method: 'get',
    path: '/security/status',
    tags: ['Security'],
    summary: 'Get overall home security system status',
    responses: {
        200: {
            description: 'Security status retrieved',
            content: {
                'application/json': {
                    schema: SecuritySystemStatusResponseSchema,
                },
            },
        },
    },
});

openApiRegistry.registerPath({
    method: 'post',
    path: '/security/arm',
    tags: ['Security'],
    summary: 'Set security system arm status (DISARMED, ARMED_HOME, ARMED_AWAY)',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: SetArmStatusRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Arm status updated',
            content: {
                'application/json': {
                    schema: SecuritySystemStatusResponseSchema,
                },
            },
        },
    },
});

openApiRegistry.registerPath({
    method: 'post',
    path: '/security/incident',
    tags: ['Security'],
    summary: 'Report a security alarm or sensor breach',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: RaiseIncidentRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Security incident logged and alarm event published',
            content: {
                'application/json': {
                    schema: SecurityIncidentResponseSchema,
                },
            },
        },
    },
});
