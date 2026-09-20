import { describe, it, expect } from 'vitest';
import { HueAdapter } from '@/domains/devices/adapters/hue.adapter';
import { NestAdapter } from '@/domains/devices/adapters/nest.adapter';
import { SwitchBotAdapter } from '@/domains/devices/adapters/switchbot.adapter';
import { RingAdapter } from '@/domains/devices/adapters/ring.adapter';
import { BlinkAdapter } from '@/domains/devices/adapters/blink.adapter';

describe('IoT Vendor Adapters', () => {
    describe('HueAdapter', () => {
        const adapter = new HueAdapter();

        it('should successfully set valid light state', async () => {
            const res = await adapter.setLightState('light_1', { on: true, brightness: 75 });
            expect(res.success).toBe(true);
            expect(res.state.brightness).toBe(75);
        });

        it('should throw error on invalid brightness > 100', async () => {
            await expect(adapter.setLightState('light_1', { brightness: 150 })).rejects.toThrow(
                'Brightness must be between 0 and 100',
            );
        });

        it('should fetch light state', async () => {
            const state = await adapter.getLightState('light_1');
            expect(state.on).toBe(true);
            expect(state.brightness).toBe(80);
        });
    });

    describe('NestAdapter', () => {
        const adapter = new NestAdapter();

        it('should set thermostat mode', async () => {
            const res = await adapter.setThermostatMode('nest_1', 'HEAT');
            expect(res.success).toBe(true);
            expect(res.mode).toBe('HEAT');
        });

        it('should set valid target temperature', async () => {
            const res = await adapter.setTargetTemperature('nest_1', 22.5);
            expect(res.success).toBe(true);
            expect(res.targetTemp).toBe(22.5);
        });

        it('should reject unsafe temperature', async () => {
            await expect(adapter.setTargetTemperature('nest_1', 45)).rejects.toThrow(
                'Target temperature out of safe bounds',
            );
        });

        it('should fetch thermostat state', async () => {
            const state = await adapter.getThermostatState('nest_1');
            expect(state.currentTemp).toBe(21.5);
        });
    });

    describe('SwitchBotAdapter', () => {
        const adapter = new SwitchBotAdapter();

        it('should generate HMAC SHA-256 headers', () => {
            const headers = adapter.generateAuthHeaders();
            expect(headers.Authorization).toBeDefined();
            expect(headers.sign).toBeDefined();
            expect(headers.nonce).toBeDefined();
            expect(headers.t).toBeDefined();
        });

        it('should set curtain position', async () => {
            const res = await adapter.setCurtainPosition('curtain_1', 50);
            expect(res.success).toBe(true);
            expect(res.position).toBe(50);
        });

        it('should reject invalid curtain position', async () => {
            await expect(adapter.setCurtainPosition('curtain_1', 120)).rejects.toThrow(
                'Curtain position must be between 0 and 100',
            );
        });

        it('should press bot', async () => {
            const res = await adapter.pressBot('bot_1');
            expect(res.success).toBe(true);
        });

        it('should fetch status', async () => {
            const status = await adapter.getStatus('curtain_1');
            expect(status.battery).toBe(95);
        });
    });

    describe('RingAdapter', () => {
        const adapter = new RingAdapter();

        it('should fetch status', async () => {
            const status = await adapter.getStatus('doorbell_1');
            expect(status.battery).toBe(90);
        });

        it('should start live stream session', async () => {
            const res = await adapter.startLiveStream('doorbell_1');
            expect(res.sessionId).toBeDefined();
            expect(res.sdpOfferUrl).toContain('wss://api.ring.com');
        });

        it('should trigger siren', async () => {
            const res = await adapter.triggerSiren('cam_1', 30);
            expect(res.success).toBe(true);
        });

        it('should reject excessive siren duration', async () => {
            await expect(adapter.triggerSiren('cam_1', 300)).rejects.toThrow(
                'Siren duration cannot exceed 120 seconds',
            );
        });
    });

    describe('BlinkAdapter', () => {
        const adapter = new BlinkAdapter();

        it('should authenticate', async () => {
            const token = await adapter.authenticate('test@abshome.dev', 'pass');
            expect(token).toContain('blink_auth_');
        });

        it('should set armed state', async () => {
            const res = await adapter.setArmedState('net_1', true);
            expect(res.success).toBe(true);
            expect(res.armed).toBe(true);
        });

        it('should get thumbnail', async () => {
            const res = await adapter.getThumbnail('net_1', 'cam_1');
            expect(res.thumbnailUrl).toContain('https://media.blink.com');
        });

        it('should start liveview', async () => {
            const res = await adapter.startLiveView('net_1', 'cam_1');
            expect(res.rtspUrl).toContain('rtsps://');
        });
    });
});
