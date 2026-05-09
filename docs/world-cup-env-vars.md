# World Cup Bracket — Environment Variables

Values are read at runtime on the server unless noted. Keep secrets out of client bundles.

---

## Database & jobs

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection for Prisma (bracket challenges, matches, picks, leaderboard rows). |
| `CRON_SECRET` | Bearer token for secured cron routes (e.g. `GET /api/cron/world-cup-bracket-reminders`). Send header `Authorization: Bearer <CRON_SECRET>`. |

---

## Live scoring provider chain

| Variable | Purpose |
|----------|---------|
| `WORLD_CUP_LIVE_PROVIDER_CHAIN` | Space- or comma-separated provider IDs tried **in order** until one returns matches: `api_sports`, `thesportsdb`, `reality_sports`, `clear_sports`, `manual`. Default chain is defined in `lib/world-cup/live-providers/worldCupLiveProviderTypes.ts`. |

### API-Sports (API-Football)

| Variable | Purpose |
|----------|---------|
| `API_SPORTS_KEY` | Primary key name used by live + fixture sync code paths (also accepts `API_FOOTBALL_KEY`, `APISPORTS_FOOTBALL_KEY`, `RAPIDAPI_KEY` in some modules — see `lib/world-cup/apiSportsWorldCup.ts`). |
| `API_FOOTBALL_WORLD_CUP_LEAGUE_ID` / `API_SPORTS_WORLD_CUP_LEAGUE_ID` | League id for World Cup in API-Football (default `"1"` if unset). |

### TheSportsDB

| Variable | Purpose |
|----------|---------|
| `THESPORTSDB_API_KEY` | Optional premium key for TheSportsDB v1 API. |
| `THESPORTSDB_WORLD_CUP_LEAGUE_ID` | League identifier for World Cup within TheSportsDB. |

### Reality Sports & Clear Sports (custom HTTP adapters)

| Variable | Purpose |
|----------|---------|
| `REALITY_SPORTS_WORLD_CUP_LIVE_URL` | URL template or base URL for Reality Sports live feed (adapter must be configured). |
| `REALITY_SPORTS_API_KEY` | Auth token for Reality Sports requests (if required by deployment). |
| `CLEARSPORTS_WORLD_CUP_LIVE_URL` | URL template for Clear Sports live feed. |
| `CLEARSPORTS_API_KEY` | Auth key for Clear Sports (if required). |

### Manual override (operators)

| Variable | Purpose |
|----------|---------|
| `WORLD_CUP_MANUAL_LIVE_JSON` | Path on disk to JSON payload for **manual** live provider. |
| `WORLD_CUP_MANUAL_LIVE_JSON_BODY` | Inline JSON string (alternative to file path). Same normalized schema as other manual imports. |

---

## League behavior & security

| Variable | Purpose |
|----------|---------|
| `WORLD_CUP_PUBLIC_PICKS_BEFORE_LOCK` | Set to `"true"` to allow commissioners to expose “everyone’s picks before lock” where product rules permit (`worldCupPublicPicksEarlyGloballyAllowed()`). |
| `WORLD_CUP_JOIN_SECRET` | Used with `AUTH_SECRET` / `NEXTAUTH_SECRET` as fallback material for **join password hashing** (see `worldCupBracketSettingsService`). |

---

## Data provider (teams / fixtures import)

| Variable | Purpose |
|----------|---------|
| `WORLD_CUP_DATA_PROVIDER` | Selects world cup **data** provider implementation (`lib/world-cup/worldCupDataProvider.ts`). |

---

## Bracket Brain & AI (optional)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for generative Bracket Brain copy and some matchup intelligence when enabled. |
| `WORLD_CUP_BRAIN_MODEL` | Optional OpenAI model override (default `gpt-4o-mini` in commissioner brain service). |

**Entitlement:** Bracket Brain AI features require AF Pro / `league_ai_coaching` resolution via `EntitlementResolver` (`lib/bracket-brain/bracketBrainAccess.ts`), not only an API key.

---

## Dev-only QA routes

| Variable | Purpose |
|----------|---------|
| `WORLD_CUP_DEV_QA_SECRET` | When **not** in `development`, protects `/api/dev/world-cup/*`: send `Authorization: Bearer <WORLD_CUP_DEV_QA_SECRET>`. Local dev allows calls without this secret. |

---

## NextAuth (session for bracket APIs)

Bracket routes expect an authenticated user (`requireWorldCupApiUser`). Configure at least one of:

- `NEXTAUTH_SECRET` / `AUTH_SECRET`
- Provider keys as used by your deployment

See your environment template for the full auth surface.
