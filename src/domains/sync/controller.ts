import { Context } from 'koa';
import { ForbiddenError, UnauthorizedError } from '@/core/errors/app-error';
import { SyncService } from './service';
import { SeedUserDataRequestSchema, UserIdSchema } from './schemas';
import { TokenVerifier } from './token-verifier';

export class SyncController {
    constructor(
        private readonly syncService: SyncService,
        private readonly tokenVerifier: TokenVerifier,
    ) {}

    public seed = async (ctx: Context): Promise<void> => {
        const tokenUserId = await this.authenticate(ctx);
        const request = SeedUserDataRequestSchema.parse(ctx.request.body);
        if (request.userId !== tokenUserId) throw new ForbiddenError('User ID does not match the token');

        ctx.body = await this.syncService.seedUserData(request);
        ctx.status = 200;
    };

    public getUserSnapshot = async (ctx: Context): Promise<void> => {
        const tokenUserId = await this.authenticate(ctx);
        const userId = UserIdSchema.parse(ctx.params.userId);
        if (userId !== tokenUserId) throw new ForbiddenError('User ID does not match the token');

        ctx.body = await this.syncService.getUserSnapshot(userId);
        ctx.status = 200;
    };

    private async authenticate(ctx: Context): Promise<string> {
        const authorization = ctx.get('Authorization');
        const match = /^Bearer ([^\s]+)$/.exec(authorization);
        if (!match) throw new UnauthorizedError('Firebase ID token required');
        return this.tokenVerifier.verify(match[1]);
    }
}
