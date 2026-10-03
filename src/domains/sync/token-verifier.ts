import { createVerify } from 'node:crypto';
import { UnauthorizedError } from '@/core/errors/app-error';

const FIREBASE_CERTS_URL =
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export interface TokenVerifier {
    verify(token: string): Promise<VerifiedIdentity>;
}

export type VerifiedIdentity = { uid: string; googleUserIds: string[] };

type CertificateCache = { values: Record<string, string>; expiresAt: number };

export class FirebaseTokenVerifier implements TokenVerifier {
    private cache: CertificateCache | null = null;

    constructor(
        private readonly projectId: string,
        private readonly fetchCertificates: typeof fetch = fetch,
    ) {}

    public async verify(token: string): Promise<VerifiedIdentity> {
        if (!this.projectId) throw new UnauthorizedError('Firebase authentication is not configured');

        const parts = token.split('.');
        if (parts.length !== 3) throw new UnauthorizedError('Invalid authentication token');

        try {
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as Record<string, unknown>;
            if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
                throw new UnauthorizedError('Invalid authentication token');
            }

            const certificates = await this.getCertificates();
            const certificate = certificates[header.kid];
            if (!certificate) throw new UnauthorizedError('Invalid authentication token');

            const verifier = createVerify('RSA-SHA256');
            verifier.update(`${parts[0]}.${parts[1]}`);
            verifier.end();
            if (!verifier.verify(certificate, Buffer.from(parts[2], 'base64url'))) {
                throw new UnauthorizedError('Invalid authentication token');
            }

            const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
            const now = Math.floor(Date.now() / 1000);
            if (
                claims.aud !== this.projectId ||
                claims.iss !== `https://securetoken.google.com/${this.projectId}` ||
                typeof claims.sub !== 'string' ||
                claims.sub.length === 0 ||
                claims.sub.length > 128 ||
                typeof claims.exp !== 'number' ||
                claims.exp <= now ||
                typeof claims.iat !== 'number' ||
                claims.iat > now ||
                typeof claims.auth_time !== 'number' ||
                claims.auth_time > now
            ) {
                throw new UnauthorizedError('Invalid authentication token');
            }
            const firebase = claims.firebase as Record<string, unknown> | undefined;
            const identities = firebase?.identities as Record<string, unknown> | undefined;
            const googleUserIds = Array.isArray(identities?.['google.com'])
                ? identities['google.com'].filter(
                    (value: unknown): value is string =>
                        typeof value === 'string' && value.length > 0 && value.length <= 128,
                )
                : [];
            return { uid: claims.sub, googleUserIds };
        } catch (error) {
            if (error instanceof UnauthorizedError) throw error;
            throw new UnauthorizedError('Invalid authentication token');
        }
    }

    private async getCertificates(): Promise<Record<string, string>> {
        if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.values;

        let response: Response;
        try {
            response = await this.fetchCertificates(FIREBASE_CERTS_URL);
        } catch {
            throw new UnauthorizedError('Authentication keys are unavailable');
        }
        if (!response.ok) throw new UnauthorizedError('Authentication keys are unavailable');

        const values = (await response.json()) as Record<string, unknown>;
        if (!values || typeof values !== 'object') {
            throw new UnauthorizedError('Authentication keys are unavailable');
        }
        const certificates = Object.fromEntries(
            Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
        );
        const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] ?? 300);
        this.cache = {
            values: certificates,
            expiresAt: Date.now() + Math.min(Math.max(maxAge, 0), 86_400) * 1000,
        };
        return certificates;
    }
}
