import { Context, Next } from 'koa';
import { ZodError } from 'zod';
import { AppError } from './app-error';
import { logger } from '../logger/logger';

export interface ProblemDetails {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
    invalidParams?: Array<{ name: string; reason: string }>;
    [key: string]: unknown;
}

export const errorMiddleware = () => {
    return async (ctx: Context, next: Next): Promise<void> => {
        try {
            await next();
        } catch (err: unknown) {
            const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const requestPath = ctx.path;

            if (err instanceof ZodError) {
                const problem: ProblemDetails = {
                    type: 'https://abshome.dev/errors/validation-error',
                    title: 'Unprocessable Entity',
                    status: 422,
                    detail: 'One or more request parameters failed validation schema checks.',
                    instance: requestPath,
                    errorId,
                    invalidParams: err.errors.map((e) => ({
                        name: e.path.join('.'),
                        reason: e.message,
                    })),
                };

                logger.warn({ errorId, path: requestPath, errors: err.errors }, 'Validation error');
                ctx.status = 422;
                ctx.body = problem;
                ctx.type = 'application/problem+json';
                return;
            }

            if (err instanceof AppError) {
                const problem: ProblemDetails = {
                    type: err.errorType,
                    title: err.name,
                    status: err.statusCode,
                    detail: err.message,
                    instance: requestPath,
                    errorId,
                    ...(err.details ? { details: err.details } : {}),
                };

                if (err.statusCode >= 500) {
                    logger.error({ errorId, err, path: requestPath }, 'Domain server error');
                } else {
                    logger.warn({ errorId, statusCode: err.statusCode, detail: err.message, path: requestPath }, 'Domain client error');
                }

                ctx.status = err.statusCode;
                ctx.body = problem;
                ctx.type = 'application/problem+json';
                return;
            }

            const unexpectedError = err instanceof Error ? err : new Error(String(err));
            logger.error({ errorId, err: unexpectedError, path: requestPath }, 'Unhandled server exception');

            const problem: ProblemDetails = {
                type: 'https://abshome.dev/errors/internal-server-error',
                title: 'Internal Server Error',
                status: 500,
                detail: 'An unexpected internal error occurred on the IoT control plane.',
                instance: requestPath,
                errorId,
            };

            ctx.status = 500;
            ctx.body = problem;
            ctx.type = 'application/problem+json';
        }
    };
};
