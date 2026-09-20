# AGENTS.md — ABS Smart Home (Backend)

Context for AI agents working on the **Node.js / KoaJS Smart Home Backend** in
`abs-home-backend`. This repository acts as the central IoT gateway and domain control plane
for the ABS Smart Home ecosystem (unifying Philips Hue, Google Nest, SwitchBot, Ring, and Amazon Blink).

## What this is

A high-performance, modular **KoaJS + TypeScript** backend featuring **BullMQ** (Redis queues), **Redpanda/Kafka** (Domain Events), **PostgreSQL 16** (Prisma ORM), **Redis 7** (Caching & Token Bucket Rate Limiting), **Terraform** (IaC for DigitalOcean), and automated **OpenAPI 3.1 $\rightarrow$ Kotlin Multiplatform Codegen**.

## Toolchain & Stack

- **Node.js 22+ (LTS)** and **pnpm** / **npm**.
- **KoaJS 2.x** (`@koa/router`, `koa-bodyparser`, `koa-cors`, `koa-helmet`).
- **Validation**: **Zod** with `@asteasolutions/zod-to-openapi`.
- **Queues & Rate Limiting**: **BullMQ 5.x** on **Redis 7**.
- **Event Streaming**: **KafkaJS** with **Redpanda**.
- **Database & ORM**: **PostgreSQL 16** with **Prisma ORM**.
- **Testing**: **Vitest** / **Jest** with Supertest (Coverage $\ge 80\%$).
- **IaC**: **Terraform** (`digitalocean/digitalocean` provider).
- **CI/CD & Deployments**: **GitHub Actions** (`ci.yml`, `deploy-staging.yml`, `deploy-production.yml`).

---

## 🚨 Mandatory Execution Protocol for Every Single Change

For **EVERY** change, task, bugfix, or feature in this repository, agents MUST strictly follow this 6-step lifecycle:
1. **GitHub Issue**: Create issue via `gh issue create` and assign to `anibalbastiass` with appropriate labels (`area:*`, `type:*`).
2. **Architecture Standards**: Apply Clean Architecture (Router $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ Adapter/Repository), Zod payload validation, BullMQ rate-limited IoT dispatcher, and Kafka domain events.
3. **80% Test Coverage Gate**: Write comprehensive unit & integration tests with Vitest/Supertest. Line coverage MUST meet or exceed **80%** (`npm run test:coverage`).
4. **Quality Gate Verification**: Run `npm run lint`, `npm run typecheck`, `npm run test`, and verify Docker container build (`docker build -t abs-backend .`).
5. **Semantic Version Bump**: Increment version in `package.json` and sync OpenAPI spec via `npm run spec:export`.
6. **Git Commit, Push, Tag & GitHub Actions Deployment**: Commit as repo owner (`anibalbastias`, no AI co-authors), push to `main`, tag version (`git tag -a vX.Y.Z`), create GitHub release (`gh release create`), which triggers automated **GitHub Actions Deployment** to DigitalOcean, and close the issue.

---

## Local Development & Commands

```bash
# Start local stack (Postgres, Redis, Redpanda, Redpanda Console on :8085)
npm run deploy:local
# or directly:
docker compose up -d

# Run Prisma migrations & seed
npx prisma migrate dev
npm run db:seed

# Start backend with hot reload
npm run dev

# Run unit & integration tests
npm run test
npm run test:coverage

# Lint & Typecheck
npm run lint
npm run typecheck

# Export OpenAPI 3.1 Spec for KMP
npm run spec:export

# Deploy via GitHub Actions (Recommended)
# Push to staging -> Triggers deploy-staging.yml
# Create GitHub Release -> Triggers deploy-production.yml
```

---

## Secrets & Security (Zero-Trust Mobile)

All vendor credentials (Nest, SwitchBot, Ring, Blink, Hue) are managed strictly via **Terraform** (`terraform/variables.tf` with `sensitive = true`) and environment variables (`.env` gitignored). Never hardcode secrets in committed source.

## Conventions

- Match surrounding TypeScript/Koa Clean Architecture style.
- **Commits**: author as repo owner (`anibalbastias`); do **not** add a Claude co-author trailer.
- Push to `main` when asked.
