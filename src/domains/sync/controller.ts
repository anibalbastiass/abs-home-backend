import { Context } from 'koa';
import { SyncService } from './service';
import { BackendSeedPayloadSchema } from './schemas';

export class SyncController {
    constructor(private readonly syncService: SyncService) {}

    public seed = async (ctx: Context): Promise<void> => {
        const payload = BackendSeedPayloadSchema.parse(ctx.request.body);
        const result = await this.syncService.seedDatabase(payload);
        ctx.status = 200;
        ctx.body = result;
    };
}
