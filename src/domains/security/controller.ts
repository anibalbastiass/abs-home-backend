import { Context } from 'koa';
import { SecurityService } from './service';
import { SetArmStatusRequestSchema, RaiseIncidentRequestSchema } from './schemas';

export class SecurityController {
    constructor(private readonly securityService: SecurityService) {}

    public getStatus = async (ctx: Context): Promise<void> => {
        const homeId = ctx.query.homeId as string | undefined;
        const status = await this.securityService.getStatus(homeId);
        ctx.status = 200;
        ctx.body = status;
    };

    public setArmStatus = async (ctx: Context): Promise<void> => {
        const body = SetArmStatusRequestSchema.parse(ctx.request.body);
        const status = await this.securityService.setArmStatus(body);
        ctx.status = 200;
        ctx.body = status;
    };

    public raiseIncident = async (ctx: Context): Promise<void> => {
        const body = RaiseIncidentRequestSchema.parse(ctx.request.body);
        const incident = await this.securityService.raiseIncident(body);
        ctx.status = 201;
        ctx.body = incident;
    };
}
