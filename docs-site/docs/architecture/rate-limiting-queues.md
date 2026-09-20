---
sidebar_position: 3
---

# ⚡ BullMQ IoT Rate Limiting

Third-party IoT vendor cloud APIs enforce strict rate limits that can result in HTTP 429 penalties or temporary IP bans if exceeded.

## 🛡️ Vendor Rate Limit Specifications

| Vendor | Rate Limit Threshold | Window | Implementation Queue |
| :--- | :--- | :--- | :--- |
| **Philips Hue** | 10 requests | 1000 ms (1 sec) | `iot-hue-queue` |
| **Google Nest** | 3 requests | 1000 ms (1 sec) | `iot-nest-queue` |
| **SwitchBot** | 2 requests | 1000 ms (1 sec) | `iot-switchbot-queue` |
| **Ring** | 1 request | 1000 ms (1 sec) | `iot-ring-queue` |
| **Amazon Blink** | 1 request | 1000 ms (1 sec) | `iot-blink-queue` |
| **Energy Ingestion** | 20 requests | 1000 ms (1 sec) | `iot-energy-queue` |

---

## ⚙️ Redis Sliding Window Limiter

BullMQ manages queue workers configured with sliding window rate limiters:

```typescript
const worker = new Worker<IoTCommandPayload>(
    queueName,
    async (job) => {
        const handler = this.commandHandlers.get(vendor);
        return await handler(job.data);
    },
    {
        connection,
        limiter: {
            max: limit.max,
            duration: limit.duration,
        },
        concurrency: 5,
    },
);
```

When commands are dispatched, they are queued and executed respecting the rate limits with automatic exponential backoff on retries (up to 3 attempts).
