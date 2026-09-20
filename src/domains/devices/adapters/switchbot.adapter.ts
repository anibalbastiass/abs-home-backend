import crypto from 'crypto';
import { logger } from '@/core/logger/logger';
import { VendorIntegrationError } from '@/core/errors/app-error';

export interface SwitchBotHeaders {
  Authorization: string;
  sign: string;
  nonce: string;
  t: string;
}

export class SwitchBotAdapter {
    private openToken: string;
    private secretKey: string;

    constructor(openToken = 'mock_switchbot_token', secretKey = 'mock_switchbot_secret') {
        this.openToken = openToken;
        this.secretKey = secretKey;
    }

    public generateAuthHeaders(): SwitchBotHeaders {
        const t = Date.now().toString();
        const nonce = crypto.randomUUID();
        const data = this.openToken + t + nonce;
        const sign = crypto
            .createHmac('sha256', this.secretKey)
            .update(Buffer.from(data, 'utf-8'))
            .digest('base64');

        return {
            Authorization: this.openToken,
            sign,
            nonce,
            t,
        };
    }

    public async setCurtainPosition(
        externalId: string,
        position: number, // 0 = closed, 100 = open
    ): Promise<{ success: boolean; position: number }> {
        if (position < 0 || position > 100) {
            throw new VendorIntegrationError('SwitchBot', 'Curtain position must be between 0 and 100');
        }

        logger.debug({ externalId, position }, 'Sending SwitchBot Curtain position command');
        return {
            success: true,
            position,
        };
    }

    public async pressBot(externalId: string): Promise<{ success: boolean }> {
        logger.debug({ externalId }, 'Sending SwitchBot Bot press command');
        return { success: true };
    }

    public async getStatus(externalId: string): Promise<Record<string, unknown>> {
        logger.debug({ externalId }, 'Fetching SwitchBot device status');
        return {
            battery: 95,
            position: 100,
            isMoving: false,
        };
    }
}

export const switchbotAdapter = new SwitchBotAdapter();
