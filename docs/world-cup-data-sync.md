# World Cup Bracket — Data Sync Guide

This document explains the provider abstraction, sync service, admin routes, and operational notes for populating and maintaining World Cup bracket data.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Admin UI / cron job                                │
│  WorldCupBracketShell (sync controls panel)         │
└──────────────────────┬──────────────────────────────┘
                       │ POST
           ┌───────────▼─────────────────────┐
           │  Admin API Routes (App Router)   │
           │  /admin/sync-teams               │
           │  /[id]/admin/sync-fixtures        │
           │  /[id]/admin/sync-live            │
           └───────────┬─────────────────────┘
                       │
           ┌───────────▼───────────────────────────────┐
           │  worldCupDataSyncService.ts               │
           │  syncWorldCupTeams()                       │
           │  syncWorldCupFixtures()                    │
           │  syncWorldCupLiveScores()                  │
           └───────────┬───────────────────────────────┘
                       │
           ┌───────────▼───────────────────────────────┐
           │  Provider (WorldCupDataProvider interface) │
           │                                           │
           │  mockWorldCupProvider       ← default     │
           │  apiFootballWorldCupProvider← api-sports  │
           │  sportsDataWorldCupProvider ← scaffold    │
           └───────────┬───────────────────────────────┘
                       │ (external API — ingest only)
           ┌───────────▼───────────────────────────────┐
           │  Postgres / Supabase DB                   │
           │  WorldCupTeam, WorldCupBracketMatch, etc. │
           └───────────────────────────────────────────┘
```

The DB is the **single source of truth** for all user-facing data. External API calls happen only during ingestion (admin routes or scheduled jobs), never from user-facing routes.

---

## 2. Provider Selection

Set the `WORLD_CUP_DATA_PROVIDER` environment variable:

| Value | Provider | When to use |
|-------|----------|-------------|
| `mock` _(default)_ | Returns empty data, never crashes | Local dev, CI, staging without API keys |
| `apifootball` | api-football.com / api-sports.io | Production with valid `API_SPORTS_KEY` |
| `sportsdata` | SportsData.io | If you have a SportsData subscription (requires setup) |
| `manual` | Same as mock | Production with manual data entry only |

The factory (`getWorldCupDataProvider()` in `lib/world-cup/worldCupDataProvider.ts`) reads this env var and returns the correct provider. Admin routes also accept a `provider` field in the request body to override the env var for one-off calls.

---

## 3. Sync Service Functions

All functions live in `lib/world-cup/worldCupDataSyncService.ts`.

### `syncWorldCupTeams(options)`

Fetches all teams from the provider and upserts them into the `WorldCupTeam` table.

- **Matches by**: `apiTeamId` (if present), then `fifaCode`
- **Options**: `{ provider?, dryRun?, seasonYear? }`
- **Returns**: `{ created, updated, skipped, warnings, teams[] }`
- **Never deletes** existing teams

### `syncWorldCupFixtures(options)`

Fetches all fixtures and updates `WorldCupBracketMatch` rows.

- **Matches by**: `apiFixtureId`, then `(round + roundIndex)` fallback
- **Auto-upserts** unknown teams if not yet in DB
- **Auto-infers** `pickLockAt` from the earliest `startsAt` if not already set on the challenge
- **Never overwrites** user picks, entry data, or winner fields set by the recalculate engine
- **Options**: `{ challengeId, provider?, dryRun?, seasonYear? }`
- **Returns**: `{ created, updated, skipped, warnings, lockTimeInferred, fixtures[] }`

### `syncWorldCupLiveScores(options)`

Updates score and status fields for in-progress matches.

- **Updates**: `homeScore`, `awayScore`, `homePenaltyScore`, `awayPenaltyScore`, `status`, `statusMinute`
- **On `final`**: sets `winnerTeamId` and advances winner to the next bracket slot
- **Triggers**: `recalculateWorldCupChallenge()` if `recalculate=true` and at least one final match was found
- **Never overwrites**: existing final results; skips matches already marked final unless score changed
- **Options**: `{ challengeId, provider?, dryRun?, recalculate?, seasonYear? }`
- **Returns**: `{ updated, skipped, finalMatches, recalculated, warnings }`

---

## 4. Admin API Routes

All routes require NextAuth session with admin or owner role. Requests must be authenticated.

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/brackets/world-cup/admin/sync-teams` | POST | Site admin | Sync all teams globally |
| `/api/brackets/world-cup/[challengeId]/admin/sync-fixtures` | POST | Owner or admin | Sync fixtures for a challenge |
| `/api/brackets/world-cup/[challengeId]/admin/sync-live` | POST | Owner or admin | Sync live scores for a challenge |

### Request Body (all routes)

