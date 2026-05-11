# Waiver automation (Phase 2)

Automated waiver batches reuse the **existing processor** `processWaiverClaimsForLeague` from `lib/waiver-wire/process-engine.ts` (the same engine invoked by `POST /api/waiver-wire/leagues/[leagueId]/process`). Phase 2 adds:

- **Discovery** — `discoverDueWaiverLeagues` (`lib/automation/jobs/waivers/discoverDueWaiverLeagues.ts`)
- **Orchestration** — `processLeagueWaiversJob` → `runAutomationJob` + `withAutomationLock("waiver:league:{id}")`
- **Cron** — `GET /api/cron/waivers`
- **Admin/commissioner** — `POST /api/admin/automation/waivers/run`
- **Status** — `GET /api/admin/automation/waivers/status`

Persist-only side effects: **`NotificationOutbox`** and **`RealtimeEvent`** rows (no Resend/Twilio/WebSockets in this phase).

## Common waiver options

| Type | Description | Commissioner-priority |
| --- | --- | --- |
| **FAAB Bidding** | Teams submit sealed bids; highest bid wins. Most competitive. | ✅ Recommended first |
| **Rolling Waivers** | Successful claim drops priority to last; fair over time. | ✅ Recommended |
| **Reverse Standings** | Worst record gets first waiver priority each week. | ✅ Recommended |
| Standard / FCFS | First-come-first-served or standard priority. Supported by engine. | Legacy; not promoted |

FCFS claims are processed at claim submit time, not via the batch cron.

## What is free (no subscription required)

- All basic waiver processing (cron, admin, commissioner manual run).
- Submitting and cancelling waiver claims.
- Viewing waiver runs and history.
- All waiver types (FAAB, Rolling, Reverse Standings, Standard, FCFS).

## What requires AF Pro

See [docs/af-pro-waiver-ai.md](./af-pro-waiver-ai.md).

## User-facing waiver UI status

Waiver automation status is surfaced in the league waiver wire page (`components/waiver-wire/WaiverWirePage.tsx`) using existing API fields only:

- next waiver processing deadline (`state.nextRunAt`)
- waiver type (`settings.waiverType`)
- user FAAB remaining (FAAB leagues)
- user waiver priority (rolling/reverse leagues)
- pending claim count
- last processed timestamp (derived from processed transactions)

No background jobs are scheduled from UI actions in this phase.

## Claim result visibility in UI

Processed claims are visible in history tabs from existing waiver-wire APIs:

- won claims (successful add/drop transaction rows)
- lost claims (failed claim rows)
- FAAB spent (when present)
- failure reason (when present)
- processing timestamp

No new backend endpoint was added for this display.

## AI panels and manual control

AI panels on the waiver surface remain recommendation-only:

- personal AF Pro recommendations panel
- commissioner AF Commissioner insights panel

These panels do not auto-submit waiver claims and do not auto-apply league settings changes.

Reminder UI includes a placeholder "Waiver deadline reminders" toggle for AF Pro users only; no email/SMS scheduling is performed in this task.

## How it works

1. **Discovery** loads leagues with **`WaiverClaim.status = pending`**, skips **`LeagueWaiverState.processingLocked`**, skips active **`WaiverRun.status = running`**, skips **`fcfs`** leagues (claims are handled at submit time per engine docs), and applies **`nextRunAt`** when present (skip if `now < nextRunAt`). If **`nextRunAt` is null**, leagues with pending claims are still eligible (**conservative fallback** until state backfills).

2. **Per league**, `processLeagueWaiversJob` builds a **stable idempotency key** per UTC **date bucket**:  
   `hashIdempotencyKey(buildIdempotencyKey(["waivers.processLeague", leagueId, YYYY-MM-DD]))`  
   This aligns with the processor's optional **`idempotencyKey`** metadata on `WaiverRun` (duplicate completed runs short-circuit).

3. **Locking** prevents overlapping cron/admin runs for the same league (`waiver:league:{leagueId}`).

4. **Notifications** enqueue **`WAIVER_PROCESSING_COMPLETE`** (`league_chat`), **`WAIVER_CLAIM_WON` / `WAIVER_CLAIM_FAILED`** (`in_app`) when roster → `platformUserId` resolves.

