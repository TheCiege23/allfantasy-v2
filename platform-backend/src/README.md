# Platform Backend Foundation (TypeScript)

This folder is a backend-first scaffolding layer for AllFantasy domains.

## Included

- Contracts for domain events, permissions, route map, and services.
- Event bus interface and in-memory implementation.
- Realtime channel strategy abstraction.
- Worker queue topology for background processing.
- In-memory repository state for identity, league, membership, and settings.
- Repository interfaces plus memory and Postgres adapter implementations.
- Service implementations for league and settings contracts plus identity and membership modules.
- Lightweight HTTP handlers for create/read league, membership listing, and settings get/update.
- Composition root in `app.ts` via `createBackendApp()`.
- Postgres composition root in `app-postgres.ts` via `createPostgresBackendApp(sqlExecutor)`.
- Correlation + idempotency middleware for mutation handlers.
- Roster and lineup submission service with event receipt output.

## How to Use

1. Bind route handlers to the definitions in `contracts/route-map.ts`.
2. Implement each domain service from `contracts/services.ts`.
3. Publish all write-side mutations as outbox events using `contracts/domain-events.ts`.
4. Fanout events to realtime channels via `core/realtime.ts`.
5. Execute async processors using queue definitions in `workers/job-topology.ts`.

### Current executable slice

- `modules/identity/service.ts`: create and read identity profile records.
- `modules/league/service.ts`: create league + commissioner membership bootstrap.
- `modules/membership/service.ts`: add and list league members with role checks.
- `modules/settings/service.ts`: domain settings updates with versioning + audit trail.
- `modules/roster/service.ts`: roster reads + lineup submit validation + event receipts.
- `http/handlers.ts`: route-ready handlers around those modules.
- `app.ts`: dependency wiring for in-memory execution.
- `app-postgres.ts`: dependency wiring for Postgres-backed execution.

All domain services in this slice are repository-injected (no direct store access).

### Repository adapters

- `contracts/repositories.ts`: repository contracts.
- `repositories/memory-adapters.ts`: in-memory adapters for local harness and tests.
- `repositories/postgres/adapters.ts`: SQL-backed adapters aligned to `af_*` foundation schema.
- `repositories/postgres/prisma-executor.ts`: concrete Prisma-backed SQL executor (`$queryRawUnsafe`) for app wiring.
- Postgres lineup replay lookups (`getByIdempotency` and `getLatest`) resolve from `af_domain_events` (`RosterUpdated`) so replay works across app instances.

### HTTP request metadata

- Middleware reads `idempotency-key` and `x-correlation-id` headers.
- Correlation IDs are returned under `response.data.meta.correlationId`.
- Idempotent replays return `meta.idempotentReplay = true`.

### Test coverage in this slice

- `__tests__/platform-backend-handlers.test.ts`: idempotent replay and lineup receipt/outbox behavior.
- `__tests__/platform-backend-postgres-factory.test.ts`: integration-style app factory tests using a fake SQL executor to validate Postgres adapter flow.
- Postgres factory tests include roster read-path coverage and lineup replay across separate app instances with shared SQL state.

### Runtime smoke check

- Run `npm run smoke:platform-backend:postgres` to execute a live Postgres wiring check using Prisma.
- The script creates a league, updates `general` settings, then reads both back through `createPostgresBackendApp` handlers.
- It also seeds a team/player/asset and validates roster reads through `getTeamRoster`.
- It validates lineup submission idempotency replay through `postTeamLineup`.
- Run `npm run db:indexes:verify-platform-backend` to assert required replay indexes exist in `pg_indexes`.
- Run `npm run db:deploy-readiness:platform-backend` for a one-command deploy readiness check (migrate deploy + index verify + live smoke).
- Run `npm run db:deploy-readiness:platform-backend:ci` in ephemeral DB environments (idempotent AF foundation preflight + apply when needed).
- Run `npm run db:deploy-readiness:platform-backend:ci:readonly` for CI-safe readiness checks without smoke writes.
- Set `AF_SKIP_SMOKE_WRITES=true` to run smoke in read-only mode (preflight + index checks, no inserts/updates).
- Run `npm run smoke:platform-backend:postgres:readonly` as a convenient read-only smoke alias.
- Script path: `scripts/smoke-platform-backend-postgres.ts`.
- Precondition: `public.af_*` foundation tables must exist (from `docs/backend/ALLFANTASY_BACKEND_FOUNDATION.sql`).
- CI jobs that provision Postgres test DBs now run both index apply and verify commands after schema setup.
- `npm run db:migrate:deploy` now also applies and verifies these supplemental indexes after Prisma migrations succeed.
- Dedicated CI workflow: `.github/workflows/platform-backend-deploy-readiness.yml`.
- Nightly write-mode CI workflow: `.github/workflows/platform-backend-deploy-readiness-nightly.yml`.
- Nightly workflow uploads `platform-backend-deploy-readiness-nightly-log` artifact on every run for canary triage.
- On nightly failure, workflow emits a warning and creates or updates a GitHub issue with run details.

## Production Notes

- Replace in-memory event bus with Postgres outbox + queue publisher.
- Use role/membership guards before every service mutation.
- Record immutable audit entries on commissioner and settings writes.
- Keep API controllers thin; all logic belongs to services.
