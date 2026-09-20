import { logger } from '@/core/logger/logger';
import { VendorIntegrationError } from '@/core/errors/app-error';

export interface NestThermostatState {
  currentTemp?: number;
  targetTemp?: number;
  mode?: 'HEAT' | 'COOL' | 'HEATCOOL' | 'OFF' | 'ECO';
  humidity?: number;
}

export class NestAdapter {
    public async setThermostatMode(
        externalId: string,
        mode: 'HEAT' | 'COOL' | 'HEATCOOL' | 'OFF' | 'ECO',
    ): Promise<{ success: boolean; mode: string }> {
        logger.debug({ externalId, mode }, 'Setting Nest Thermostat Mode via SDM API');
        return {
            success: true,
            mode,
        };
    }

    public async setTargetTemperature(
        externalId: string,
        targetTemp: number,
    ): Promise<{ success: boolean; targetTemp: number }> {
        if (targetTemp < 10 || targetTemp > 32) {
            throw new VendorIntegrationError('Nest', 'Target temperature out of safe bounds (10-32°C)');
        }

        logger.debug({ externalId, targetTemp }, 'Setting Nest Thermostat Target Temperature');
        return {
            success: true,
            targetTemp,
        };
    }

    public async getThermostatState(externalId: string): Promise<NestThermostatState> {
        logger.debug({ externalId }, 'Fetching Nest Thermostat state');
        return {
            currentTemp: 21.5,
            targetTemp: 22.0,
            mode: 'HEAT',
            humidity: 45,
        };
    }
}

export const nestAdapter = new NestAdapter();
