import { describe, it, expect, vi } from 'vitest';
import { HealthServiceImpl } from './service';
import { HealthStatusSchema } from './schemas';
import { env } from '@/config/env';
import { createHealthStatusFixture } from '@/test/fixtures';

describe('HealthServiceImpl & Schemas', () => {
    const mockPrisma: any = {
        $queryRaw: vi.fn(),
    };

    const mockRedis: any = {
        ping: vi.fn(),
    };

    const mockQueueManager: any = {
        getRedisConnection: vi.fn().mockReturnValue(mockRedis),
    };

    const service = new HealthServiceImpl(mockPrisma, mockQueueManager, env);

    it('should validate HealthStatus schema using fixture', () => {
        const fixture = createHealthStatusFixture();
        const parsed = HealthStatusSchema.parse(fixture);
        expect(parsed.status).toBe('UP');
    });

    it('should return liveness status UP', () => {
        const live = service.getLiveness();
        expect(live.status).toBe('UP');
        expect(live.timestamp).toBeDefined();
    });

    it('should report readiness UP when PostgreSQL and Redis are healthy', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([1]);
        mockRedis.ping.mockResolvedValueOnce('PONG');

        const { isReady, health } = await service.getReadiness();
        expect(isReady).toBe(true);
        expect(health.status).toBe('UP');
        expect(health.components.database.status).toBe('UP');
        expect(health.components.redis.status).toBe('UP');
    });

    it('should report readiness DEGRADED when redis returns non-PONG', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([1]);
        mockRedis.ping.mockResolvedValueOnce('ERROR');

        const { isReady, health } = await service.getReadiness();
        expect(isReady).toBe(false);
        expect(health.status).toBe('DEGRADED');
        expect(health.components.redis.status).toBe('DEGRADED');
    });

    it('should report readiness DOWN when redis throws error', async () => {
        mockPrisma.$queryRaw.mockResolvedValueOnce([1]);
        mockRedis.ping.mockRejectedValueOnce(new Error('Redis connection lost'));

        const { isReady, health } = await service.getReadiness();
        expect(isReady).toBe(false);
        expect(health.status).toBe('DEGRADED');
        expect(health.components.redis.status).toBe('DOWN');
    });

    it('should report readiness DOWN when both database and redis fail', async () => {
        mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection timeout'));
        mockRedis.ping.mockRejectedValueOnce(new Error('Redis down'));

        const { isReady, health } = await service.getReadiness();
        expect(isReady).toBe(false);
        expect(health.status).toBe('DOWN');
        expect(health.components.database.status).toBe('DOWN');
        expect(health.components.redis.status).toBe('DOWN');
    });
});
