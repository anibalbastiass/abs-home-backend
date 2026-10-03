import { Context } from 'koa';
import { ForbiddenError, UnauthorizedError } from '@/core/errors/app-error';
import { SyncService } from './service';
import { SeedUserDataRequestSchema, UserIdSchema } from './schemas';
import { TokenVerifier, VerifiedIdentity } from './token-verifier';

export class SyncController {
    constructor(
        private readonly syncService: SyncService,
        private readonly tokenVerifier: TokenVerifier,
    ) {}

    public seed = async (ctx: Context): Promise<void> => {
        const identity = await this.authenticate(ctx);
        const request = SeedUserDataRequestSchema.parse(ctx.request.body);
        if (!this.ownsUserId(identity, request.userId)) throw new ForbiddenError('User ID does not match the token');

        ctx.body = await this.syncService.seedUserData(request);
        ctx.status = 200;
    };

    public getUserSnapshot = async (ctx: Context): Promise<void> => {
        const identity = await this.authenticate(ctx);
        const userId = UserIdSchema.parse(ctx.params.userId);
        if (!this.ownsUserId(identity, userId)) throw new ForbiddenError('User ID does not match the token');

        ctx.body = await this.syncService.getUserSnapshot(userId);
        ctx.status = 200;
    };

    private ownsUserId(identity: VerifiedIdentity, userId: string): boolean {
        return identity.uid === userId || identity.googleUserIds.includes(userId);
    }

    private async authenticate(ctx: Context): Promise<VerifiedIdentity> {
        const authorization = ctx.get('Authorization');
        const match = /^Bearer ([^\s]+)$/.exec(authorization);
        if (!match) throw new UnauthorizedError('Firebase ID token required');
        return this.tokenVerifier.verify(match[1]);
    }
}
