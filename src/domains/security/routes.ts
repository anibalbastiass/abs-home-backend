import Router from '@koa/router';
import { SecurityController } from './controller';

export const createSecurityRouter = (controller: SecurityController): Router => {
    const router = new Router({ prefix: '/security' });

    router.get('/status', controller.getStatus);
    router.post('/arm', controller.setArmStatus);
    router.post('/incident', controller.raiseIncident);

    return router;
};
