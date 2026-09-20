import { Context } from 'koa';
import { EnergyService } from './service';
import { IngestEnergySampleRequestSchema } from './schemas';

export class EnergyController {
    constructor(private readonly energyService: EnergyService) {}

    public getSummary = async (ctx: Context): Promise<void> => {
        const meterId = ctx.query.meterId as string | undefined;
        const summary = await this.energyService.getSummary(meterId);
        ctx.status = 200;
        ctx.body = summary;
    };

    public ingest = async (ctx: Context): Promise<void> => {
        const body = IngestEnergySampleRequestSchema.parse(ctx.request.body);
        const result = await this.energyService.ingestSample(body);
        ctx.status = 201;
        ctx.body = result;
    };
}
