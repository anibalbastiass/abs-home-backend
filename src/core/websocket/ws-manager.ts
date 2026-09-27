import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { randomUUID } from 'crypto';
import { logger } from '../logger/logger';
import { BaseDomainEvent } from '../events/domain-events';
import {
    WsClientMessage,
    WsServerMessage,
    WsServerConnectedMessage,
    WsServerPongMessage,
    WsServerSubscribedMessage,
    WsServerUnsubscribedMessage,
    WsServerEventMessage,
    WsServerErrorMessage,
} from './types';
import { DeviceService } from '@/domains/devices/service';

export interface ClientConnectionContext {
    id: string;
    subscriptions: Set<string>;
    isAlive: boolean;
    connectedAt: Date;
    ip?: string;
}

export class WsManager {
    private wss: WebSocketServer | null = null;
    private clients: Map<WebSocket, ClientConnectionContext> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private deviceService?: DeviceService;

    constructor(deviceService?: DeviceService) {
        this.deviceService = deviceService;
    }

    public attachToServer(server: HttpServer, path = '/ws/events'): void {
        this.wss = new WebSocketServer({ server, path });

        this.wss.on('connection', (ws: WebSocket, req) => {
            const clientId = randomUUID();
            const ip = req.socket.remoteAddress;
            const context: ClientConnectionContext = {
                id: clientId,
                subscriptions: new Set(['*']), // Default subscribe to all events or explicit
                isAlive: true,
                connectedAt: new Date(),
                ip,
            };

            this.clients.set(ws, context);
            logger.info({ clientId, ip, path }, '🔌 WebSocket client connected');

            // Send initial welcome/connected handshake
            const welcomeMsg: WsServerConnectedMessage = {
                type: 'CONNECTED',
                clientId,
                timestamp: new Date().toISOString(),
                serverVersion: '1.3.0',
            };
            this.send(ws, welcomeMsg);

            ws.on('pong', () => {
                const ctx = this.clients.get(ws);
                if (ctx) ctx.isAlive = true;
            });

            ws.on('message', (data: RawData) => {
                this.handleMessage(ws, data);
            });

            ws.on('close', (code, reason) => {
                logger.info({ clientId, code, reason: reason.toString() }, '🔌 WebSocket client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (err) => {
                logger.error({ clientId, err }, '⚠️ WebSocket client error');
            });
        });

        this.startHeartbeat();
        logger.info({ path }, '✅ WebSocket Server attached and listening');
    }

    public setDeviceService(deviceService: DeviceService): void {
        this.deviceService = deviceService;
    }

    public handleMessage(ws: WebSocket, data: RawData): void {
        const ctx = this.clients.get(ws);
        if (!ctx) return;
        ctx.isAlive = true;

        let parsed: WsClientMessage;
        try {
            parsed = JSON.parse(data.toString()) as WsClientMessage;
        } catch {
            const errorMsg: WsServerErrorMessage = {
                type: 'ERROR',
                code: 'INVALID_JSON',
                message: 'Failed to parse JSON payload',
            };
            this.send(ws, errorMsg);
            return;
        }

        switch (parsed.action) {
            case 'PING': {
                const pong: WsServerPongMessage = {
                    type: 'PONG',
                    timestamp: Date.now(),
                };
                this.send(ws, pong);
                break;
            }

            case 'SUBSCRIBE': {
                if (Array.isArray(parsed.topics)) {
                    parsed.topics.forEach((t) => ctx.subscriptions.add(t));
                }
                const subAck: WsServerSubscribedMessage = {
                    type: 'SUBSCRIBED',
                    topics: Array.from(ctx.subscriptions),
                };
                this.send(ws, subAck);
                break;
            }

            case 'UNSUBSCRIBE': {
                if (Array.isArray(parsed.topics)) {
                    parsed.topics.forEach((t) => ctx.subscriptions.delete(t));
                }
                const unsubAck: WsServerUnsubscribedMessage = {
                    type: 'UNSUBSCRIBED',
                    topics: Array.from(ctx.subscriptions),
                };
                this.send(ws, unsubAck);
                break;
            }

            case 'EXECUTE_COMMAND': {
                this.handleExecuteCommand(ws, parsed);
                break;
            }

            default: {
                const unknownMsg: WsServerErrorMessage = {
                    type: 'ERROR',
                    code: 'UNKNOWN_ACTION',
                    message: `Unknown action: ${(parsed as any).action}`,
                };
                this.send(ws, unknownMsg);
            }
        }
    }

    private async handleExecuteCommand(ws: WebSocket, msg: WsClientMessage & { action: 'EXECUTE_COMMAND' }): Promise<void> {
        const { correlationId, deviceId, command, params } = msg;

        if (!this.deviceService) {
            this.send(ws, {
                type: 'COMMAND_ACK',
                correlationId,
                success: false,
                status: 'FAILED',
                message: 'Device control service unavailable',
            });
            return;
        }

        try {
            const result = await this.deviceService.executeCommand(deviceId, {
                action: command,
                params: params || {},
            });

            this.send(ws, {
                type: 'COMMAND_ACK',
                correlationId,
                success: result.success,
                status: result.status,
                message: result.message,
                updatedState: result.updatedState,
            });
        } catch (err: any) {
            this.send(ws, {
                type: 'COMMAND_ACK',
                correlationId,
                success: false,
                status: 'FAILED',
                message: err?.message || 'Execution error',
            });
        }
    }

    public broadcast(topic: string, event: BaseDomainEvent): number {
        const msg: WsServerEventMessage = {
            type: 'EVENT',
            topic,
            event,
        };
        const payload = JSON.stringify(msg);
        let deliveredCount = 0;

        for (const [ws, ctx] of this.clients.entries()) {
            if (ws.readyState === WebSocket.OPEN) {
                if (ctx.subscriptions.has('*') || ctx.subscriptions.has(topic)) {
                    ws.send(payload);
                    deliveredCount++;
                }
            }
        }

        return deliveredCount;
    }

    public send(ws: WebSocket, message: WsServerMessage): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    public getConnectedClientCount(): number {
        return this.clients.size;
    }

    public getClients(): ClientConnectionContext[] {
        return Array.from(this.clients.values());
    }

    private startHeartbeat(intervalMs = 30000): void {
        this.heartbeatInterval = setInterval(() => {
            for (const [ws, ctx] of this.clients.entries()) {
                if (!ctx.isAlive) {
                    logger.warn({ clientId: ctx.id }, 'Closing unresponsive WebSocket client');
                    ws.terminate();
                    this.clients.delete(ws);
                    continue;
                }
                ctx.isAlive = false;
                ws.ping();
            }
        }, intervalMs);

        if (this.heartbeatInterval.unref) {
            this.heartbeatInterval.unref();
        }
    }

    public close(): Promise<void> {
        return new Promise((resolve) => {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }

            for (const [ws] of this.clients.entries()) {
                ws.close(1001, 'Server shutting down');
            }
            this.clients.clear();

            if (this.wss) {
                this.wss.close(() => {
                    this.wss = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

export const wsManager = new WsManager();
