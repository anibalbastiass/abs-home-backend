---
sidebar_position: 2
---

# 💻 Local Setup & Development

Follow these steps to spin up the entire ABS Smart Home backend stack locally.

## 1. Environment Setup

Copy `.env.example` to create your local `.env`:

```bash
cp .env.example .env
```

Review the default variables:
- `PORT=3000`
- `DATABASE_URL=postgresql://abs_admin:abs_password_secure@localhost:5432/abs_smarthome?schema=public`
- `REDIS_URL=redis://localhost:6379`
- `KAFKA_BROKERS=localhost:19092`

---

## 2. Start Local Stack via Docker Compose

Run the multi-container stack (Postgres 16, Redis 7, Redpanda, and Redpanda Console):

```bash
npm run deploy:local
# or
docker compose up -d
```

Check the health status:
```bash
docker compose ps
```

| Service | Host Port | Purpose |
| :--- | :--- | :--- |
| **PostgreSQL** | `5432` | Relational database storage |
| **Redis** | `6379` | Queue jobs, rate limit tokens & state cache |
| **Redpanda** | `19092` | Kafka-compatible event streaming broker |
| **Redpanda Console** | `8085` | Web UI for Kafka topics & messages |

---

## 3. Database Migration & Seed

Generate the Prisma Client and seed realistic smart devices:

```bash
npm run db:generate
npx prisma migrate dev
npm run db:seed
```

---

## 4. Run Development Server

```bash
npm run dev
```

The gateway starts at `http://localhost:3000`.
- **Live Health Probe**: `http://localhost:3000/health/live`
- **Readiness Probe**: `http://localhost:3000/health/ready`
- **Swagger UI**: `http://localhost:3000/docs`
