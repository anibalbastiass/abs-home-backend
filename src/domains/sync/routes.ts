import Router from '@koa/router';
import { SyncController } from './controller';

export const createSyncRouter = (controller: SyncController): Router => {
    const router = new Router({ prefix: '/sync' });

    router.post('/seed', controller.seed);
    router.get('/users/:userId', controller.getUserSnapshot);

    return router;
};
