import { PrismaClient } from '@prisma/client';
import { logger } from '@/core/logger/logger';
import { KafkaClientManager } from '@/core/events/kafka-client';
import { SecurityAlertEvent, KAFKA_TOPICS } from '@/core/events/domain-events';
import {
    SetArmStatusRequest,
    RaiseIncidentRequest,
    SecuritySystemStatusResponse,
    SecurityIncidentResponse,
} from './schemas';

export interface SecurityService {
    getStatus(homeId?: string): Promise<SecuritySystemStatusResponse>;
    setArmStatus(req: SetArmStatusRequest): Promise<SecuritySystemStatusResponse>;
    raiseIncident(req: RaiseIncidentRequest): Promise<SecurityIncidentResponse>;
}

export class SecurityServiceImpl implements SecurityService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly kafkaManager: KafkaClientManager,
    ) {}

    public async getStatus(homeId?: string): Promise<SecuritySystemStatusResponse> {
        const zones = await this.prisma.securityZone.findMany({
            where: homeId ? { homeId } : {},
            orderBy: { name: 'asc' },
        });

        const recentIncidents = await this.prisma.securityIncident.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        const activeIncidents = recentIncidents.filter((i) => !i.resolvedAt);

        // Determine overall status
        let overallStatus: 'DISARMED' | 'ARMED_HOME' | 'ARMED_AWAY' = 'DISARMED';
        if (zones.some((z) => z.armStatus === 'ARMED_AWAY')) {
            overallStatus = 'ARMED_AWAY';
        } else if (zones.some((z) => z.armStatus === 'ARMED_HOME')) {
            overallStatus = 'ARMED_HOME';
        }

        return {
            overallStatus,
            zones: zones.map((z) => ({
                id: z.id,
                name: z.name,
                armStatus: z.armStatus as never,
                homeId: z.homeId,
                createdAt: z.createdAt.toISOString(),
                updatedAt: z.updatedAt.toISOString(),
            })),
            activeIncidentsCount: activeIncidents.length,
            recentIncidents: recentIncidents.map((i) => ({
                id: i.id,
                severity: i.severity as never,
                alertType: i.alertType,
                sourceDevice: i.sourceDevice,
                details: (i.details as Record<string, unknown>) || {},
                resolvedAt: i.resolvedAt?.toISOString() || null,
                createdAt: i.createdAt.toISOString(),
            })),
        };
    }

    public async setArmStatus(req: SetArmStatusRequest): Promise<SecuritySystemStatusResponse> {
        logger.info({ armStatus: req.armStatus, zoneId: req.zoneId }, 'Updating security arm status');

        if (req.zoneId) {
            await this.prisma.securityZone.update({
                where: { id: req.zoneId },
                data: { armStatus: req.armStatus },
            });
        } else {
            await this.prisma.securityZone.updateMany({
                where: req.homeId ? { homeId: req.homeId } : {},
                data: { armStatus: req.armStatus },
            });
        }

        return await this.getStatus(req.homeId);
    }

    public async raiseIncident(req: RaiseIncidentRequest): Promise<SecurityIncidentResponse> {
        logger.warn({ req }, '🚨 Security Incident Reported');

        const incident = await this.prisma.securityIncident.create({
            data: {
                severity: req.severity,
                alertType: req.alertType,
                sourceDevice: req.sourceDevice,
                details: req.details,
            },
        });

        // Publish Security Alert Domain Event
        const event: SecurityAlertEvent = {
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventType: 'SECURITY_ALERT_RAISED',
            timestamp: incident.createdAt.toISOString(),
            source: 'abs-security-service',
            data: {
                incidentId: incident.id,
                severity: req.severity,
                alertType: req.alertType,
                sourceDevice: req.sourceDevice,
                details: req.details,
            },
        };

        await this.kafkaManager.publishEvent(KAFKA_TOPICS.SECURITY_ALERTS, event);

        return {
            id: incident.id,
            severity: incident.severity as never,
            alertType: incident.alertType,
            sourceDevice: incident.sourceDevice,
            details: (incident.details as Record<string, unknown>) || {},
            resolvedAt: incident.resolvedAt?.toISOString() || null,
            createdAt: incident.createdAt.toISOString(),
        };
    }
}
