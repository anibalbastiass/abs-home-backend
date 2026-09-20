# Backend Architecture & Engineering Rules

## 1. Clean Architecture & Layer Isolation
- **Routers (`src/domains/*/routes.ts`)**: Define endpoints, attach Zod validation middleware, and call Controllers.
- **Controllers (`src/domains/*/controller.ts`)**: Parse HTTP context, invoke Domain Services, return standard RFC 7807 responses.
- **Services (`src/domains/*/service.ts`)**: Pure business logic, automation rule evaluations, orchestration.
- **Adapters / Repositories (`src/domains/*/adapter.ts`)**: Third-party IoT vendor clients (Hue, Nest, SwitchBot, Ring, Blink) and Prisma PostgreSQL access.
- **Queues (`src/core/queues/`)**: BullMQ worker handlers with Redis sliding-window token bucket limiters.
- **Events (`src/core/events/`)**: Kafka domain event definitions, publisher, and consumer groups.

## 2. Test Coverage & Quality Gates
- Line coverage MUST be $\ge 80\%$ via `npm run test:coverage`.
- Use Vitest and Supertest for unit & integration testing.
- Test both happy paths and error/timeout/rate-limiting scenarios.

## 3. Deployment & CI/CD
- GitHub Actions is the single source of truth for CI and Deployments.
- Staging: Triggered on push to `staging` branch (`.github/workflows/deploy-staging.yml`).
- Production: Triggered on GitHub Release / version tag `v*` (`.github/workflows/deploy-production.yml`).