5. **Realtime** writes **`waivers.processing.*`** and **`waivers.claim.*`** events for future delivery.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres |
| `CRON_SECRET` | Bearer auth for `/api/cron/waivers` |

Optional:

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Prefer Redis for automation locks |
| `UPSTASH_REDIS_REST_TOKEN` | Pair with Redis URL |

## CRON_SECRET

Generate a long random string and set it in Vercel **Environment Variables** for Production/Preview. Cron requests must send:

```http
Authorization: Bearer <CRON_SECRET>
```

## Upstash Redis

Create an Upstash Redis database; set **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`**. If unset, locks fall back to the **`AutomationLock`** Postgres table (`lib/automation/locks.ts`).

## Local testing

```bash
# Terminal — replace TOKEN with your CRON_SECRET
curl -s "http://localhost:3000/api/cron/waivers?dryRun=true&secret=TOKEN"

curl -s -H "Authorization: Bearer TOKEN" "http://localhost:3000/api/cron/waivers?dryRun=true"

curl -s -H "Authorization: Bearer TOKEN" "http://localhost:3000/api/cron/waivers?limit=5"
```

Query param **`secret`** is **ignored in production** (Bearer only).

Admin manual run (session cookie or bearer per `requireAdminOrBearer`):

```bash
curl -s -X POST http://localhost:3000/api/admin/automation/waivers/run \
  -H "Content-Type: application/json" \
  -d "{\"leagueId\":\"YOUR_LEAGUE_ID\",\"dryRun\":true}"
