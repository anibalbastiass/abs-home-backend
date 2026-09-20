import Router from '@koa/router';
import { AutomationController } from './controller';

export const createAutomationRouter = (controller: AutomationController): Router => {
    const router = new Router({ prefix: '/automations' });

    router.get('/', controller.list);
    router.post('/', controller.create);
    router.get('/:id', controller.getById);
    router.post('/:id/execute', controller.execute);

    return router;
};
