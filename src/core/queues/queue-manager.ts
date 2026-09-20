import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from '../logger/logger';

export type IoTCommandPayload = {
  commandId: string;
  vendor: 'hue' | 'nest' | 'switchbot' | 'ring' | 'blink' | 'energy';
  deviceId: string;
  action: string;
  params: Record<string, unknown>;
  timestamp: number;
};

export type QueueRateLimitConfig = {
  max: number;
  duration: number; // in ms
};

export const VENDOR_RATE_LIMITS: Record<string, QueueRateLimitConfig> = {
    hue: { max: 10, duration: 1000 },
    nest: { max: 3, duration: 1000 },
    switchbot: { max: 2, duration: 1000 },
    ring: { max: 1, duration: 1000 },
    blink: { max: 1, duration: 1000 },
    energy: { max: 20, duration: 1000 },
};

export class QueueManager {
    private redisConnection: Redis | null = null;
    private queues: Map<string, Queue<IoTCommandPayload>> = new Map();
    private workers: Map<string, Worker<IoTCommandPayload>> = new Map();
    private queueEvents: Map<string, QueueEvents> = new Map();
    private commandHandlers: Map<string, (payload: IoTCommandPayload) => Promise<unknown>> = new Map();

    constructor() {
    // Lazily initialize on start
    }

    public getRedisConnection(): Redis {
        if (!this.redisConnection) {
            this.redisConnection = new Redis(env.REDIS_URL, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
                lazyConnect: true,
            });

            this.redisConnection.on('error', (err) => {
                logger.error({ err }, 'Redis connection error');
            });

            this.redisConnection.on('connect', () => {
                logger.info('✅ Redis connected for BullMQ queues');
            });
        }
        return this.redisConnection;
    }

    public registerCommandHandler(
        vendor: string,
        handler: (payload: IoTCommandPayload) => Promise<unknown>,
    ): void {
        this.commandHandlers.set(vendor, handler);
    }

    public initializeQueues(): void {
        const connection = this.getRedisConnection();

        for (const [vendor, limit] of Object.entries(VENDOR_RATE_LIMITS)) {
            const queueName = `iot-${vendor}-queue`;
      
            const queue = new Queue<IoTCommandPayload>(queueName, {
                connection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: { count: 500 },
                    removeOnFail: { count: 1000 },
                },
            });

            const worker = new Worker<IoTCommandPayload>(
                queueName,
                async (job: Job<IoTCommandPayload>) => {
                    logger.debug({ vendor, jobId: job.id, action: job.data.action }, 'Processing IoT command job');
                    const handler = this.commandHandlers.get(vendor);
                    if (handler) {
                        return await handler(job.data);
                    } else {
                        logger.warn({ vendor }, 'No command handler registered for vendor');
                        return { status: 'unhandled', vendor };
                    }
                },
                {
                    connection,
                    limiter: {
                        max: limit.max,
                        duration: limit.duration,
                    },
                    concurrency: 5,
                },
            );

            worker.on('completed', (job) => {
                logger.debug({ vendor, jobId: job.id }, 'IoT command completed');
            });

            worker.on('failed', (job, err) => {
                logger.error({ vendor, jobId: job?.id, err }, 'IoT command failed');
            });

            this.queues.set(vendor, queue);
            this.workers.set(vendor, worker);
        }

        logger.info('🚀 BullMQ IoT vendor queues initialized with rate limiters');
    }

    public async dispatchCommand(payload: IoTCommandPayload): Promise<{ jobId: string; queueName: string }> {
        const queue = this.queues.get(payload.vendor);
        if (!queue) {
            throw new Error(`Queue for vendor "${payload.vendor}" is not initialized`);
        }

        const job = await queue.add(payload.action, payload, {
            jobId: payload.commandId,
        });

        return {
            jobId: job.id || payload.commandId,
            queueName: queue.name,
        };
    }

    public async getQueueStatus(): Promise<Record<string, { waiting: number; active: number; completed: number; failed: number }>> {
        const status: Record<string, { waiting: number; active: number; completed: number; failed: number }> = {};

        for (const [vendor, queue] of this.queues.entries()) {
            const [waiting, active, completed, failed] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
            ]);

            status[vendor] = { waiting, active, completed, failed };
        }

        return status;
    }

    public async shutdown(): Promise<void> {
        logger.info('Stopping BullMQ workers and queues...');
        for (const worker of this.workers.values()) {
            await worker.close();
        }
        for (const queue of this.queues.values()) {
            await queue.close();
        }
        if (this.redisConnection) {
            await this.redisConnection.quit();
        }
        logger.info('BullMQ shutdown complete');
    }
}

export const queueManager = new QueueManager();
