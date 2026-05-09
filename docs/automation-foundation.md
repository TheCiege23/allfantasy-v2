# Automation foundation (Phase 1)

This phase adds **shared infrastructure** for app-wide fantasy automation: durable jobs, runs, audit logs, an SMS/email **outbox** (persist only), persisted **realtime** events (delivery later), distributed **locks** (Upstash Redis preferred, Neon fallback), and an **admin health** API.

It **does not** run waivers, draft ticks, scoring sync, trades, or league-concept batch logic yet—those phases call `runAutomationJob` and enqueue notifications/outbox rows through these primitives.

## What ships in Phase 1

| Area | Purpose |
| --- | --- |
| `AutomationJob` / `AutomationRun` | Idempotent job tracking, attempts, terminal states |
| `AutomationAuditLog` | Append-only automation audit trail |
| `NotificationOutbox` | Queue for future Resend/Twilio workers |
| `RealtimeEvent` | Cursor for future WebSocket / Supabase Realtime fan-out |
| `AutomationLock` | Mutex when Redis is unavailable |
| `lib/automation/*` | Types, idempotency, errors, audit helpers, locks, engine, notifications, realtime, health |
| `GET /api/admin/automation/health` | JSON summary for operators (admin-protected) |

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres (Prisma) |
| `DIRECT_URL` | Already used by Prisma migrations in this repo |

## Optional environment variables

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint for locks / future rate limits |
| `UPSTASH_REDIS_REST_TOKEN` | Bearer token paired with REST URL |
| `INNGEST_EVENT_KEY` | Future Inngest event signing (Phase 2+ workers) |
| `INNGEST_SIGNING_KEY` | Verify Inngest requests when using HTTP handlers |
| `RESEND_API_KEY` | Future email dispatch from `NotificationOutbox` |
| `TWILIO_ACCOUNT_SID` | Future SMS dispatch |
| `TWILIO_AUTH_TOKEN` | Future SMS dispatch |
| `TWILIO_PHONE_NUMBER` | Future SMS “from” number |

Secrets stay **server-side only**—never expose keys to the client.

## Neon / Prisma migration

After pulling these changes:

```bash
npm run db:migrate
```

Or deploy pipeline equivalent:

```bash
npm run db:migrate:deploy
```

This applies `prisma/migrations/20260509183000_automation_foundation/migration.sql`.

Then regenerate the client if needed:

```bash
npm run prisma:generate
```

## Optional Upstash Redis

1. Create an Upstash Redis database.
2. Copy **REST URL** → `UPSTASH_REDIS_REST_URL`.
3. Copy **REST token** → `UPSTASH_REDIS_REST_TOKEN`.
4. Deploy to Vercel (or local `.env`).

If these variables are **missing** or Redis errors occur, `lib/automation/locks.ts` falls back to the `AutomationLock` table in Postgres (with TTL via `expiresAt`).

## Future Inngest setup (outline)

1. Add the Inngest Next.js route handler (official SDK) when you wire workers.
2. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in Vercel.
3. Register functions that call `runAutomationJob` with stable `idempotencyKey` values per league/week/run.
4. Map each `AutomationJobType` string to one Inngest function or shared router.

Phase 1 deliberately avoids importing Inngest so the dependency surface stays minimal until workers exist.

## How future jobs should use `runAutomationJob`

1. Build a deterministic **`idempotencyKey`** (`buildIdempotencyKey` / `hashIdempotencyKey` from `lib/automation/idempotency.ts`).
2. Call `runAutomationJob` with `jobType` (e.g. `"waivers.processLeague"`) and optional `leagueId` / `metadata`.
3. Implement the handler to perform **one unit of work** (single league waiver batch, single draft tick, etc.).
4. Return `AutomationResult` with terminal `status`, or throw `RetryableAutomationError` / `FatalAutomationError`.

### Example — future waiver processing (pseudo-code)

```typescript
import { runAutomationJob } from "@/lib/automation/engine"
import { buildIdempotencyKey, hashIdempotencyKey } from "@/lib/automation/idempotency"

const raw = buildIdempotencyKey(["waivers.processLeague", leagueId, season, week])
const idempotencyKey = hashIdempotencyKey(raw)

await runAutomationJob(
  {
    jobType: "waivers.processLeague",
    leagueId,
    idempotencyKey,
    metadata: { season, week },
  },
  async () => {
    // Phase 2+: call waiver engine, persist claims, enqueue notifications.
    return { status: "completed", message: "Waiver batch finished" }
  }
)
```

Same pattern applies to **`draft.tick`**, **`scoring.sync`**, **`trades.process`**, and **`leagueConcept.*`** jobs—swap handler contents only.

## Troubleshooting

| Symptom | Likely cause | Mitigation |
| --- | --- | --- |
| Prisma errors on new models | Migration not applied | Run `npm run db:migrate:deploy` on Neon |
| Duplicate idempotency key | Same logical job retried with identical key | Expected skip/completed path; widen key parts if collisions are real |
| Locks always failing | Another worker holds Redis/DB lock | Inspect `AutomationLock` rows and TTL; shorten job duration |
| Redis errors swallowed | Network / token issue | Fix env vars; Postgres fallback should still work |
| Admin health 401 | Not authenticated | Use admin session cookie or bearer token per `requireAdminOrBearer` |

## API

- **`GET /api/admin/automation/health`** — JSON from `getAutomationHealthSummary()` (pending/running jobs, 24h failures/completions, notification outbox counts, latest run per `jobType`).

Admin UI was **not** added: there is no existing `app/admin/page.tsx` shell in this repo (only league-scoped admin); operators should use the API or add a page later.
