import Koa, { Context, Next } from 'koa';
import helmet from 'koa-helmet';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import { logger } from '../logger/logger';
import { errorMiddleware } from '../errors/error-middleware';
import { generateOpenApiDocument } from '../openapi/registry';
import { getSwaggerHtml } from '../openapi/swagger-ui';
import { AppContainer, createContainer } from '../di/container';
import { createHealthRouter } from '@/domains/health/routes';
import { createDeviceRouter } from '@/domains/devices/routes';
import { createSceneRouter } from '@/domains/scenes/routes';
import { createAutomationRouter } from '@/domains/automations/routes';
import { createEnergyRouter } from '@/domains/energy/routes';
import { createSecurityRouter } from '@/domains/security/routes';

export const createApp = (container: AppContainer = createContainer()): Koa => {
    const app = new Koa();

    // 1. Security Headers (relaxed CSP for Swagger UI CDN assets)
    app.use(
        helmet({
            contentSecurityPolicy: false,
        }),
    );

    // 2. CORS
    app.use(
        cors({
            origin: '*',
            allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
            exposeHeaders: ['X-Response-Time', 'Content-Type'],
        }),
    );

    // 3. Response Time Header & Request Logging
    app.use(async (ctx: Context, next: Next) => {
        const start = Date.now();
        await next();
        const delta = Date.now() - start;
        ctx.set('X-Response-Time', `${delta}ms`);

        if (ctx.path !== '/health/live') {
            logger.info(
                {
                    method: ctx.method,
                    path: ctx.path,
                    status: ctx.status,
                    durationMs: delta,
                    ip: ctx.ip,
                },
                'HTTP Request',
            );
        }
    });

    // 4. Global RFC 7807 Error Handling Middleware
    app.use(errorMiddleware());

    // 5. Body Parser
    app.use(
        bodyParser({
            enableTypes: ['json', 'form'],
            jsonLimit: '10mb',
            strict: true,
        }),
    );

    // 6. Root & Health Check & Swagger UI Routes
    const rootRouter = new Router();
    const healthRouter = createHealthRouter(container.healthController);
    rootRouter.use(healthRouter.routes()).use(healthRouter.allowedMethods());

    // Swagger UI at /docs
    rootRouter.get('/docs', (ctx: Context) => {
        ctx.status = 200;
        ctx.type = 'text/html; charset=utf-8';
        ctx.body = getSwaggerHtml(`${container.env.API_PREFIX}/openapi.json`);
    });

    // 7. API V1 Router
    const apiV1Router = new Router({ prefix: container.env.API_PREFIX });

    // OpenAPI 3.1 Spec Endpoint
    apiV1Router.get('/openapi.json', (ctx: Context) => {
        const spec = generateOpenApiDocument();
        ctx.status = 200;
        ctx.set('Content-Type', 'application/json');
        ctx.body = spec;
    });

    // Swagger UI at /api/v1/docs
    apiV1Router.get('/docs', (ctx: Context) => {
        ctx.status = 200;
        ctx.type = 'text/html; charset=utf-8';
        ctx.body = getSwaggerHtml(`${container.env.API_PREFIX}/openapi.json`);
    });

    // Mount Domain Routers created with DI controllers
    const deviceRouter = createDeviceRouter(container.deviceController);
    const sceneRouter = createSceneRouter(container.sceneController);
    const automationRouter = createAutomationRouter(container.automationController);
    const energyRouter = createEnergyRouter(container.energyController);
    const securityRouter = createSecurityRouter(container.securityController);

    apiV1Router.use(healthRouter.routes()).use(healthRouter.allowedMethods());
    apiV1Router.use(deviceRouter.routes()).use(deviceRouter.allowedMethods());
    apiV1Router.use(sceneRouter.routes()).use(sceneRouter.allowedMethods());
    apiV1Router.use(automationRouter.routes()).use(automationRouter.allowedMethods());
    apiV1Router.use(energyRouter.routes()).use(energyRouter.allowedMethods());
    apiV1Router.use(securityRouter.routes()).use(securityRouter.allowedMethods());

    // Mount all routes
    app.use(rootRouter.routes()).use(rootRouter.allowedMethods());
    app.use(apiV1Router.routes()).use(apiV1Router.allowedMethods());

    return app;
};
