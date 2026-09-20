import { z } from 'zod';
import { openApiRegistry } from '@/core/openapi/registry';

export const HealthStatusSchema = z.object({
    status: z.enum(['UP', 'DOWN', 'DEGRADED']),
    timestamp: z.string(),
    uptime: z.number(),
    version: z.string(),
    environment: z.string(),
    components: z.record(
        z.object({
            status: z.enum(['UP', 'DOWN', 'DEGRADED']),
            details: z.string().optional(),
        }),
    ),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

openApiRegistry.register('HealthStatus', HealthStatusSchema);

openApiRegistry.registerPath({
    method: 'get',
    path: '/health/live',
    tags: ['Health'],
    summary: 'Liveness health check endpoint',
    description: 'Returns UP if the Koa backend process is alive and responsive.',
    responses: {
        200: {
            description: 'Process is alive',
            content: {
                'application/json': {
                    schema: z.object({
                        status: z.literal('UP'),
                        timestamp: z.string(),
                    }),
                },
            },
        },
    },
});

openApiRegistry.registerPath({
    method: 'get',
    path: '/health/ready',
    tags: ['Health'],
    summary: 'Readiness health check endpoint',
    description: 'Checks connectivity to PostgreSQL, Redis, and Kafka.',
    responses: {
        200: {
            description: 'All backend subsystems are healthy',
            content: {
                'application/json': {
                    schema: HealthStatusSchema,
                },
            },
        },
        503: {
            description: 'One or more essential subsystems are unavailable',
            content: {
                'application/json': {
                    schema: HealthStatusSchema,
                },
            },
        },
    },
});
