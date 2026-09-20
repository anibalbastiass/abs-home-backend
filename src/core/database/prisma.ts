import { PrismaClient } from '@prisma/client';
import { logger } from '../logger/logger';

declare global {
   
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
      log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
      ],
  });

if (process.env.NODE_ENV !== 'production') {
    global.prismaGlobal = prisma;
}

prisma.$on('warn' as never, (e: { message: string }) => {
    logger.warn({ prisma: e.message }, 'Prisma warning');
});

prisma.$on('error' as never, (e: { message: string }) => {
    logger.error({ prisma: e.message }, 'Prisma error');
});

export const connectDatabase = async (): Promise<void> => {
    try {
        await prisma.$connect();
        logger.info('✅ PostgreSQL connected successfully via Prisma');
    } catch (err) {
        logger.error({ err }, '❌ Failed to connect to PostgreSQL');
        throw err;
    }
};

export const disconnectDatabase = async (): Promise<void> => {
    try {
        await prisma.$disconnect();
        logger.info('PostgreSQL disconnected');
    } catch (err) {
        logger.error({ err }, 'Error disconnecting PostgreSQL');
    }
};
