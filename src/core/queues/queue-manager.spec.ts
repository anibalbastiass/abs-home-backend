import { describe, it, expect, vi } from 'vitest';
import { QueueManager, VENDOR_RATE_LIMITS, queueManager } from '@/core/queues/queue-manager';

describe('Queue Manager & Rate Limiting', () => {
    it('should have rate limits configured for all major IoT vendors', () => {
        expect(VENDOR_RATE_LIMITS.hue.max).toBe(10);
        expect(VENDOR_RATE_LIMITS.nest.max).toBe(3);
        expect(VENDOR_RATE_LIMITS.switchbot.max).toBe(2);
        expect(VENDOR_RATE_LIMITS.ring.max).toBe(1);
        expect(VENDOR_RATE_LIMITS.blink.max).toBe(1);
        expect(VENDOR_RATE_LIMITS.energy.max).toBe(20);
    });

    it('should allow registering vendor command handlers and lazily get Redis connection', () => {
        const qm = new QueueManager();
        const handler = vi.fn().mockResolvedValue({ success: true });
        qm.registerCommandHandler('hue', handler);
        const redis = qm.getRedisConnection();
        expect(redis).toBeDefined();
        // Calling again returns same instance
        expect(qm.getRedisConnection()).toBe(redis);
    });

    it('should throw error when dispatching to uninitialized queue', async () => {
        const qm = new QueueManager();
        await expect(
            qm.dispatchCommand({
                commandId: 'cmd_1',
                vendor: 'hue',
                deviceId: 'dev_1',
                action: 'turn_on',
                params: {},
                timestamp: Date.now(),
            }),
        ).rejects.toThrow('Queue for vendor "hue" is not initialized');
    });

    it('should allow initializing queues, dispatching commands, querying status, and shutting down', async () => {
        const qm = new QueueManager();

        const mockQueue: any = {
            name: 'iot-hue-queue',
            add: vi.fn().mockResolvedValue({ id: 'job_123' }),
            getWaitingCount: vi.fn().mockResolvedValue(0),
            getActiveCount: vi.fn().mockResolvedValue(1),
            getCompletedCount: vi.fn().mockResolvedValue(5),
            getFailedCount: vi.fn().mockResolvedValue(0),
            close: vi.fn().mockResolvedValue(undefined),
        };

        const mockWorker: any = {
            on: vi.fn(),
            close: vi.fn().mockResolvedValue(undefined),
        };

        // Inject mock queue & worker into private maps
        (qm as any).queues.set('hue', mockQueue);
        (qm as any).workers.set('hue', mockWorker);

        const dispatchRes = await qm.dispatchCommand({
            commandId: 'cmd_123',
            vendor: 'hue',
            deviceId: 'dev_1',
            action: 'turn_on',
            params: {},
            timestamp: Date.now(),
        });

        expect(dispatchRes.jobId).toBe('job_123');
        expect(dispatchRes.queueName).toBe('iot-hue-queue');

        const status = await qm.getQueueStatus();
        expect(status.hue).toEqual({ waiting: 0, active: 1, completed: 5, failed: 0 });

        await qm.shutdown();
        expect(mockWorker.close).toHaveBeenCalled();
        expect(mockQueue.close).toHaveBeenCalled();
    });

    it('singleton queueManager should be exported', () => {
        expect(queueManager).toBeDefined();
    });
});
