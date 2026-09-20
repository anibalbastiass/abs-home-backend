import { PrismaClient } from '@prisma/client';
import { EnvConfig } from '@/config/env';
import { QueueManager } from '@/core/queues/queue-manager';
import { HealthStatus } from './schemas';

export interface HealthService {
    getLiveness(): { status: 'UP'; timestamp: string };
    getReadiness(): Promise<{ isReady: boolean; health: HealthStatus }>;
}

export class HealthServiceImpl implements HealthService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly queueManager: QueueManager,
        private readonly env: EnvConfig,
    ) {}

    public getLiveness(): { status: 'UP'; timestamp: string } {
        return {
            status: 'UP',
            timestamp: new Date().toISOString(),
        };
    }

    public async getReadiness(): Promise<{ isReady: boolean; health: HealthStatus }> {
        const components: HealthStatus['components'] = {};
        let isDatabaseHealthy = false;
        let isRedisHealthy = false;

        // Check Database (PostgreSQL)
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            components.database = { status: 'UP', details: 'PostgreSQL connection active' };
            isDatabaseHealthy = true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            components.database = { status: 'DOWN', details: `PostgreSQL error: ${message}` };
        }

        // Check Redis
        try {
            const redis = this.queueManager.getRedisConnection();
            const pingRes = await redis.ping();
            if (pingRes === 'PONG') {
                components.redis = { status: 'UP', details: 'Redis cache & queues active' };
                isRedisHealthy = true;
            } else {
                components.redis = { status: 'DEGRADED', details: `Unexpected ping response: ${pingRes}` };
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            components.redis = { status: 'DOWN', details: `Redis error: ${message}` };
        }

        // Overall status determination
        let overallStatus: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
        if (!isDatabaseHealthy || !isRedisHealthy) {
            overallStatus = isDatabaseHealthy || isRedisHealthy ? 'DEGRADED' : 'DOWN';
        }

        const health: HealthStatus = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0',
            environment: this.env.NODE_ENV,
            components,
        };

        return {
            isReady: overallStatus === 'UP',
            health,
        };
    }
}
