---
id: automations
title: ⚡ Automations Domain
sidebar_label: ⚡ Automations
---

# ⚡ Automations Domain

The **Automations Domain** enables event-driven and schedule-based home automation rules. Automations can be triggered by device state changes, sensor triggers, cron schedules, or domain events (e.g. motion detection or energy threshold crossings).

---

## 🏗️ Architecture & DI

- **Interface**: `AutomationService`
- **Implementation**: `AutomationServiceImpl`
- **Controller**: `AutomationController`
- **Route Prefix**: `/api/v1/automations`

```typescript
export interface AutomationService {
    listAutomations(): Promise<Automation[]>;
    getAutomation(id: string): Promise<Automation | null>;
    createAutomation(dto: CreateAutomationDto): Promise<Automation>;
    triggerAutomation(id: string): Promise<AutomationExecutionResult>;
    toggleAutomation(id: string, enabled: boolean): Promise<Automation>;
}
```

---

## 📋 Automation Schema

```json
{
    "id": "auto_security_night_lock",
    "name": "Night Lock & Arm",
    "enabled": true,
    "trigger": {
        "type": "cron",
        "expression": "0 23 * * *"
    },
    "conditions": [
        {
            "type": "security_state",
            "operator": "equals",
            "value": "disarmed"
        }
    ],
    "actions": [
        {
            "type": "scene_activate",
            "sceneId": "scene_night_quiet"
        },
        {
            "type": "security_arm",
            "mode": "armed_home"
        }
    ]
}
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/automations` | List all automation rules |
| `POST` | `/api/v1/automations` | Create a new automation rule |
| `GET` | `/api/v1/automations/:id` | Get details of a specific rule |
| `POST` | `/api/v1/automations/:id/trigger` | Manually evaluate and execute actions |
| `PATCH` | `/api/v1/automations/:id` | Toggle active status or update parameters |
