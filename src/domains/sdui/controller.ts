import { Context } from 'koa';
import { SduiService } from './service';

export class SduiController {
    constructor(private readonly sduiService: SduiService) {}

    public getDashboard = async (ctx: Context): Promise<void> => {
        const homeId = (ctx.query.homeId as string) || 'default-home';
        const layout = await this.sduiService.getDashboardLayout(homeId);
        ctx.status = 200;
        ctx.body = layout;
    };
}
