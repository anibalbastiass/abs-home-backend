import { describe, it, expect, vi } from 'vitest';
import { KafkaClientManager, kafkaManager } from '@/core/events/kafka-client';
import { KAFKA_TOPICS, DeviceStateChangedEvent } from '@/core/events/domain-events';

describe('Kafka Client Manager', () => {
    it('should have standard Kafka topics defined', () => {
        expect(KAFKA_TOPICS.DEVICE_EVENTS).toBe('abs.device.events');
        expect(KAFKA_TOPICS.AUTOMATION_EVENTS).toBe('abs.automation.events');
        expect(KAFKA_TOPICS.SECURITY_ALERTS).toBe('abs.security.alerts');
        expect(KAFKA_TOPICS.ENERGY_TELEMETRY).toBe('abs.energy.telemetry');
    });

    it('should gracefully handle publish when producer is not connected', async () => {
        const km = new KafkaClientManager();
        const event: DeviceStateChangedEvent = {
            eventId: 'evt_1',
            eventType: 'DEVICE_STATE_CHANGED',
            timestamp: new Date().toISOString(),
            source: 'unit-test',
            data: {
                deviceId: 'dev_1',
                vendor: 'HUE',
                deviceType: 'LIGHT',
                previousState: {},
                newState: { on: true },
                changedAttributes: ['on'],
            },
        };

        await expect(km.publishEvent(KAFKA_TOPICS.DEVICE_EVENTS, event)).resolves.toBeUndefined();
    });

    it('should connect producer, publish events, and disconnect', async () => {
        const km = new KafkaClientManager();
        const mockProducer: any = {
            connect: vi.fn().mockResolvedValue(undefined),
            send: vi.fn().mockResolvedValue([{ topicName: KAFKA_TOPICS.DEVICE_EVENTS, partition: 0, errorCode: 0 }]),
            disconnect: vi.fn().mockResolvedValue(undefined),
        };

        (km as any).producer = mockProducer;
        (km as any).isConnected = true;

        const event: DeviceStateChangedEvent = {
            eventId: 'evt_100',
            eventType: 'DEVICE_STATE_CHANGED',
            timestamp: new Date().toISOString(),
            source: 'unit-test',
            data: {
                deviceId: 'dev_1',
                vendor: 'HUE',
                deviceType: 'LIGHT',
                previousState: {},
                newState: { on: true },
                changedAttributes: ['on'],
            },
        };

        await km.publishEvent(KAFKA_TOPICS.DEVICE_EVENTS, event);
        expect(mockProducer.send).toHaveBeenCalled();

        await km.disconnect();
        expect(mockProducer.disconnect).toHaveBeenCalled();
    });

    it('should handle subscription and consumer message dispatching', async () => {
        const km = new KafkaClientManager();
        const mockConsumer: any = {
            connect: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockResolvedValue(undefined),
            run: vi.fn().mockImplementation(async ({ eachMessage }) => {
                await eachMessage({
                    topic: KAFKA_TOPICS.DEVICE_EVENTS,
                    partition: 0,
                    message: {
                        value: Buffer.from(
                            JSON.stringify({
                                eventId: 'evt_200',
                                eventType: 'DEVICE_STATE_CHANGED',
                                timestamp: new Date().toISOString(),
                                source: 'test',
                                data: {},
                            }),
                        ),
                    },
                });
            }),
            disconnect: vi.fn().mockResolvedValue(undefined),
        };

        (km as any).kafka = {
            consumer: vi.fn().mockReturnValue(mockConsumer),
            producer: vi.fn(),
        };

        const handler = vi.fn().mockResolvedValue(undefined);
        const consumer = await km.subscribeToTopic('test-group', KAFKA_TOPICS.DEVICE_EVENTS, handler);
        expect(consumer).toBeDefined();
        expect(handler).toHaveBeenCalled();
    });

    it('singleton kafkaManager should be exported', () => {
        expect(kafkaManager).toBeDefined();
    });
});
