import Router from '@koa/router';
import { SceneController } from './controller';

export const createSceneRouter = (controller: SceneController): Router => {
    const router = new Router({ prefix: '/scenes' });

    router.get('/', controller.list);
    router.post('/', controller.create);
    router.get('/:id', controller.getById);
    router.post('/:id/trigger', controller.trigger);

    return router;
};
