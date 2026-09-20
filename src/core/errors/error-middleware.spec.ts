import { describe, it, expect } from 'vitest';
import Koa from 'koa';
import request from 'supertest';
import { z } from 'zod';
import { errorMiddleware } from '@/core/errors/error-middleware';
import {
    NotFoundError,
    ValidationError,
    VendorIntegrationError,
    RateLimitError,
} from '@/core/errors/app-error';

describe('Error Middleware (RFC 7807 Problem Details)', () => {
    const createTestApp = () => {
        const app = new Koa();
        app.use(errorMiddleware());
        return app;
    };

    it('should catch Zod validation errors and format as 422 Problem Details', async () => {
        const app = createTestApp();
        const schema = z.object({ name: z.string().min(5) });

        app.use(async () => {
            schema.parse({ name: 'ab' });
        });

        const res = await request(app.callback()).get('/test');
        expect(res.status).toBe(422);
        expect(res.headers['content-type']).toContain('application/problem+json');
        expect(res.body.type).toBe('https://abshome.dev/errors/validation-error');
        expect(res.body.status).toBe(422);
        expect(res.body.invalidParams).toHaveLength(1);
    });

    it('should handle NotFoundError as 404', async () => {
        const app = createTestApp();
        app.use(async () => {
            throw new NotFoundError('Device not found', { deviceId: '123' });
        });

        const res = await request(app.callback()).get('/devices/123');
        expect(res.status).toBe(404);
        expect(res.body.type).toBe('https://abshome.dev/errors/not-found');
        expect(res.body.detail).toBe('Device not found');
        expect(res.body.details).toEqual({ deviceId: '123' });
    });

    it('should handle ValidationError as 422', async () => {
        const app = createTestApp();
        app.use(async () => {
            throw new ValidationError('Invalid device parameters');
        });

        const res = await request(app.callback()).post('/devices');
        expect(res.status).toBe(422);
        expect(res.body.type).toBe('https://abshome.dev/errors/validation-error');
    });

    it('should handle RateLimitError as 429', async () => {
        const app = createTestApp();
        app.use(async () => {
            throw new RateLimitError();
        });

        const res = await request(app.callback()).get('/rate-limit');
        expect(res.status).toBe(429);
        expect(res.body.type).toBe('https://abshome.dev/errors/rate-limit-exceeded');
    });

    it('should handle VendorIntegrationError as 502', async () => {
        const app = createTestApp();
        app.use(async () => {
            throw new VendorIntegrationError('Hue', 'Bridge unreachable');
        });

        const res = await request(app.callback()).get('/hue');
        expect(res.status).toBe(502);
        expect(res.body.type).toBe('https://abshome.dev/errors/vendor-integration-failure');
        expect(res.body.detail).toBe('[Hue] Bridge unreachable');
    });

    it('should handle unhandled exceptions as 500', async () => {
        const app = createTestApp();
        app.use(async () => {
            throw new Error('Database crash');
        });

        const res = await request(app.callback()).get('/crash');
        expect(res.status).toBe(500);
        expect(res.body.type).toBe('https://abshome.dev/errors/internal-server-error');
    });
});
