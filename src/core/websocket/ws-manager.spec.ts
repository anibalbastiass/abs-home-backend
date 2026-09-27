import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import WebSocket from 'ws';
import { WsManager } from './ws-manager';
import { DeviceService } from '@/domains/devices/service';
import { BaseDomainEvent } from '../events/domain-events';

describe('WsManager', () => {
    let server: HttpServer;
    let wsManager: WsManager;
    let port: number;
    let mockDeviceService: Partial<DeviceService>;

    beforeEach(async () => {
        mockDeviceService = {
            executeCommand: vi.fn().mockResolvedValue({
                success: true,
                jobId: 'job-1',
                status: 'EXECUTED',
                message: 'Device action executed',
                updatedState: { power: 'ON' },
            }),
        };

        server = createServer();
        wsManager = new WsManager(mockDeviceService as DeviceService);

        await new Promise<void>((resolve) => {
            server.listen(0, '127.0.0.1', () => {
                port = (server.address() as AddressInfo).port;
                wsManager.attachToServer(server, '/ws/test');
                resolve();
            });
        });
    });

    afterEach(async () => {
        await wsManager.close();
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    const connectClient = (): Promise<{ ws: WebSocket; messages: any[] }> => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/test`);
            const messages: any[] = [];

            ws.on('message', (data) => {
                messages.push(JSON.parse(data.toString()));
            });

            ws.on('open', () => {
                // Wait small tick for initial CONNECTED msg
                setTimeout(() => resolve({ ws, messages }), 50);
            });

            ws.on('error', reject);
        });
    };

    it('should connect client and receive initial CONNECTED handshake', async () => {
        const { ws, messages } = await connectClient();
        expect(messages.length).toBeGreaterThanOrEqual(1);
        expect(messages[0]).toMatchObject({
            type: 'CONNECTED',
            serverVersion: '1.3.0',
        });
        expect(messages[0].clientId).toBeDefined();
        expect(wsManager.getConnectedClientCount()).toBe(1);
        ws.close();
    });

    it('should respond to PING with PONG', async () => {
        const { ws, messages } = await connectClient();
        messages.length = 0; // Clear welcome msg

        ws.send(JSON.stringify({ action: 'PING', timestamp: 123456 }));

        await new Promise((r) => setTimeout(r, 50));
        expect(messages.length).toBe(1);
        expect(messages[0]).toMatchObject({
            type: 'PONG',
        });
        expect(messages[0].timestamp).toBeTypeOf('number');
        ws.close();
    });

    it('should handle SUBSCRIBE and UNSUBSCRIBE actions', async () => {
        const { ws, messages } = await connectClient();
        messages.length = 0;

        ws.send(JSON.stringify({ action: 'SUBSCRIBE', topics: ['abs.device.events', 'abs.energy.telemetry'] }));
        await new Promise((r) => setTimeout(r, 50));

        expect(messages.length).toBe(1);
        expect(messages[0].type).toBe('SUBSCRIBED');
        expect(messages[0].topics).toContain('abs.device.events');
        expect(messages[0].topics).toContain('abs.energy.telemetry');

        messages.length = 0;
        ws.send(JSON.stringify({ action: 'UNSUBSCRIBE', topics: ['abs.energy.telemetry'] }));
        await new Promise((r) => setTimeout(r, 50));

        expect(messages.length).toBe(1);
        expect(messages[0].type).toBe('UNSUBSCRIBED');
        expect(messages[0].topics).not.toContain('abs.energy.telemetry');
        ws.close();
    });

    it('should handle EXECUTE_COMMAND and reply with COMMAND_ACK', async () => {
        const { ws, messages } = await connectClient();
        messages.length = 0;

        ws.send(
            JSON.stringify({
                action: 'EXECUTE_COMMAND',
                correlationId: 'test-cor-1',
                deviceId: 'dev-1',
                command: 'turnOn',
                params: { brightness: 100 },
            }),
        );

        await new Promise((r) => setTimeout(r, 50));
        expect(mockDeviceService.executeCommand).toHaveBeenCalledWith('dev-1', {
            action: 'turnOn',
            params: { brightness: 100 },
        });

        expect(messages.length).toBe(1);
        expect(messages[0]).toMatchObject({
            type: 'COMMAND_ACK',
            correlationId: 'test-cor-1',
            success: true,
            status: 'EXECUTED',
            updatedState: { power: 'ON' },
        });
        ws.close();
    });

    it('should handle EXECUTE_COMMAND failure gracefully', async () => {
        (mockDeviceService.executeCommand as any).mockRejectedValueOnce(new Error('Vendor timeout'));

        const { ws, messages } = await connectClient();
        messages.length = 0;

        ws.send(
            JSON.stringify({
                action: 'EXECUTE_COMMAND',
                correlationId: 'test-cor-err',
                deviceId: 'dev-2',
                command: 'turnOff',
            }),
        );

        await new Promise((r) => setTimeout(r, 50));
        expect(messages.length).toBe(1);
        expect(messages[0]).toMatchObject({
            type: 'COMMAND_ACK',
            correlationId: 'test-cor-err',
            success: false,
            status: 'FAILED',
            message: 'Vendor timeout',
        });
        ws.close();
    });

    it('should handle EXECUTE_COMMAND when deviceService is missing', async () => {
        const emptyWsMgr = new WsManager();
        const testWs = { readyState: WebSocket.OPEN, send: vi.fn() } as any;
        (emptyWsMgr as any).clients.set(testWs, { id: 'c1', subscriptions: new Set(), isAlive: true, connectedAt: new Date() });

        emptyWsMgr.handleMessage(
            testWs,
            Buffer.from(
                JSON.stringify({
                    action: 'EXECUTE_COMMAND',
                    correlationId: 'no-svc',
                    deviceId: 'dev-1',
                    command: 'toggle',
                }),
            ),
        );

        expect(testWs.send).toHaveBeenCalledWith(
            expect.stringContaining('Device control service unavailable'),
        );
    });

    it('should handle invalid JSON and unknown actions', async () => {
        const { ws, messages } = await connectClient();
        messages.length = 0;

        ws.send('invalid-json');
        await new Promise((r) => setTimeout(r, 50));

        expect(messages[0]).toMatchObject({
            type: 'ERROR',
            code: 'INVALID_JSON',
        });

        messages.length = 0;
        ws.send(JSON.stringify({ action: 'UNKNOWN_OP' }));
        await new Promise((r) => setTimeout(r, 50));

        expect(messages[0]).toMatchObject({
            type: 'ERROR',
            code: 'UNKNOWN_ACTION',
        });
        ws.close();
    });

    it('should broadcast domain events to subscribed clients only', async () => {
        const client1 = await connectClient();
        const client2 = await connectClient();

        // Client 1 subscribes to device events
        client1.ws.send(JSON.stringify({ action: 'SUBSCRIBE', topics: ['abs.device.events'] }));
        // Client 2 unsubscribes from wildcard and subscribes to security alerts only
        client2.ws.send(JSON.stringify({ action: 'UNSUBSCRIBE', topics: ['*'] }));
        client2.ws.send(JSON.stringify({ action: 'SUBSCRIBE', topics: ['abs.security.alerts'] }));

        await new Promise((r) => setTimeout(r, 50));
        client1.messages.length = 0;
        client2.messages.length = 0;

        const event: BaseDomainEvent = {
            eventId: 'evt-1',
            eventType: 'DEVICE_STATE_CHANGED',
            timestamp: new Date().toISOString(),
            source: 'hue',
            data: { deviceId: 'dev-1' },
        };

        const delivered = wsManager.broadcast('abs.device.events', event);
        expect(delivered).toBe(1);

        await new Promise((r) => setTimeout(r, 50));
        expect(client1.messages.length).toBe(1);
        expect(client1.messages[0]).toMatchObject({
            type: 'EVENT',
            topic: 'abs.device.events',
            event,
        });
        expect(client2.messages.length).toBe(0);

        client1.ws.close();
        client2.ws.close();
    });

    it('should terminate unresponsive clients during heartbeat', () => {
        vi.useFakeTimers();
        const mockWs = {
            readyState: WebSocket.OPEN,
            ping: vi.fn(),
            terminate: vi.fn(),
            close: vi.fn(),
        } as any;

        const mgr = new WsManager();
        (mgr as any).clients.set(mockWs, {
            id: 'dead-client',
            subscriptions: new Set(),
            isAlive: false, // Already false on heartbeat cycle
            connectedAt: new Date(),
        });

        (mgr as any).startHeartbeat(1000);
        vi.advanceTimersByTime(1100);

        expect(mockWs.terminate).toHaveBeenCalled();
        expect(mgr.getConnectedClientCount()).toBe(0);

        vi.useRealTimers();
    });
});
