import pino from 'pino';
import { env } from '@/config/env';

export const logger = pino({
    level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
    env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    base: {
        service: 'abs-backend-gateway',
        env: env.NODE_ENV,
    },
});
