import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WsEventBridge } from './event-bridge';
import { KafkaClientManager } from '../events/kafka-client';
import { WsManager } from './ws-manager';
import { BaseDomainEvent, KAFKA_TOPICS } from '../events/domain-events';

describe('WsEventBridge', () => {
    let mockKafka: Partial<KafkaClientManager>;
    let mockWsManager: Partial<WsManager>;
    let bridge: WsEventBridge;
    let handlers: Map<string, (event: BaseDomainEvent) => Promise<void>>;

    beforeEach(() => {
        handlers = new Map();
        mockKafka = {
            subscribeToTopic: vi.fn().mockImplementation((groupId, topic, handler) => {
                handlers.set(topic, handler);
                return Promise.resolve({} as any);
            }),
        };
        mockWsManager = {
            broadcast: vi.fn().mockReturnValue(2),
        };

        bridge = new WsEventBridge(mockKafka as KafkaClientManager, mockWsManager as WsManager);
    });

    it('should subscribe to all domain Kafka topics upon start', async () => {
        await bridge.start();

        expect(mockKafka.subscribeToTopic).toHaveBeenCalledWith(
            'abs-websocket-bridge',
            KAFKA_TOPICS.DEVICE_EVENTS,
            expect.any(Function),
        );
        expect(mockKafka.subscribeToTopic).toHaveBeenCalledWith(
            'abs-websocket-bridge',
            KAFKA_TOPICS.AUTOMATION_EVENTS,
            expect.any(Function),
        );
        expect(mockKafka.subscribeToTopic).toHaveBeenCalledWith(
            'abs-websocket-bridge',
            KAFKA_TOPICS.SECURITY_ALERTS,
            expect.any(Function),
        );
        expect(mockKafka.subscribeToTopic).toHaveBeenCalledWith(
            'abs-websocket-bridge',
            KAFKA_TOPICS.ENERGY_TELEMETRY,
            expect.any(Function),
        );

        // Calling start again should be a no-op
        await bridge.start();
        expect(mockKafka.subscribeToTopic).toHaveBeenCalledTimes(4);
    });

    it('should forward received Kafka event to WsManager.broadcast', async () => {
        await bridge.start();

        const handler = handlers.get(KAFKA_TOPICS.DEVICE_EVENTS);
        expect(handler).toBeDefined();

        const event: BaseDomainEvent = {
            eventId: 'evt-test-1',
            eventType: 'DEVICE_STATE_CHANGED',
            timestamp: new Date().toISOString(),
            source: 'switchbot',
            data: { deviceId: 'bot-1', newState: { power: 'ON' } },
        };

        await handler!(event);

        expect(mockWsManager.broadcast).toHaveBeenCalledWith(KAFKA_TOPICS.DEVICE_EVENTS, event);
    });
});
