---
sidebar_position: 1
---

# 🚀 Getting Started Overview

The ABS Smart Home Backend is designed for rapid local development with zero friction using containerized dependencies.

## 🛠️ Toolchain & Requirements

- **Node.js**: Version `22.x LTS` or higher
- **Package Manager**: `npm` (v10+)
- **Docker & Docker Compose**: For local PostgreSQL 16, Redis 7, and Redpanda (Kafka)
- **TypeScript**: 5.7+

---

## 📦 Core Dependencies

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `koa` | `2.15.x` | Minimalist, high-performance HTTP server |
| `@koa/router` | `13.1.x` | Expressive URL routing |
| `zod` | `3.24.x` | Type-safe schema validation |
| `@asteasolutions/zod-to-openapi` | `7.3.x` | OpenAPI 3.1 generator from Zod schemas |
| `@prisma/client` | `5.22.x` | Type-safe PostgreSQL ORM |
| `bullmq` | `5.41.x` | Redis sliding-window queue & rate limiting |
| `kafkajs` | `2.2.x` | Event streaming broker client |
| `pino` | `9.6.x` | Fast, structured JSON logging |
| `vitest` | `3.0.x` | Blazing fast test runner with v8 coverage |
