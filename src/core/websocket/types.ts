import { BaseDomainEvent } from '../events/domain-events';

export type WsClientAction = 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'EXECUTE_COMMAND' | 'PING';

export interface WsClientSubscribeMessage {
    action: 'SUBSCRIBE';
    topics: string[];
}

export interface WsClientUnsubscribeMessage {
    action: 'UNSUBSCRIBE';
    topics: string[];
}

export interface WsClientCommandMessage {
    action: 'EXECUTE_COMMAND';
    correlationId: string;
    deviceId: string;
    command: string;
    params?: Record<string, unknown>;
}

export interface WsClientPingMessage {
    action: 'PING';
    timestamp?: number;
}

export type WsClientMessage =
    | WsClientSubscribeMessage
    | WsClientUnsubscribeMessage
    | WsClientCommandMessage
    | WsClientPingMessage;

export type WsServerMessageType =
    | 'CONNECTED'
    | 'PONG'
    | 'SUBSCRIBED'
    | 'UNSUBSCRIBED'
    | 'EVENT'
    | 'COMMAND_ACK'
    | 'ERROR';

export interface WsServerConnectedMessage {
    type: 'CONNECTED';
    clientId: string;
    timestamp: string;
    serverVersion: string;
}

export interface WsServerPongMessage {
    type: 'PONG';
    timestamp: number;
}

export interface WsServerSubscribedMessage {
    type: 'SUBSCRIBED';
    topics: string[];
}

export interface WsServerUnsubscribedMessage {
    type: 'UNSUBSCRIBED';
    topics: string[];
}

export interface WsServerEventMessage {
    type: 'EVENT';
    topic: string;
    event: BaseDomainEvent;
}

export interface WsServerCommandAckMessage {
    type: 'COMMAND_ACK';
    correlationId: string;
    success: boolean;
    status: 'QUEUED' | 'EXECUTED' | 'FAILED';
    message?: string;
    updatedState?: Record<string, unknown>;
}

export interface WsServerErrorMessage {
    type: 'ERROR';
    code: string;
    message: string;
    details?: unknown;
}

export type WsServerMessage =
    | WsServerConnectedMessage
    | WsServerPongMessage
    | WsServerSubscribedMessage
    | WsServerUnsubscribedMessage
    | WsServerEventMessage
    | WsServerCommandAckMessage
    | WsServerErrorMessage;
