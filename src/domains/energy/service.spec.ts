import { describe, it, expect, vi } from 'vitest';
import { EnergyServiceImpl } from './service';
import { KafkaClientManager } from '@/core/events/kafka-client';
import { createEnergyMetricFixture } from '@/test/fixtures';

describe('EnergyServiceImpl', () => {
    const mockPrisma: any = {
        energyMetric: {
            create: vi.fn(),
            findFirst: vi.fn(),
        },
    };

    const mockKafkaManager = new KafkaClientManager();
    const service = new EnergyServiceImpl(mockPrisma, mockKafkaManager);

    it('should ingest three-phase power telemetry sample using fixture', async () => {
        const fixture = createEnergyMetricFixture();
        mockPrisma.energyMetric.create.mockResolvedValueOnce(fixture);

        const sample = await service.ingestSample({
            meterId: fixture.meterId,
            phaseA: {
                voltage: fixture.phaseAVoltage,
                current: fixture.phaseACurrent,
                activePower: fixture.phaseAPower,
                powerFactor: fixture.phaseAPowerFactor,
            },
            phaseB: {
                voltage: fixture.phaseBVoltage,
                current: fixture.phaseBCurrent,
                activePower: fixture.phaseBPower,
                powerFactor: fixture.phaseBPowerFactor,
            },
            phaseC: {
                voltage: fixture.phaseCVoltage,
                current: fixture.phaseCCurrent,
                activePower: fixture.phaseCPower,
                powerFactor: fixture.phaseCPowerFactor,
            },
            dailyEnergyKwh: fixture.dailyEnergyKwh,
        });

        expect(sample.totalActivePower).toBe(fixture.totalActivePower);
        expect(sample.dailyEnergyKwh).toBe(fixture.dailyEnergyKwh);
    });

    it('should get energy summary with computed phase balance using fixture', async () => {
        const fixture = createEnergyMetricFixture({
            phaseAPower: 1000,
            phaseBPower: 1000,
            phaseCPower: 1000,
            totalActivePower: 3000,
        });
        mockPrisma.energyMetric.findFirst.mockResolvedValueOnce(fixture);

        const summary = await service.getSummary(fixture.meterId);
        expect(summary.currentPowerWatts).toBe(3000);
        expect(summary.phaseBalancePercentage).toBe(100);
    });

    it('should return default summary when no metrics recorded yet', async () => {
        mockPrisma.energyMetric.findFirst.mockResolvedValueOnce(null);

        const summary = await service.getSummary('empty_meter');
        expect(summary.currentPowerWatts).toBe(0);
        expect(summary.dailyEnergyKwh).toBe(0);
    });
});
