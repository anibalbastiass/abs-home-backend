export type DomainEventType =
    | 'DEVICE_STATE_CHANGED'
    | 'DEVICE_ONLINE_STATUS'
    | 'AUTOMATION_TRIGGERED'
    | 'SECURITY_STATE_CHANGED'
    | 'SECURITY_ALERT_RAISED'
    | 'ENERGY_TELEMETRY_RECORDED';

export interface BaseDomainEvent<T = unknown> {
    eventId: string;
    eventType: DomainEventType;
    timestamp: string; // ISO8601
    source: string;
    correlationId?: string;
    data: T;
}

export interface DeviceStateChangedData {
    deviceId: string;
    vendor: string;
    deviceType: string;
    previousState: Record<string, unknown>;
    newState: Record<string, unknown>;
    changedAttributes: string[];
}

export interface DeviceStateChangedEvent extends BaseDomainEvent<DeviceStateChangedData> {
    eventType: 'DEVICE_STATE_CHANGED';
}

export interface AutomationTriggeredData {
    automationId: string;
    name: string;
    triggerSource: string;
    executedActionsCount: number;
    durationMs: number;
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
}

export interface AutomationTriggeredEvent extends BaseDomainEvent<AutomationTriggeredData> {
    eventType: 'AUTOMATION_TRIGGERED';
}

export interface SecurityAlertData {
    incidentId: string;
    zoneId?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    sourceDevice: string;
    alertType: 'MOTION_DETECTED' | 'DOOR_OPENED' | 'GLASS_BREAK' | 'TAMPER' | 'OFFLINE_BREACH';
    details: Record<string, unknown>;
}

export interface SecurityAlertEvent extends BaseDomainEvent<SecurityAlertData> {
    eventType: 'SECURITY_ALERT_RAISED';
}

export interface EnergyTelemetryData {
    meterId: string;
    timestamp: string;
    phaseA: { voltage: number; current: number; activePower: number; powerFactor: number };
    phaseB: { voltage: number; current: number; activePower: number; powerFactor: number };
    phaseC: { voltage: number; current: number; activePower: number; powerFactor: number };
    totalActivePower: number; // Watts
    totalDailyEnergyKwh: number;
}

export interface EnergyTelemetryEvent extends BaseDomainEvent<EnergyTelemetryData> {
    eventType: 'ENERGY_TELEMETRY_RECORDED';
}

export const KAFKA_TOPICS = {
    DEVICE_EVENTS: 'abs.device.events',
    AUTOMATION_EVENTS: 'abs.automation.events',
    SECURITY_ALERTS: 'abs.security.alerts',
    ENERGY_TELEMETRY: 'abs.energy.telemetry',
} as const;
