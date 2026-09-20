---
sidebar_position: 4
---

# 📡 Kafka / Redpanda Domain Event Streaming

Domain events provide asynchronous decoupled communication between the IoT control plane, background automation consumers, and mobile push notification services.

## 📋 Kafka Topics & Event Types

```typescript
export const KAFKA_TOPICS = {
    DEVICE_EVENTS: 'abs.device.events',
    AUTOMATION_EVENTS: 'abs.automation.events',
    SECURITY_ALERTS: 'abs.security.alerts',
    ENERGY_TELEMETRY: 'abs.energy.telemetry',
} as const;
```

---

## 🏷️ Standard Domain Event Structure

All domain events implement `BaseDomainEvent<T>`:

```typescript
export interface BaseDomainEvent<T = unknown> {
    eventId: string;
    eventType: DomainEventType;
    timestamp: string; // ISO8601
    source: string;
    correlationId?: string;
    data: T;
}
```

### Event Payloads

1. **`DEVICE_STATE_CHANGED`**: Emitted when light brightness, color, thermostat target temperature, or curtain positions change.
2. **`AUTOMATION_TRIGGERED`**: Emitted after automation evaluation and execution.
3. **`SECURITY_ALERT_RAISED`**: High-priority alert triggered when a camera detects motion or a perimeter sensor is breached.
4. **`ENERGY_TELEMETRY_RECORDED`**: Periodic three-phase power telemetry sample.
