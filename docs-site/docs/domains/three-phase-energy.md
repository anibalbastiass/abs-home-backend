---
id: three-phase-energy
title: ⚡ Three-Phase Energy Monitoring
sidebar_label: ⚡ Three-Phase Energy
---

# ⚡ Three-Phase Energy Monitoring

ABS Smart Home Backend provides precision **Three-Phase Electrical Monitoring (L1, L2, L3)** with real-time phase balance calculations, total active power (kW), and power factor metrics.

---

## 🏗️ Architecture & DI

- **Interface**: `EnergyService`
- **Implementation**: `EnergyServiceImpl`
- **Controller**: `EnergyController`
- **Route Prefix**: `/api/v1/energy`

```typescript
export interface EnergyService {
    getLiveMetrics(): Promise<ThreePhaseEnergyMetrics>;
    getHistoricalReadings(range: TimeRange): Promise<EnergyReading[]>;
    recordReading(reading: CreateEnergyReadingDto): Promise<void>;
}
```

---

## 📊 Three-Phase Data Model

```json
{
    "timestamp": "2026-09-20T17:30:00.000Z",
    "totalPowerWatts": 4820.5,
    "totalCurrentAmps": 21.3,
    "frequencyHz": 50.02,
    "phases": {
        "L1": {
            "voltage": 229.4,
            "current": 8.1,
            "powerWatts": 1856.1,
            "powerFactor": 0.98
        },
        "L2": {
            "voltage": 230.1,
            "current": 6.8,
            "powerWatts": 1564.7,
            "powerFactor": 0.97
        },
        "L3": {
            "voltage": 228.9,
            "current": 6.4,
            "powerWatts": 1399.7,
            "powerFactor": 0.96
        }
    },
    "phaseImbalancePercent": 4.2
}
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/energy/live` | Real-time voltage, current, power per phase |
| `GET` | `/api/v1/energy/history` | Historical consumption aggregated by hour/day |
| `POST` | `/api/v1/energy/readings` | Ingest metrics from IoT meter/clamps |
