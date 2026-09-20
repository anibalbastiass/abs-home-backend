---
id: health
title: 💓 Health & Diagnostics Domain
sidebar_label: 💓 Health & Diagnostics
---

# 💓 Health & Diagnostics Domain

The **Health Domain** verifies system availability, database connectivity, Redis cache latency, Kafka event broker status, and IoT vendor adapter reachability.

---

## 🏗️ Architecture & DI

- **Interface**: `HealthService`
- **Implementation**: `HealthServiceImpl`
- **Controller**: `HealthController`
- **Route Prefix**: `/api/v1/health`

```typescript
export interface HealthService {
    getHealth(): Promise<HealthStatus>;
    getLiveness(): Promise<{ status: string }>;
    getReadiness(): Promise<{ status: string; checks: Record<string, boolean> }>;
}
```

---

## 🔍 Health Check Response

```json
{
    "status": "healthy",
    "timestamp": "2026-09-20T17:35:00.000Z",
    "uptimeSeconds": 14285.3,
    "version": "1.1.0",
    "services": {
        "database": { "status": "up", "latencyMs": 2.1 },
        "redis": { "status": "up", "latencyMs": 0.8 },
        "kafka": { "status": "up", "brokers": 1 },
        "hue": { "status": "up", "bridgeConnected": true },
        "nest": { "status": "up" },
        "switchbot": { "status": "up" },
        "ring": { "status": "up" },
        "blink": { "status": "up" }
    }
}
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Basic top-level liveness probe for load balancers |
| `GET` | `/api/v1/health` | Comprehensive health check across all dependencies |
| `GET` | `/api/v1/health/ready` | Kubernetes / container readiness probe |
| `GET` | `/api/v1/health/live` | Kubernetes / container liveness probe |
