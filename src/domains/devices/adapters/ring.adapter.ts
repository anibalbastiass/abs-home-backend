import { logger } from '@/core/logger/logger';
import { VendorIntegrationError } from '@/core/errors/app-error';

export interface RingDeviceStatus {
  battery: number;
  motionDetected: boolean;
  dingActive: boolean;
  firmware: string;
}

export class RingAdapter {
    public async getStatus(externalId: string): Promise<RingDeviceStatus> {
        logger.debug({ externalId }, 'Fetching Ring device status');
        return {
            battery: 90,
            motionDetected: false,
            dingActive: false,
            firmware: 'Up to Date',
        };
    }

    public async startLiveStream(externalId: string): Promise<{ sessionId: string; sdpOfferUrl: string }> {
        logger.debug({ externalId }, 'Initiating Ring Live WebRTC/SIP stream session');
        return {
            sessionId: `ring_stream_${Date.now()}`,
            sdpOfferUrl: `wss://api.ring.com/v1/stream/${externalId}`,
        };
    }

    public async triggerSiren(externalId: string, durationSeconds: number): Promise<{ success: boolean }> {
        if (durationSeconds > 120) {
            throw new VendorIntegrationError('Ring', 'Siren duration cannot exceed 120 seconds');
        }
        logger.warn({ externalId, durationSeconds }, '🚨 Triggering Ring Siren');
        return { success: true };
    }
}

export const ringAdapter = new RingAdapter();
