import { KafkaClientManager } from '../events/kafka-client';
import { BaseDomainEvent, KAFKA_TOPICS } from '../events/domain-events';
import { WsManager } from './ws-manager';
import { logger } from '../logger/logger';

export class WsEventBridge {
    private kafkaManager: KafkaClientManager;
    private wsManager: WsManager;
    private isStarted = false;

    constructor(kafkaManager: KafkaClientManager, wsManager: WsManager) {
        this.kafkaManager = kafkaManager;
        this.wsManager = wsManager;
    }

    public async start(): Promise<void> {
        if (this.isStarted) return;
        this.isStarted = true;

        const topics = [
            KAFKA_TOPICS.DEVICE_EVENTS,
            KAFKA_TOPICS.AUTOMATION_EVENTS,
            KAFKA_TOPICS.SECURITY_ALERTS,
            KAFKA_TOPICS.ENERGY_TELEMETRY,
        ];

        for (const topic of topics) {
            await this.kafkaManager.subscribeToTopic(
                'abs-websocket-bridge',
                topic,
                async (event: BaseDomainEvent) => {
                    this.onEventReceived(topic, event);
                },
            );
        }

        logger.info('🌉 WebSocket Event Bridge started and subscribed to Kafka domain topics');
    }

    public onEventReceived(topic: string, event: BaseDomainEvent): void {
        const count = this.wsManager.broadcast(topic, event);
        logger.debug(
            { topic, eventType: event.eventType, eventId: event.eventId, recipientCount: count },
            'Broadcasted domain event to WebSocket subscribers',
        );
    }
}
