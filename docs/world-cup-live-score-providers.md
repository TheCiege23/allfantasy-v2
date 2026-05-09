# World Cup live score providers

This document complements the in-code capability matrix in `lib/world-cup/live-providers/worldCupLiveProviderTypes.ts` (`WORLD_CUP_LIVE_PROVIDER_CAPABILITY_MATRIX`).

## Recommended stack

| Priority | Provider | Role |
|----------|----------|------|
| 1 | **API-SPORTS / API-Football** (`api_sports`) | Primary — full soccer coverage, league/season scoped, live minute + penalties + FT flags |
| 2 | **TheSportsDB** (`thesportsdb`) | Fallback — schedule/event feeds; confirm WC league id + season string for your tier |
| 3 | **Reality Sports** (`reality_sports`) | Optional enterprise JSON bridge via `REALITY_SPORTS_WORLD_CUP_LIVE_URL` |
| 4 | **ClearSports** (`clear_sports`) | Optional JSON bridge via `CLEARSPORTS_WORLD_CUP_LIVE_URL` |
| 5 | **Manual JSON** (`manual`) | Final fallback — operator-controlled snapshot |

Override order with `WORLD_CUP_LIVE_PROVIDER_CHAIN` (space or comma separated), for example:

`api_sports,thesportsdb,manual`

## Environment variables

### API-SPORTS / API-Football (primary)

| Variable | Purpose |
|----------|---------|
| `API_SPORTS_KEY` / `API_FOOTBALL_KEY` / `RAPIDAPI_KEY` | Authentication (`x-apisports-key`) |
| `API_FOOTBALL_WORLD_CUP_LEAGUE_ID` / `API_SPORTS_WORLD_CUP_LEAGUE_ID` | FIFA WC competition id (defaults to `1` in client — **override for your competition**) |

### TheSportsDB

| Variable | Purpose |
|----------|---------|
| `THESPORTSDB_API_KEY` | v1 key-in-path |
| `THESPORTSDB_WORLD_CUP_LEAGUE_ID` | League/event series id for the tournament |
| `THESPORTSDB_WORLD_CUP_SEASON` | Optional season token (defaults `YYYY-(Y+1)` for soccer leagues) |

### Reality Sports / ClearSports (bridges)

| Variable | Purpose |
|----------|---------|
| `REALITY_SPORTS_WORLD_CUP_LIVE_URL` | HTTPS JSON endpoint (append `season=` query) |
| `REALITY_SPORTS_API_KEY` | Optional bearer / `x-api-key` |
| `CLEARSPORTS_WORLD_CUP_LIVE_URL` | HTTPS JSON endpoint |
| `CLEARSPORTS_API_KEY` | Optional bearer / `x-api-key` |

### Manual fallback

| Variable | Purpose |
|----------|---------|
| `WORLD_CUP_MANUAL_LIVE_JSON_BODY` | Inline JSON (array or `{ "matches": [] }`) |
| `WORLD_CUP_MANUAL_LIVE_JSON` | Absolute or repo-relative path to JSON file |

## Normalized live fields

All adapters normalize into `NormalizedWorldCupLiveMatch` (see `worldCupLiveProviderTypes.ts`), then `normalizedLiveMatchToProviderFixture` feeds `applyWorldCupLiveFixturesToChallenge` so bracket rows update consistently.

## Sync APIs

- **Bracket admin**: `POST /api/brackets/world-cup/[challengeId]/admin/sync-live` — defaults to multi-provider chain; set `"useLegacySingleProvider": true` for old single-provider sync.
- **Platform admin**: `POST /api/admin/world-cup/scores/sync-live` — body `{ "challengeId": "..." }`, optional `providerChain`.

## Pricing / limits (verify with vendors)

- **API-Football**: plan-based daily quotas (free tier historically ~100 req/day — confirm on dashboard).
- **TheSportsDB**: free tier ~30 req/min/IP; premium tiers higher.
- **Reality / ClearSports**: contract-dependent — use JSON bridges until native adapters are wired.
