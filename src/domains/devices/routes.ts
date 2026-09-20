import Router from '@koa/router';
import { DeviceController } from './controller';

export const createDeviceRouter = (controller: DeviceController): Router => {
    const router = new Router({ prefix: '/devices' });

    router.get('/', controller.list);
    router.get('/:id', controller.getById);
    router.patch('/:id', controller.update);
    router.post('/:id/command', controller.executeCommand);

    return router;
};
