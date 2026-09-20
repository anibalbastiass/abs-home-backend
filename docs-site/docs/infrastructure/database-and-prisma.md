---
id: database-and-prisma
title: 🗄️ PostgreSQL & Prisma ORM
sidebar_label: 🗄️ Database & Prisma
---

# 🗄️ PostgreSQL & Prisma ORM

ABS Smart Home Backend uses **PostgreSQL 16** with **Prisma ORM** for strong schema consistency, transactional integrity, and automated migrations.

---

## 🏗️ Core Entities

- **Device**: Physical or virtual IoT devices with vendor IDs, capabilities, room IDs, and JSON state.
- **Scene**: Multi-device state presets (lighting, thermostat targets, lock modes).
- **Automation**: Triggers (cron, event, state condition) and action payloads.
- **EnergyReading**: High-frequency three-phase power, voltage, current, and power factor time-series.
- **AccessLog**: Security sensor triggers, keypad entry records, and arm/disarm audit trails.

---

## 🛠️ Prisma Schema Overview

```prisma
datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

generator client {
    provider = "prisma-client-js"
}

model Device {
    id           String      @id @default(uuid())
    vendor       Vendor
    vendorId     String      @map("vendor_id")
    name         String
    room         String?
    type         DeviceType
    state        Json        @default("{}")
    isOnline     Boolean     @default(true) @map("is_online")
    createdAt    DateTime    @default(now()) @map("created_at")
    updatedAt    DateTime    @updatedAt @map("updated_at")

    @@unique([vendor, vendorId])
    @@map("devices")
}
```

---

## 💻 Common Commands

```bash
# Apply migrations in local development
npx prisma migrate dev

# Generate fresh Prisma Client types
npx prisma generate

# Open Prisma Studio visual inspector
npx prisma studio

# Seed database with mock IoT data
npm run db:seed
```
