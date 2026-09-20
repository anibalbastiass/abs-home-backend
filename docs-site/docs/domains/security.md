---
id: security
title: 🛡️ Security & Perimeter Domain
sidebar_label: 🛡️ Security
---

# 🛡️ Security & Perimeter Domain

The **Security Domain** orchestrates whole-home alarm states, access logs, camera feeds (Ring & Blink), and door sensors.

---

## 🏗️ Architecture & DI

- **Interface**: `SecurityService`
- **Implementation**: `SecurityServiceImpl`
- **Controller**: `SecurityController`
- **Route Prefix**: `/api/v1/security`

```typescript
export interface SecurityService {
    getSecurityState(): Promise<SecurityState>;
    setArmState(dto: ArmSecurityDto): Promise<SecurityState>;
    getAccessLogs(limit?: number): Promise<AccessLog[]>;
    triggerPanic(reason: string): Promise<void>;
}
```

---

## 🛡️ Security States

| Mode | Description |
| :--- | :--- |
| `disarmed` | All interior and perimeter sensors disarmed |
| `armed_home` | Perimeter sensors armed, interior motion sensors bypassed |
| `armed_away` | All perimeter and interior sensors fully armed |
| `triggered` | Alarm active, sirens on, push notifications dispatched |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/security/state` | Current whole-home arm mode and sensor status |
| `POST` | `/api/v1/security/arm` | Arm (`armed_home` / `armed_away`) or disarm with PIN |
| `GET` | `/api/v1/security/logs` | Audit trail of access events and arm mode transitions |
| `POST` | `/api/v1/security/panic` | Immediate siren and push notification dispatch |
