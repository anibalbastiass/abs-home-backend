import { PrismaClient } from '@prisma/client';
import { logger } from '@/core/logger/logger';
import { KafkaClientManager } from '@/core/events/kafka-client';
import { EnergyTelemetryEvent, KAFKA_TOPICS } from '@/core/events/domain-events';
import {
    IngestEnergySampleRequest,
    EnergyMetricResponse,
    EnergySummaryResponse,
} from './schemas';

export interface EnergyService {
    ingestSample(req: IngestEnergySampleRequest): Promise<EnergyMetricResponse>;
    getSummary(meterId?: string): Promise<EnergySummaryResponse>;
}

export class EnergyServiceImpl implements EnergyService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly kafkaManager: KafkaClientManager,
    ) {}

    public async ingestSample(req: IngestEnergySampleRequest): Promise<EnergyMetricResponse> {
        const totalActivePower =
            req.totalActivePower ??
            req.phaseA.activePower + req.phaseB.activePower + req.phaseC.activePower;

        const sample = await this.prisma.energyMetric.create({
            data: {
                meterId: req.meterId,
                phaseAVoltage: req.phaseA.voltage,
                phaseACurrent: req.phaseA.current,
                phaseAPower: req.phaseA.activePower,
                phaseAPowerFactor: req.phaseA.powerFactor,
                phaseBVoltage: req.phaseB.voltage,
                phaseBCurrent: req.phaseB.current,
                phaseBPower: req.phaseB.activePower,
                phaseBPowerFactor: req.phaseB.powerFactor,
                phaseCVoltage: req.phaseC.voltage,
                phaseCCurrent: req.phaseC.current,
                phaseCPower: req.phaseC.activePower,
                phaseCPowerFactor: req.phaseC.powerFactor,
                totalActivePower,
                dailyEnergyKwh: req.dailyEnergyKwh,
            },
        });

        // Publish Kafka telemetry event
        const event: EnergyTelemetryEvent = {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventType: 'ENERGY_TELEMETRY_RECORDED',
            timestamp: sample.timestamp.toISOString(),
            source: 'abs-energy-monitor',
            data: {
                meterId: req.meterId,
                timestamp: sample.timestamp.toISOString(),
                phaseA: req.phaseA,
                phaseB: req.phaseB,
                phaseC: req.phaseC,
                totalActivePower,
                totalDailyEnergyKwh: req.dailyEnergyKwh,
            },
        };

        await this.kafkaManager.publishEvent(KAFKA_TOPICS.ENERGY_TELEMETRY, event);
        logger.debug({ meterId: req.meterId, totalWatts: totalActivePower }, 'Ingested energy sample');

        return {
            id: sample.id,
            meterId: sample.meterId,
            timestamp: sample.timestamp.toISOString(),
            phaseA: {
                voltage: sample.phaseAVoltage,
                current: sample.phaseACurrent,
                activePower: sample.phaseAPower,
                powerFactor: sample.phaseAPowerFactor,
            },
            phaseB: {
                voltage: sample.phaseBVoltage,
                current: sample.phaseBCurrent,
                activePower: sample.phaseBPower,
                powerFactor: sample.phaseBPowerFactor,
            },
            phaseC: {
                voltage: sample.phaseCVoltage,
                current: sample.phaseCCurrent,
                activePower: sample.phaseCPower,
                powerFactor: sample.phaseCPowerFactor,
            },
            totalActivePower: sample.totalActivePower,
            dailyEnergyKwh: sample.dailyEnergyKwh,
        };
    }

    public async getSummary(meterId = 'shelly_3em_panel'): Promise<EnergySummaryResponse> {
        const latest = await this.prisma.energyMetric.findFirst({
            where: { meterId },
            orderBy: { timestamp: 'desc' },
        });

        if (!latest) {
            return {
                meterId,
                currentPowerWatts: 0,
                dailyEnergyKwh: 0,
                phaseBalancePercentage: 100,
                phases: {
                    phaseA: { voltage: 220, current: 0, activePower: 0, powerFactor: 1.0 },
                    phaseB: { voltage: 220, current: 0, activePower: 0, powerFactor: 1.0 },
                    phaseC: { voltage: 220, current: 0, activePower: 0, powerFactor: 1.0 },
                },
                latestSampleAt: new Date().toISOString(),
            };
        }

        const powers = [latest.phaseAPower, latest.phaseBPower, latest.phaseCPower];
        const avg = latest.totalActivePower / 3 || 1;
        const maxDev = Math.max(...powers.map((p) => Math.abs(p - avg)));
        const balancePercentage = Math.max(0, Math.min(100, Math.round(100 - (maxDev / avg) * 100)));

        return {
            meterId: latest.meterId,
            currentPowerWatts: latest.totalActivePower,
            dailyEnergyKwh: latest.dailyEnergyKwh,
            phaseBalancePercentage: balancePercentage,
            phases: {
                phaseA: {
                    voltage: latest.phaseAVoltage,
                    current: latest.phaseACurrent,
                    activePower: latest.phaseAPower,
                    powerFactor: latest.phaseAPowerFactor,
                },
                phaseB: {
                    voltage: latest.phaseBVoltage,
                    current: latest.phaseBCurrent,
                    activePower: latest.phaseBPower,
                    powerFactor: latest.phaseBPowerFactor,
                },
                phaseC: {
                    voltage: latest.phaseCVoltage,
                    current: latest.phaseCCurrent,
                    activePower: latest.phaseCPower,
                    powerFactor: latest.phaseCPowerFactor,
                },
            },
            latestSampleAt: latest.timestamp.toISOString(),
        };
    }
}
