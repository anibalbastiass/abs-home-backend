import { createContainer } from './core/di/container';
import { logger } from './core/logger/logger';
import { createApp } from './core/http/app';
import { connectDatabase, disconnectDatabase } from './core/database/prisma';

async function bootstrap(): Promise<void> {
    const container = createContainer();
    logger.info({ env: container.env.NODE_ENV, port: container.env.PORT }, '🚀 Starting ABS Smart Home Backend Gateway...');

    // 1. Connect to Database (PostgreSQL / Prisma)
    try {
        await connectDatabase();
    } catch (err) {
        logger.warn({ err }, '⚠️ Initial database connection failed (will retry during requests)');
    }

    // 2. Initialize BullMQ Queues with Rate Limiters
    try {
        container.queueManager.initializeQueues();
    } catch (err) {
        logger.warn({ err }, '⚠️ BullMQ initialization deferred');
    }

    // 3. Connect Kafka / Redpanda Producer
    try {
        await container.kafkaManager.connectProducer();
    } catch (err) {
        logger.warn({ err }, '⚠️ Kafka producer connection deferred');
    }

    // 4. Create and start Koa HTTP Server with DI Container
    const app = createApp(container);
    const server = app.listen(container.env.PORT, '0.0.0.0', () => {
        logger.info(`✨ ABS Smart Home Gateway running on http://0.0.0.0:${container.env.PORT}`);
        logger.info(`📖 OpenAPI 3.1 Spec available at http://localhost:${container.env.PORT}${container.env.API_PREFIX}/openapi.json`);
    });

    // 5. Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        server.close(async () => {
            logger.info('HTTP server closed');
            await container.queueManager.shutdown();
            await container.kafkaManager.disconnect();
            await disconnectDatabase();
            logger.info('Graceful shutdown completed');
            process.exit(0);
        });

        // Force shutdown after 10s if hanging
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
    logger.fatal({ err }, '💥 Fatal error during backend bootstrap');
    process.exit(1);
});
