import Router from '@koa/router';
import { SduiController } from './controller';

export const createSduiRouter = (controller: SduiController): Router => {
    const router = new Router({ prefix: '/sdui' });

    router.get('/dashboard', controller.getDashboard);

    return router;
};
