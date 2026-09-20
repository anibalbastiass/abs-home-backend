import { Context } from 'koa';
import { AutomationService } from './service';
import { CreateAutomationRequestSchema } from './schemas';

export class AutomationController {
    constructor(private readonly automationService: AutomationService) {}

    public list = async (ctx: Context): Promise<void> => {
        const homeId = ctx.query.homeId as string | undefined;
        const automations = await this.automationService.listAutomations(homeId);
        ctx.status = 200;
        ctx.body = automations;
    };

    public getById = async (ctx: Context): Promise<void> => {
        const id = ctx.params.id;
        const automation = await this.automationService.getAutomationById(id);
        ctx.status = 200;
        ctx.body = automation;
    };

    public create = async (ctx: Context): Promise<void> => {
        const body = CreateAutomationRequestSchema.parse(ctx.request.body);
        const created = await this.automationService.createAutomation(body);
        ctx.status = 201;
        ctx.body = created;
    };

    public execute = async (ctx: Context): Promise<void> => {
        const id = ctx.params.id;
        const result = await this.automationService.executeAutomation(id);
        ctx.status = 200;
        ctx.body = result;
    };
}
