import Router from '@koa/router';
import { HealthController } from './controller';

export const createHealthRouter = (controller: HealthController): Router => {
    const router = new Router();

    router.get('/health/live', controller.live);
    router.get('/health/ready', controller.ready);

    return router;
};
