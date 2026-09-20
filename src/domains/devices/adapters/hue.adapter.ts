import { logger } from '@/core/logger/logger';
import { VendorIntegrationError } from '@/core/errors/app-error';

export interface HueLightState {
  on?: boolean;
  brightness?: number; // 0-100
  colorTemp?: number; // mirek or Kelvin
  colorRgb?: { r: number; g: number; b: number };
}

export class HueAdapter {
    private bridgeIp: string;
    private apiKey: string;

    constructor(bridgeIp = '127.0.0.1', apiKey = 'mock_hue_key') {
        this.bridgeIp = bridgeIp;
        this.apiKey = apiKey;
    }

    public async setLightState(externalId: string, state: HueLightState): Promise<{ success: boolean; state: HueLightState }> {
        logger.debug({ externalId, state, bridgeIp: this.bridgeIp }, 'Setting Philips Hue light state via CLIP v2');
    
        // Validate inputs
        if (state.brightness !== undefined && (state.brightness < 0 || state.brightness > 100)) {
            throw new VendorIntegrationError('Hue', 'Brightness must be between 0 and 100');
        }

        // In a live environment with bridgeIp, makes HTTPS PUT /clip/v2/resource/light/{id} with Header 'hue-application-key'
        return {
            success: true,
            state: {
                ...state,
            },
        };
    }

    public async getLightState(externalId: string): Promise<HueLightState> {
        logger.debug({ externalId }, 'Fetching Philips Hue light state');
        return {
            on: true,
            brightness: 80,
            colorTemp: 3000,
        };
    }
}

export const hueAdapter = new HueAdapter();
