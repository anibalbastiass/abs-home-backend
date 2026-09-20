import { Context } from 'koa';
import { HealthService } from './service';

export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    public live = async (ctx: Context): Promise<void> => {
        const liveness = this.healthService.getLiveness();
        ctx.status = 200;
        ctx.body = liveness;
    };

    public ready = async (ctx: Context): Promise<void> => {
        const { isReady, health } = await this.healthService.getReadiness();
        ctx.status = isReady ? 200 : 503;
        ctx.body = health;
    };
}