```

Commissioner self-run (authenticated user who is league owner):

```bash
# No bearer needed — session cookie from logged-in commissioner
curl -s -X POST http://localhost:3000/api/admin/automation/waivers/run \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d "{\"leagueId\":\"YOUR_LEAGUE_ID\",\"dryRun\":false}"
```

Admin status check:

```bash
curl -s -H "Authorization: Bearer TOKEN" "http://localhost:3000/api/admin/automation/waivers/status"
```

## Idempotency / duplicate protection

- **Automation layer**: `AutomationJob.idempotencyKey` prevents duplicate automation completions for the same league + UTC date bucket.
- **Processor layer**: `processWaiverClaimsForLeague` skips work if a completed **`WaiverRun`** already recorded the same **`idempotencyKey`** in metadata (`process-engine.ts`).

Together, retries (Vercel cron overlap, transient failures) should not double-award claims.

## Notifications & realtime today

All rows are **queued/stored only**. A future worker will dispatch **Resend/Twilio** from **`NotificationOutbox`**; realtime transports will read **`RealtimeEvent`**.

## Vercel Cron

This repo's **`vercel.json`** includes:

```json
{
  "path": "/api/cron/waivers",
  "schedule": "*/5 * * * *"
}
```

**Note:** `vercel.json` still references many legacy cron paths; only routes that exist in `app/api/**` will execute. `/api/cron/waivers` is implemented here.

Ensure **`CRON_SECRET`** is set in Vercel so the handler authorizes.

## Intentionally not implemented

- **Inngest** (use cron + `/api/cron/waivers` until workers land).
- **Draft / scoring / league-concept** automation.
- **Outgoing email/SMS/push** delivery from outbox.
- **WebSocket / Supabase Realtime** consumers for `RealtimeEvent`.
- **Replacing** `POST /api/waiver-wire/leagues/[leagueId]/process` — manual/commissioner flows remain unchanged.

## Prisma models touched at runtime

- `WaiverClaim`, `WaiverRun`, `WaiverResult`, `WaiverTransaction`, `LeagueWaiverState`, `Roster`, `League`
- Automation: `AutomationJob`, `AutomationRun`, `AutomationAuditLog`, `NotificationOutbox`, `RealtimeEvent`, `AutomationLock`

No new Prisma migration is required for Phase 2.

## How it works

1. **Discovery** loads leagues with **`WaiverClaim.status = pending`**, skips **`LeagueWaiverState.processingLocked`**, skips active **`WaiverRun.status = running`**, skips **`fcfs`** leagues (claims are handled at submit time per engine docs), and applies **`nextRunAt`** when present (skip if `now < nextRunAt`). If **`nextRunAt` is null**, leagues with pending claims are still eligible (**conservative fallback** until state backfills).

2. **Per league**, `processLeagueWaiversJob` builds a **stable idempotency key** per UTC **date bucket**:  
   `hashIdempotencyKey(buildIdempotencyKey(["waivers.processLeague", leagueId, YYYY-MM-DD]))`  
   This aligns with the processor’s optional **`idempotencyKey`** metadata on `WaiverRun` (duplicate completed runs short-circuit).

3. **Locking** prevents overlapping cron/admin runs for the same league (`waiver:league:{leagueId}`).

4. **Notifications** enqueue **`WAIVER_PROCESSING_COMPLETE`** (`league_chat`), **`WAIVER_CLAIM_WON` / `WAIVER_CLAIM_FAILED`** (`in_app`) when roster → `platformUserId` resolves.

5. **Realtime** writes **`waivers.processing.*`** and **`waivers.claim.*`** events for future delivery.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres |
| `CRON_SECRET` | Bearer auth for `/api/cron/waivers` |

Optional:

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Prefer Redis for automation locks |
| `UPSTASH_REDIS_REST_TOKEN` | Pair with Redis URL |

## CRON_SECRET

Generate a long random string and set it in Vercel **Environment Variables** for Production/Preview. Cron requests must send:

```http
Authorization: Bearer <CRON_SECRET>
```

## Upstash Redis

Create an Upstash Redis database; set **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`**. If unset, locks fall back to the **`AutomationLock`** Postgres table (`lib/automation/locks.ts`).

## Local testing

```bash
# Terminal — replace TOKEN with your CRON_SECRET
curl -s "http://localhost:3000/api/cron/waivers?dryRun=true&secret=TOKEN"

curl -s -H "Authorization: Bearer TOKEN" "http://localhost:3000/api/cron/waivers?dryRun=true"

curl -s -H "Authorization: Bearer TOKEN" "http://localhost:3000/api/cron/waivers?limit=5"
```

Query param **`secret`** is **ignored in production** (Bearer only).

Admin manual run (session cookie or bearer per `requireAdminOrBearer`):

```bash
curl -s -X POST http://localhost:3000/api/admin/automation/waivers/run \
  -H "Content-Type: application/json" \
  -d "{\"leagueId\":\"YOUR_LEAGUE_ID\",\"dryRun\":true}"
```

## Idempotency / duplicate protection

- **Automation layer**: `AutomationJob.idempotencyKey` prevents duplicate automation completions for the same league + UTC date bucket.
- **Processor layer**: `processWaiverClaimsForLeague` skips work if a completed **`WaiverRun`** already recorded the same **`idempotencyKey`** in metadata (`process-engine.ts`).

Together, retries (Vercel cron overlap, transient failures) should not double-award claims.

## Notifications & realtime today

All rows are **queued/stored only**. A future worker will dispatch **Resend/Twilio** from **`NotificationOutbox`**; realtime transports will read **`RealtimeEvent`**.

## Vercel Cron

This repo’s **`vercel.json`** includes:

```json
{
  "path": "/api/cron/waivers",
  "schedule": "*/5 * * * *"
}
```

**Note:** `vercel.json` still references many legacy cron paths; only routes that exist in `app/api/**` will execute. `/api/cron/waivers` is implemented here.

Ensure **`CRON_SECRET`** is set in Vercel so the handler authorizes.

## Intentionally not implemented

- **Inngest** (use cron + `/api/cron/waivers` until workers land).
- **Draft / scoring / league-concept** automation.
- **Outgoing email/SMS/push** delivery from outbox.
- **WebSocket / Supabase Realtime** consumers for `RealtimeEvent`.
- **Replacing** `POST /api/waiver-wire/leagues/[leagueId]/process` — manual/commissioner flows remain unchanged.

## Prisma models touched at runtime

- `WaiverClaim`, `WaiverRun`, `WaiverResult`, `WaiverTransaction`, `LeagueWaiverState`, `Roster`, `League`
- Automation: `AutomationJob`, `AutomationRun`, `AutomationAuditLog`, `NotificationOutbox`, `RealtimeEvent`, `AutomationLock`

No new Prisma migration is required for Phase 2.
