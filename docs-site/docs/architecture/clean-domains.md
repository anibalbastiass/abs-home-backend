---
sidebar_position: 1
---

# 🏛️ Clean Architecture & Domains

The ABS Smart Home Backend is structured around strict **Domain Boundaries** (`src/domains/`) to guarantee isolation, maintainability, and testability.

## 📂 Domain Folder Anatomy

Each domain in `src/domains/<domain>` contains:

```
src/domains/<domain>/
├── schemas.ts         # Zod schemas & OpenAPI 3.1 registry bindings
├── routes.ts          # Koa router factory consuming injected controller
├── controller.ts      # Pure HTTP parsing and status mapping
├── service.ts         # Domain interface + ServiceImpl business logic
├── service.spec.ts    # Co-located unit test suite
└── adapters/          # (Optional) Third-party IoT vendor adapters
```

---

## 🔄 Request Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as KMP Mobile Client
    participant Router as Koa Router
    participant MW as RFC 7807 Error MW
    participant Ctrl as Controller
    participant Svc as ServiceImpl
    participant Queue as BullMQ Limiter
    participant DB as Prisma PostgreSQL
    participant Kafka as Redpanda Event Broker

    Client->>Router: POST /api/v1/devices/:id/command
    Router->>MW: Forward Request
    MW->>Ctrl: invoke executeCommand()
    Ctrl->>Ctrl: Zod Schema Parse (422 if invalid)
    Ctrl->>Svc: executeCommand(id, request)
    Svc->>DB: Read current device state
    Svc->>Queue: Enqueue command in vendor sliding-window queue
    Svc->>DB: Optimistically update state
    Svc->>Kafka: Publish DEVICE_STATE_CHANGED event
    Svc-->>Ctrl: Return updated state
    Ctrl-->>Client: 200 OK + Problem Details on error
```
