import { z } from 'zod';
import { openApiRegistry } from '@/core/openapi/registry';

export const SDUIActionTypeEnum = z.enum([
    'NAVIGATE',
    'EXECUTE_COMMAND',
    'ARM_SECURITY',
    'TRIGGER_AUTOMATION',
    'REFRESH',
    'OPEN_URL',
]);

export const SDUIActionSchema = z.object({
    type: SDUIActionTypeEnum,
    target: z.string().optional(),
    deviceId: z.string().optional(),
    command: z.string().optional(),
    params: z.record(z.any()).optional(),
});

export const SDUIComponentTypeEnum = z.enum([
    'WEATHER_HEADER',
    'SECURITY_STATUS',
    'STAT_TILE',
    'DEVICE_CARD',
    'THERMOSTAT_DIAL',
    'CAMERA_TILE',
    'SHORTCUT_BUTTON',
    'AUTOMATION_ROW',
]);

export const SDUIComponentSchema = z.object({
    id: z.string(),
    type: SDUIComponentTypeEnum,
    // Polymorphic props
    label: z.string().optional(),
    value: z.string().optional(),
    unit: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    secondaryLabel: z.string().optional(),
    deviceId: z.string().optional(),
    vendor: z.string().optional(),
    deviceType: z.string().optional(),
    name: z.string().optional(),
    subtitle: z.string().optional(),
    isOn: z.boolean().optional(),
    isOnline: z.boolean().optional(),
    batteryPercent: z.number().optional(),
    temperature: z.number().optional(),
    ambientTemp: z.number().optional(),
    targetTemp: z.number().optional(),
    mode: z.string().optional(),
    isEco: z.boolean().optional(),
    minTemp: z.number().optional(),
    maxTemp: z.number().optional(),
    locationName: z.string().optional(),
    conditionText: z.string().optional(),
    conditionIcon: z.string().optional(),
    humidity: z.number().optional(),
    windSpeed: z.number().optional(),
    feelsLike: z.number().optional(),
    armStatus: z.string().optional(),
    activeAlertsCount: z.number().optional(),
    badgeText: z.string().optional(),
    snapshotUrl: z.string().optional(),
    isLive: z.boolean().optional(),
    isArmed: z.boolean().optional(),
    variant: z.string().optional(),
    automationId: z.string().optional(),
    triggerType: z.string().optional(),
    isEnabled: z.boolean().optional(),
    action: SDUIActionSchema.optional(),
    primaryAction: SDUIActionSchema.optional(),
    secondaryAction: SDUIActionSchema.optional(),
    actions: z.array(SDUIActionSchema).optional(),
});

export const SDUISectionTypeEnum = z.enum([
    'HERO_WEATHER',
    'SECURITY_BANNER',
    'ENERGY_OVERVIEW',
    'QUICK_SHORTCUTS',
    'DEVICE_GRID',
    'UNIFIED_CAMERAS',
    'AUTOMATIONS_LIST',
    'EMPTY_STATE',
]);

export const SDUISectionSchema = z.object({
    id: z.string(),
    type: SDUISectionTypeEnum,
    title: z.string().optional(),
    subtitle: z.string().optional(),
    order: z.number().default(0),
    columns: z.number().optional(),
    components: z.array(SDUIComponentSchema).default([]),
});

export const SDUIPageSchema = z.object({
    id: z.string(),
    title: z.string(),
    version: z.string().default('1.4.0'),
    generatedAt: z.string(),
    refreshIntervalSeconds: z.number().default(15),
    sections: z.array(SDUISectionSchema),
});

export type SDUIAction = z.infer<typeof SDUIActionSchema>;
export type SDUIComponent = z.infer<typeof SDUIComponentSchema>;
export type SDUISection = z.infer<typeof SDUISectionSchema>;
export type SDUIPage = z.infer<typeof SDUIPageSchema>;

openApiRegistry.register('SDUIAction', SDUIActionSchema);
openApiRegistry.register('SDUIComponent', SDUIComponentSchema);
openApiRegistry.register('SDUISection', SDUISectionSchema);
openApiRegistry.register('SDUIPage', SDUIPageSchema);

openApiRegistry.registerPath({
    method: 'get',
    path: '/sdui/dashboard',
    tags: ['SDUI'],
    summary: 'Get Server-Driven UI Dashboard Layout',
    description: 'Returns the complete dynamic Server-Driven UI layout tree composed of real-time IoT domain states.',
    responses: {
        200: {
            description: 'SDUI Dashboard layout retrieved successfully',
            content: {
                'application/json': {
                    schema: SDUIPageSchema,
                },
            },
        },
    },
});
