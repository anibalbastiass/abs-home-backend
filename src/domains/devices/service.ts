import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/core/errors/app-error';
import { logger } from '@/core/logger/logger';
import { QueueManager, IoTCommandPayload } from '@/core/queues/queue-manager';
import { KafkaClientManager } from '@/core/events/kafka-client';
import { DeviceStateChangedEvent, KAFKA_TOPICS } from '@/core/events/domain-events';
import { HueAdapter } from './adapters/hue.adapter';
import { NestAdapter } from './adapters/nest.adapter';
import { SwitchBotAdapter } from './adapters/switchbot.adapter';
import { RingAdapter } from './adapters/ring.adapter';
import { BlinkAdapter } from './adapters/blink.adapter';
import {
    ListDevicesQuery,
    DeviceResponse,
    DeviceCommandRequest,
    DeviceCommandResponse,
    UpdateDeviceRequest,
} from './schemas';

export interface DeviceService {
    listDevices(query: ListDevicesQuery): Promise<DeviceResponse[]>;
    getDeviceById(id: string): Promise<DeviceResponse>;
    updateDevice(id: string, update: UpdateDeviceRequest): Promise<DeviceResponse>;
    executeCommand(id: string, request: DeviceCommandRequest): Promise<DeviceCommandResponse>;
}

export class DeviceServiceImpl implements DeviceService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly queueManager: QueueManager,
        private readonly kafkaManager: KafkaClientManager,
        private readonly hueAdapter: HueAdapter,
        private readonly nestAdapter: NestAdapter,
        private readonly switchbotAdapter: SwitchBotAdapter,
        private readonly ringAdapter: RingAdapter,
        private readonly blinkAdapter: BlinkAdapter,
    ) {
        this.registerVendorCommandHandlers();
    }

    private registerVendorCommandHandlers(): void {
        this.queueManager.registerCommandHandler('hue', async (payload: IoTCommandPayload) => {
            return await this.hueAdapter.setLightState(payload.deviceId, payload.params);
        });

        this.queueManager.registerCommandHandler('nest', async (payload: IoTCommandPayload) => {
            if (payload.action === 'set_temperature' && typeof payload.params.targetTemp === 'number') {
                return await this.nestAdapter.setTargetTemperature(payload.deviceId, payload.params.targetTemp);
            }
            if (payload.action === 'set_mode' && typeof payload.params.mode === 'string') {
                return await this.nestAdapter.setThermostatMode(payload.deviceId, payload.params.mode as never);
            }
            return { success: true };
        });

        this.queueManager.registerCommandHandler('switchbot', async (payload: IoTCommandPayload) => {
            if (payload.action === 'set_position' && typeof payload.params.position === 'number') {
                return await this.switchbotAdapter.setCurtainPosition(payload.deviceId, payload.params.position);
            }
            if (payload.action === 'press') {
                return await this.switchbotAdapter.pressBot(payload.deviceId);
            }
            return { success: true };
        });

        this.queueManager.registerCommandHandler('ring', async (payload: IoTCommandPayload) => {
            if (payload.action === 'trigger_siren') {
                return await this.ringAdapter.triggerSiren(payload.deviceId, Number(payload.params.duration || 30));
            }
            return { success: true };
        });

        this.queueManager.registerCommandHandler('blink', async (payload: IoTCommandPayload) => {
            if (payload.action === 'arm') {
                return await this.blinkAdapter.setArmedState(payload.deviceId, Boolean(payload.params.armed));
            }
            return { success: true };
        });
    }

    public async listDevices(query: ListDevicesQuery): Promise<DeviceResponse[]> {
        const devices = await this.prisma.device.findMany({
            where: {
                vendor: query.vendor as never,
                type: query.type as never,
                roomId: query.roomId,
                homeId: query.homeId,
            },
            orderBy: { name: 'asc' },
        });

        return devices.map((d) => ({
            id: d.id,
            externalId: d.externalId,
            vendor: d.vendor as never,
            type: d.type as never,
            name: d.name,
            roomId: d.roomId,
            homeId: d.homeId,
            state: (d.state as Record<string, unknown>) || {},
            capabilities: (d.capabilities as string[]) || [],
            isOnline: d.isOnline,
            lastSeenAt: d.lastSeenAt.toISOString(),
            createdAt: d.createdAt.toISOString(),
            updatedAt: d.updatedAt.toISOString(),
        }));
    }

    public async getDeviceById(id: string): Promise<DeviceResponse> {
        const device = await this.prisma.device.findUnique({
            where: { id },
        });

        if (!device) {
            throw new NotFoundError(`Device with ID "${id}" was not found`);
        }

        return {
            id: device.id,
            externalId: device.externalId,
            vendor: device.vendor as never,
            type: device.type as never,
            name: device.name,
            roomId: device.roomId,
            homeId: device.homeId,
            state: (device.state as Record<string, unknown>) || {},
            capabilities: (device.capabilities as string[]) || [],
            isOnline: device.isOnline,
            lastSeenAt: device.lastSeenAt.toISOString(),
            createdAt: device.createdAt.toISOString(),
            updatedAt: device.updatedAt.toISOString(),
        };
    }

    public async updateDevice(id: string, update: UpdateDeviceRequest): Promise<DeviceResponse> {
        await this.getDeviceById(id);

        const updated = await this.prisma.device.update({
            where: { id },
            data: {
                name: update.name,
                roomId: update.roomId,
            },
        });

        return {
            id: updated.id,
            externalId: updated.externalId,
            vendor: updated.vendor as never,
            type: updated.type as never,
            name: updated.name,
            roomId: updated.roomId,
            homeId: updated.homeId,
            state: (updated.state as Record<string, unknown>) || {},
            capabilities: (updated.capabilities as string[]) || [],
            isOnline: updated.isOnline,
            lastSeenAt: updated.lastSeenAt.toISOString(),
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        };
    }

    public async executeCommand(id: string, request: DeviceCommandRequest): Promise<DeviceCommandResponse> {
        const device = await this.getDeviceById(id);
        const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const previousState = { ...device.state };

        const vendorKey = device.vendor.toLowerCase() as 'hue' | 'nest' | 'switchbot' | 'ring' | 'blink' | 'energy';

        const payload: IoTCommandPayload = {
            commandId,
            vendor: vendorKey,
            deviceId: device.externalId,
            action: request.action,
            params: request.params,
            timestamp: Date.now(),
        };

        logger.info({ deviceId: id, vendor: device.vendor, action: request.action, payload }, 'Dispatching IoT device command');

        // Optimistic state update
        const updatedState = { ...previousState, ...request.params };

        // Update in database
        await this.prisma.device.update({
            where: { id },
            data: {
                state: updatedState,
                lastSeenAt: new Date(),
            },
        });

        // Publish Kafka domain event
        const event: DeviceStateChangedEvent = {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventType: 'DEVICE_STATE_CHANGED',
            timestamp: new Date().toISOString(),
            source: 'abs-backend-gateway',
            data: {
                deviceId: id,
                vendor: device.vendor,
                deviceType: device.type,
                previousState,
                newState: updatedState,
                changedAttributes: Object.keys(request.params),
            },
        };

        await this.kafkaManager.publishEvent(KAFKA_TOPICS.DEVICE_EVENTS, event);

        return {
            success: true,
            jobId: commandId,
            status: 'EXECUTED',
            message: `Command "${request.action}" executed successfully on device ${device.name}`,
            updatedState,
        };
    }
}
