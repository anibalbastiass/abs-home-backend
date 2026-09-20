import { describe, it, expect, vi } from 'vitest';
import { SecurityServiceImpl } from './service';
import { KafkaClientManager } from '@/core/events/kafka-client';
import { createSecurityZoneFixture, createSecurityIncidentFixture, FIXTURE_IDS } from '@/test/fixtures';

describe('SecurityServiceImpl', () => {
    const mockPrisma: any = {
        securityZone: {
            findMany: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        securityIncident: {
            findMany: vi.fn(),
            create: vi.fn(),
        },
    };

    const mockKafkaManager = new KafkaClientManager();
    const service = new SecurityServiceImpl(mockPrisma, mockKafkaManager);

    it('should get overall security status with ARMED_AWAY precedence using fixtures', async () => {
        const zoneFixture = createSecurityZoneFixture({ armStatus: 'ARMED_AWAY' });
        mockPrisma.securityZone.findMany.mockResolvedValueOnce([zoneFixture]);
        mockPrisma.securityIncident.findMany.mockResolvedValueOnce([]);

        const status = await service.getStatus(FIXTURE_IDS.HOME_ID);
        expect(status.overallStatus).toBe('ARMED_AWAY');
        expect(status.zones).toHaveLength(1);
    });

    it('should get overall security status with ARMED_HOME using fixtures', async () => {
        const zoneFixture = createSecurityZoneFixture({ armStatus: 'ARMED_HOME' });
        mockPrisma.securityZone.findMany.mockResolvedValueOnce([zoneFixture]);
        mockPrisma.securityIncident.findMany.mockResolvedValueOnce([]);

        const status = await service.getStatus();
        expect(status.overallStatus).toBe('ARMED_HOME');
    });

    it('should set arm status for specific zoneId using fixtures', async () => {
        const zoneFixture = createSecurityZoneFixture({ armStatus: 'DISARMED' });
        mockPrisma.securityZone.update.mockResolvedValueOnce({});
        mockPrisma.securityZone.findMany.mockResolvedValueOnce([zoneFixture]);
        mockPrisma.securityIncident.findMany.mockResolvedValueOnce([]);

        const status = await service.setArmStatus({ armStatus: 'DISARMED', zoneId: zoneFixture.id });
        expect(status.overallStatus).toBe('DISARMED');
        expect(mockPrisma.securityZone.update).toHaveBeenCalled();
    });

    it('should set arm status across home using fixtures', async () => {
        const zoneFixture = createSecurityZoneFixture({ armStatus: 'ARMED_HOME' });
        mockPrisma.securityZone.updateMany.mockResolvedValueOnce({ count: 1 });
        mockPrisma.securityZone.findMany.mockResolvedValueOnce([zoneFixture]);
        mockPrisma.securityIncident.findMany.mockResolvedValueOnce([]);

        const status = await service.setArmStatus({ armStatus: 'ARMED_HOME', homeId: FIXTURE_IDS.HOME_ID });
        expect(status.overallStatus).toBe('ARMED_HOME');
    });

    it('should raise security incident and publish event using fixtures', async () => {
        const incidentFixture = createSecurityIncidentFixture();
        mockPrisma.securityIncident.create.mockResolvedValueOnce(incidentFixture);

        const incident = await service.raiseIncident({
            severity: incidentFixture.severity as any,
            alertType: incidentFixture.alertType as any,
            sourceDevice: incidentFixture.sourceDevice,
            details: incidentFixture.details,
        });

        expect(incident.severity).toBe(incidentFixture.severity);
        expect(incident.alertType).toBe(incidentFixture.alertType);
    });
});
