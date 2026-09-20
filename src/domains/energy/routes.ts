import Router from '@koa/router';
import { EnergyController } from './controller';

export const createEnergyRouter = (controller: EnergyController): Router => {
    const router = new Router({ prefix: '/energy' });

    router.get('/summary', controller.getSummary);
    router.post('/telemetry', controller.ingest);

    return router;
};
