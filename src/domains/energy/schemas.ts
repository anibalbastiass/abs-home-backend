import { z } from 'zod';
import { openApiRegistry } from '@/core/openapi/registry';

export const PhaseMetricSchema = z.object({
    voltage: z.number().describe('RMS Voltage (V)'),
    current: z.number().describe('RMS Current (A)'),
    activePower: z.number().describe('Active Power (Watts)'),
    powerFactor: z.number().min(0).max(1).describe('Power Factor (0.0 to 1.0)'),
});

export const EnergyMetricResponseSchema = z.object({
    id: z.string().uuid(),
    meterId: z.string(),
    timestamp: z.string(),
    phaseA: PhaseMetricSchema,
    phaseB: PhaseMetricSchema,
    phaseC: PhaseMetricSchema,
    totalActivePower: z.number().describe('Sum of active power across all 3 phases (Watts)'),
    dailyEnergyKwh: z.number().describe('Cumulative energy consumed today (kWh)'),
});

export const IngestEnergySampleRequestSchema = z.object({
    meterId: z.string().min(1),
    phaseA: PhaseMetricSchema,
    phaseB: PhaseMetricSchema,
    phaseC: PhaseMetricSchema,
    totalActivePower: z.number().optional(),
    dailyEnergyKwh: z.number().default(0),
});

export const EnergySummaryResponseSchema = z.object({
    meterId: z.string(),
    currentPowerWatts: z.number(),
    dailyEnergyKwh: z.number(),
    phaseBalancePercentage: z.number().describe('Phase load balancing metric (0-100%)'),
    phases: z.object({
        phaseA: PhaseMetricSchema,
        phaseB: PhaseMetricSchema,
        phaseC: PhaseMetricSchema,
    }),
    latestSampleAt: z.string(),
});

export type EnergyMetricResponse = z.infer<typeof EnergyMetricResponseSchema>;
export type IngestEnergySampleRequest = z.infer<typeof IngestEnergySampleRequestSchema>;
export type EnergySummaryResponse = z.infer<typeof EnergySummaryResponseSchema>;

openApiRegistry.register('PhaseMetric', PhaseMetricSchema);
openApiRegistry.register('EnergyMetric', EnergyMetricResponseSchema);
openApiRegistry.register('IngestEnergySampleRequest', IngestEnergySampleRequestSchema);
openApiRegistry.register('EnergySummary', EnergySummaryResponseSchema);

openApiRegistry.registerPath({
    method: 'get',
    path: '/energy/summary',
    tags: ['Energy'],
    summary: 'Get real-time three-phase energy summary',
    description: 'Returns real-time power metrics, phase balance, and daily kWh consumption.',
    request: {
        query: z.object({ meterId: z.string().optional() }),
    },
    responses: {
        200: {
            description: 'Energy summary retrieved',
            content: {
                'application/json': {
                    schema: EnergySummaryResponseSchema,
                },
            },
        },
    },
});

openApiRegistry.registerPath({
    method: 'post',
    path: '/energy/telemetry',
    tags: ['Energy'],
    summary: 'Ingest three-phase power telemetry sample',
    description: 'Endpoint called by Shelly 3EM / IoT Energy Gateway to record real-time telemetry.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: IngestEnergySampleRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Telemetry sample ingested',
            content: {
                'application/json': {
                    schema: EnergyMetricResponseSchema,
                },
            },
        },
    },
});
