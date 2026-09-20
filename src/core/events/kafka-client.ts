import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { env } from '@/config/env';
import { logger } from '../logger/logger';
import { BaseDomainEvent } from './domain-events';

export class KafkaClientManager {
    private kafka: Kafka;
    private producer: Producer | null = null;
    private consumers: Map<string, Consumer> = new Map();
    private isConnected = false;

    constructor() {
        this.kafka = new Kafka({
            clientId: env.KAFKA_CLIENT_ID,
            brokers: env.KAFKA_BROKERS.split(',').map((b) => b.trim()),
            logLevel: env.NODE_ENV === 'test' ? logLevel.NOTHING : logLevel.ERROR,
            retry: {
                initialRetryTime: 300,
                retries: 5,
            },
        });
    }

    public async connectProducer(): Promise<void> {
        if (this.producer && this.isConnected) return;

        try {
            this.producer = this.kafka.producer({
                allowAutoTopicCreation: true,
                transactionTimeout: 30000,
            });

            await this.producer.connect();
            this.isConnected = true;
            logger.info('✅ Kafka / Redpanda producer connected successfully');
        } catch (err) {
            logger.warn({ err }, '⚠️ Kafka producer failed to connect (streaming degraded)');
            this.isConnected = false;
        }
    }

    public async publishEvent<T extends BaseDomainEvent<unknown>>(
        topic: string,
        event: T,
    ): Promise<void> {
        if (!this.producer || !this.isConnected) {
            logger.debug({ topic, eventType: event.eventType }, 'Kafka producer not connected, skipping publish');
            return;
        }

        try {
            await this.producer.send({
                topic,
                messages: [
                    {
                        key: event.eventId,
                        value: JSON.stringify(event),
                        headers: {
                            'event-type': event.eventType,
                            source: event.source,
                            timestamp: event.timestamp,
                        },
                    },
                ],
            });
            logger.debug({ topic, eventType: event.eventType, eventId: event.eventId }, 'Published domain event to Kafka');
        } catch (err) {
            logger.error({ err, topic, eventId: event.eventId }, 'Failed to publish domain event to Kafka');
        }
    }

    public async subscribeToTopic(
        groupId: string,
        topic: string,
        handler: (event: BaseDomainEvent) => Promise<void>,
    ): Promise<Consumer | null> {
        try {
            const consumer = this.kafka.consumer({ groupId });
            await consumer.connect();
            await consumer.subscribe({ topic, fromBeginning: false });

            await consumer.run({
                eachMessage: async ({ message }) => {
                    if (!message.value) return;
                    try {
                        const event = JSON.parse(message.value.toString()) as BaseDomainEvent;
                        await handler(event);
                    } catch (err) {
                        logger.error({ err, topic }, 'Error processing Kafka message');
                    }
                },
            });

            this.consumers.set(`${groupId}:${topic}`, consumer);
            logger.info({ groupId, topic }, 'Subscribed Kafka consumer');
            return consumer;
        } catch (err) {
            logger.warn({ err, groupId, topic }, '⚠️ Failed to subscribe Kafka consumer');
            return null;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.producer) {
                await this.producer.disconnect();
                this.isConnected = false;
            }
            for (const consumer of this.consumers.values()) {
                await consumer.disconnect();
            }
            this.consumers.clear();
            logger.info('Kafka client disconnected');
        } catch (err) {
            logger.error({ err }, 'Error disconnecting Kafka client');
        }
    }
}

export const kafkaManager = new KafkaClientManager();
