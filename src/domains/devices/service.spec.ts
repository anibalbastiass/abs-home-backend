import { describe, it, expect, vi } from 'vitest';
import { DeviceServiceImpl } from './service';
import { HueAdapter } from './adapters/hue.adapter';
import { NestAdapter } from './adapters/nest.adapter';
import { SwitchBotAdapter } from './adapters/switchbot.adapter';
import { RingAdapter } from './adapters/ring.adapter';
import { BlinkAdapter } from './adapters/blink.adapter';
import { QueueManager } from '@/core/queues/queue-manager';
import { KafkaClientManager } from '@/core/events/kafka-client';
import { NotFoundError } from '@/core/errors/app-error';
import { createDeviceFixture } from '@/test/fixtures';

describe('DeviceServiceImpl', () => {
    const mockPrisma: any = {
        device: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    };

    const mockQueueManager = new QueueManager();
    const mockKafkaManager = new KafkaClientManager();
    const hueAdapter = new HueAdapter();
    const nestAdapter = new NestAdapter();
    const switchbotAdapter = new SwitchBotAdapter();
    const ringAdapter = new RingAdapter();
    const blinkAdapter = new BlinkAdapter();

    const service = new DeviceServiceImpl(
        mockPrisma,
        mockQueueManager,
        mockKafkaManager,
        hueAdapter,
        nestAdapter,
        switchbotAdapter,
        ringAdapter,
        blinkAdapter,
    );

    it('should list devices using fixture data', async () => {
        const fixture = createDeviceFixture();
        mockPrisma.device.findMany.mockResolvedValueOnce([fixture]);

        const result = await service.listDevices({ vendor: 'HUE' });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(fixture.id);
        expect(result[0].name).toBe(fixture.name);
    });

    it('should throw NotFoundError for nonexistent device', async () => {
        mockPrisma.device.findUnique.mockResolvedValueOnce(null);

        await expect(service.getDeviceById('nonexistent_id')).rejects.toThrow(NotFoundError);
    });

    it('should update device metadata using fixture data', async () => {
        const fixture = createDeviceFixture({ name: 'Old Name' });
        const updatedFixture = createDeviceFixture({ name: 'New Name' });

        mockPrisma.device.findUnique.mockResolvedValueOnce(fixture);
        mockPrisma.device.update.mockResolvedValueOnce(updatedFixture);

        const updated = await service.updateDevice(fixture.id, { name: 'New Name' });
        expect(updated.name).toBe('New Name');
    });

    it('should execute command on device and update state using fixture data', async () => {
        const fixture = createDeviceFixture({ state: { on: false } });

        mockPrisma.device.findUnique.mockResolvedValueOnce(fixture);
        mockPrisma.device.update.mockResolvedValueOnce(fixture);

        const res = await service.executeCommand(fixture.id, {
            action: 'turn_on',
            params: { on: true, brightness: 100 },
        });

        expect(res.success).toBe(true);
        expect(res.status).toBe('EXECUTED');
        expect(res.updatedState).toEqual({ on: true, brightness: 100 });
    });

    it('should trigger registered vendor queue handlers for all vendors', async () => {
        const handlers = (mockQueueManager as any).commandHandlers;

        // Hue handler
        const hueHandler = handlers.get('hue');
        const hueRes = await hueHandler({ commandId: '1', vendor: 'hue', deviceId: 'h1', action: 'set', params: { on: true } });
        expect(hueRes.success).toBe(true);

        // Nest handler
        const nestHandler = handlers.get('nest');
        const nestTempRes = await nestHandler({ commandId: '2', vendor: 'nest', deviceId: 'n1', action: 'set_temperature', params: { targetTemp: 23 } });
        expect(nestTempRes.success).toBe(true);
        const nestModeRes = await nestHandler({ commandId: '3', vendor: 'nest', deviceId: 'n1', action: 'set_mode', params: { mode: 'HEAT' } });
        expect(nestModeRes.success).toBe(true);
        const nestOtherRes = await nestHandler({ commandId: '4', vendor: 'nest', deviceId: 'n1', action: 'other', params: {} });
        expect(nestOtherRes.success).toBe(true);

        // SwitchBot handler
        const sbHandler = handlers.get('switchbot');
        const sbCurtainRes = await sbHandler({ commandId: '5', vendor: 'switchbot', deviceId: 's1', action: 'set_position', params: { position: 80 } });
        expect(sbCurtainRes.success).toBe(true);
        const sbPressRes = await sbHandler({ commandId: '6', vendor: 'switchbot', deviceId: 's1', action: 'press', params: {} });
        expect(sbPressRes.success).toBe(true);

        // Ring handler
        const ringHandler = handlers.get('ring');
        const ringSirenRes = await ringHandler({ commandId: '7', vendor: 'ring', deviceId: 'r1', action: 'trigger_siren', params: { duration: 10 } });
        expect(ringSirenRes.success).toBe(true);

        // Blink handler
        const blinkHandler = handlers.get('blink');
        const blinkArmRes = await blinkHandler({ commandId: '8', vendor: 'blink', deviceId: 'b1', action: 'arm', params: { armed: true } });
        expect(blinkArmRes.success).toBe(true);
    });
});
