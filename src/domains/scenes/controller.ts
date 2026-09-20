import { Context } from 'koa';
import { SceneService } from './service';
import { CreateSceneRequestSchema } from './schemas';

export class SceneController {
    constructor(private readonly sceneService: SceneService) {}

    public list = async (ctx: Context): Promise<void> => {
        const homeId = ctx.query.homeId as string | undefined;
        const scenes = await this.sceneService.listScenes(homeId);
        ctx.status = 200;
        ctx.body = scenes;
    };

    public getById = async (ctx: Context): Promise<void> => {
        const id = ctx.params.id;
        const scene = await this.sceneService.getSceneById(id);
        ctx.status = 200;
        ctx.body = scene;
    };

    public create = async (ctx: Context): Promise<void> => {
        const body = CreateSceneRequestSchema.parse(ctx.request.body);
        const created = await this.sceneService.createScene(body);
        ctx.status = 201;
        ctx.body = created;
    };

    public trigger = async (ctx: Context): Promise<void> => {
        const id = ctx.params.id;
        const result = await this.sceneService.triggerScene(id);
        ctx.status = 200;
        ctx.body = result;
    };
}
