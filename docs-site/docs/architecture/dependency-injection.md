---
sidebar_position: 2
---

# 💉 Dependency Injection & Container

All components in `abs-home-backend` use **Constructor Dependency Injection**.

## 🧩 Interface & Implementation Naming Convention

Domain services adhere strictly to:
- **Interface**: Named directly after the domain service (e.g. `DeviceService`, `SceneService`).
- **Implementation**: Suffix with `Impl` (e.g. `DeviceServiceImpl`, `SceneServiceImpl`).

```typescript
// Interface contract
export interface DeviceService {
    listDevices(query: ListDevicesQuery): Promise<DeviceResponse[]>;
    getDeviceById(id: string): Promise<DeviceResponse>;
    executeCommand(id: string, request: DeviceCommandRequest): Promise<DeviceCommandResponse>;
}

// Implementation with Constructor Injection
export class DeviceServiceImpl implements DeviceService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly queueManager: QueueManager,
        private readonly kafkaManager: KafkaClientManager,
        private readonly hueAdapter: HueAdapter,
        private readonly nestAdapter: NestAdapter,
        private readonly switchbotAdapter: SwitchBotAdapter,
        private readonly ringAdapter: RingAdapter,
        private readonly blinkAdapter: BlinkAdapter,
    ) {}
    // ...
}
```

---

## 📦 Container Registry (`src/core/di/container.ts`)

The DI Container constructs singletons and passes them into controllers and router factories:

```typescript
export const createContainer = (overrides: Partial<AppContainer> = {}): AppContainer => {
    // Allows injecting mock services for unit and integration testing!
};
```

---

## 🧪 Testing with Mock Containers

Integration tests (`src/core/http/api.ispec.ts`) can create isolated test applications by passing partial mock services into `createApp(createContainer({ ...mocks }))`.