```json
{
  "provider": "apifootball",   // optional — overrides WORLD_CUP_DATA_PROVIDER
  "dryRun": true,              // optional — no DB writes, returns what would change
  "recalculate": true,         // sync-live only — triggers leaderboard recalculation
  "seasonYear": 2026           // optional — override fixture season year
}
```

### Response Shape

```json
{
  "ok": true,
  "created": 32,
  "updated": 0,
  "skipped": 0,
  "warnings": [],
  "syncedAt": "2025-06-14T10:00:00.000Z",
  "dryRun": false
}
```

---

## 5. Dry-Run Mode

Set `"dryRun": true` in any sync request body. In dry-run mode:

- The provider is called and data is fetched normally
- **No writes** are made to the database
- The response shows what _would_ have been created/updated/skipped
- Warnings are still returned
- Safe to use in production for validation before a real sync

---

## 6. Status Normalization

`normalizeWorldCupProviderStatus(raw)` in `lib/world-cup/worldCupMatchStatus.ts` maps provider-specific status codes to the canonical internal type:

| Internal status | Provider codes |
|----------------|----------------|
| `final` | `FT`, `AET`, `PEN`, `FT_PEN` |
| `halftime` | `HT` |
| `live` | `1H`, `2H`, `ET`, `E1`, `E2`, `P`, `LIVE`, `EXTRA_TIME` |
| `postponed` | `PST`, `SUSP`, `INT` |
| `cancelled` | `CANC`, `ABD`, `AWD`, `WO` |
| `scheduled` | `NS`, `TBD`, anything else |

---

## 7. Safety Rules

1. **Never overwrites user picks** — `WorldCupBracketPick` rows are never touched by sync
2. **Never deletes existing data** — all operations are upserts
3. **Never clears winner fields** once set by recalculate engine (unless score actually changed)
4. **Mock provider** returns empty data and never throws — safe for CI and local dev
5. **External API calls are server-side only** — providers are called from API routes and jobs, never from client components

---

## 8. Scheduled Job Recommendation

During the tournament, sync live scores every 2–5 minutes per active challenge while matches are in progress. Example cron-style setup:

```
# /api/brackets/world-cup/[challengeId]/admin/sync-live
# body: { "provider": "apifootball", "recalculate": true }
# frequency: every 3 minutes during match windows
```

The existing `/api/brackets/world-cup/sync` route (pre-existing basic sync) can continue to run on its own schedule for full fixture refresh.

---

## 9. Provider Development Notes

### API-Football (`apiFootballWorldCupProvider.ts`)

Wraps `lib/world-cup/apiSportsWorldCup.ts`. Requires:
- `API_SPORTS_KEY` or `API_FOOTBALL_KEY` env var
- FIFA World Cup competition ID = `1` (production) — verified for api-football.com

**Known TODO**: `getLiveFixtures()` currently filters full fixture list to live statuses. The `?live=all` endpoint from api-football can be added to `apiSportsWorldCup.ts` for efficiency.

### SportsData.io (`sportsDataWorldCupProvider.ts`)

Scaffold only — all methods throw `WorldCupProviderConfigError` until endpoints are verified. Requires:
- `SPORTSDATA_API_KEY`
- `SPORTSDATA_WORLD_CUP_COMPETITION_ID`

### Mock / Manual (`mockWorldCupProvider.ts`)

Returns empty arrays for all methods. Use `manual` or `mock` as `WORLD_CUP_DATA_PROVIDER` and seed data directly via Prisma Studio or migration scripts.

---

## 10. Related Files

| File | Purpose |
|------|---------|
| `lib/world-cup/worldCupDataProvider.ts` | Provider interface + factory |
| `lib/world-cup/providers/mockWorldCupProvider.ts` | Safe no-op provider |
| `lib/world-cup/providers/apiFootballWorldCupProvider.ts` | API-Football wrapper |
| `lib/world-cup/providers/sportsDataWorldCupProvider.ts` | SportsData.io scaffold |
| `lib/world-cup/worldCupDataSyncService.ts` | Core sync functions |
| `lib/world-cup/worldCupMatchStatus.ts` | `normalizeWorldCupProviderStatus()` |
| `lib/world-cup/worldCupClientApi.ts` | Client-side `adminSync*` helpers |
| `lib/world-cup/apiSportsWorldCup.ts` | Low-level API-Football HTTP client (kept intact) |
| `lib/world-cup/worldCupSyncService.ts` | Pre-existing basic sync (kept intact) |
| `app/api/brackets/world-cup/admin/sync-teams/route.ts` | Teams sync route |
| `app/api/brackets/world-cup/[challengeId]/admin/sync-fixtures/route.ts` | Fixtures sync route |
| `app/api/brackets/world-cup/[challengeId]/admin/sync-live/route.ts` | Live scores route |
| `docs/world-cup-bracket-launch-checklist.md` | Full pre-launch checklist with sync commands |
