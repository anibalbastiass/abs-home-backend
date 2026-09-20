import { z } from 'zod';
import { openApiRegistry } from '@/core/openapi/registry';

export const DeviceVendorEnum = z.enum(['HUE', 'NEST', 'SWITCHBOT', 'RING', 'BLINK', 'ENERGY_METER', 'CUSTOM']);
export const DeviceTypeEnum = z.enum([
    'LIGHT',
    'THERMOSTAT',
    'CURTAIN',
    'BOT',
    'CAMERA',
    'DOORBELL',
    'PLUG',
    'SENSOR',
    'ENERGY_METER',
]);

export const DeviceResponseSchema = z.object({
    id: z.string().uuid(),
    externalId: z.string(),
    vendor: DeviceVendorEnum,
    type: DeviceTypeEnum,
    name: z.string(),
    roomId: z.string().uuid().nullable().optional(),
    homeId: z.string().uuid(),
    state: z.record(z.any()),
    capabilities: z.array(z.string()),
    isOnline: z.boolean(),
    lastSeenAt: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const ListDevicesQuerySchema = z.object({
    vendor: DeviceVendorEnum.optional(),
    type: DeviceTypeEnum.optional(),
    roomId: z.string().uuid().optional(),
    homeId: z.string().uuid().optional(),
});

export const DeviceCommandRequestSchema = z.object({
    action: z.string().min(1).describe('Command action name, e.g., set_state, turn_on, set_temperature, close'),
    params: z.record(z.any()).default({}).describe('Parameters for the action'),
});

export const DeviceCommandResponseSchema = z.object({
    success: z.boolean(),
    jobId: z.string(),
    status: z.enum(['QUEUED', 'EXECUTED']),
    message: z.string(),
    updatedState: z.record(z.any()).optional(),
});

export const UpdateDeviceRequestSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    roomId: z.string().uuid().nullable().optional(),
});

export type DeviceResponse = z.infer<typeof DeviceResponseSchema>;
export type ListDevicesQuery = z.infer<typeof ListDevicesQuerySchema>;
export type DeviceCommandRequest = z.infer<typeof DeviceCommandRequestSchema>;
export type DeviceCommandResponse = z.infer<typeof DeviceCommandResponseSchema>;
export type UpdateDeviceRequest = z.infer<typeof UpdateDeviceRequestSchema>;

openApiRegistry.register('Device', DeviceResponseSchema);
openApiRegistry.register('DeviceCommandRequest', DeviceCommandRequestSchema);
openApiRegistry.register('DeviceCommandResponse', DeviceCommandResponseSchema);

openApiRegistry.registerPath({
    method: 'get',
    path: '/devices',
    tags: ['Devices'],
    summary: 'List all smart home devices',
    description: 'Retrieves all unified smart devices across all IoT vendors with filtering.',
    request: {
        query: ListDevicesQuerySchema,
    },
    responses: {
        200: {
            description: 'List of devices retrieved successfully',
            content: {
                'application/json': {
                    schema: z.array(DeviceResponseSchema),
                },
            },
        },
    },
});

openApiRegistry.registerPath({
    method: 'get',
    path: '/devices/{id}',
    tags: ['Devices'],
    summary: 'Get single device details',
    description: 'Fetches device details, current cached state, and supported capabilities.',
    request: {
        params: z.object({ id: z.string().uuid() }),
    },
    responses: {
        200: {
            description: 'Device found',
            content: {
                'application/json': {
                    schema: DeviceResponseSchema,
                },
            },
        },
        404: {
            description: 'Device not found',
        },
    },
});

openApiRegistry.registerPath({
    method: 'post',
    path: '/devices/{id}/command',
    tags: ['Devices'],
    summary: 'Execute IoT command on device',
    description: 'Enqueues command into BullMQ rate-limited worker and updates device state.',
    request: {
        params: z.object({ id: z.string().uuid() }),
        body: {
            content: {
                'application/json': {
                    schema: DeviceCommandRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Command executed or queued successfully',
            content: {
                'application/json': {
                    schema: DeviceCommandResponseSchema,
                },
            },
        },
        404: {
            description: 'Device not found',
        },
        422: {
            description: 'Invalid command payload',
        },
    },
});
