# DB-First Provider Closeout Audit

Date: 2026-04-27

## Executive Summary

This closeout audit classifies the current provider/runtime surfaces using the Phase 6 rubric:

- A: DB-first complete
- B: DB-first partial
- C: Intentionally live user-triggered action
- D: Intentionally live background sync/cron
- E: Legacy duplicate/inert route left untouched
- F: Still bad: page-load live API call
- G: Still bad: AI call without AiResult cache
- H: Still bad: rebuilds player pool per request
- I: Still bad: image/logo/media not read from DB/cache

Current state is materially better than the raw architecture audit counts suggest. The active high-traffic slices migrated in Phases 2A-5B are now DB-first or cache-first:

- deterministic AI routes now use `AiResult`
- Sleeper dashboard strips now read through `SportsDataCache`
- ESPN mock-draft news adjustment now rides `SportsDataCache`
- weather and chat weather enrichment now ride `WeatherCache`
- NewsAPI runtime helpers now read from `SportsNews` and `SportsDataCache`
- live draft pool, mock draft pool, and dispersal preview pool now use `DraftPoolCache`

The remaining work is concentrated in three buckets:

1. real legacy start/sit JS routes that still do live page-load fetches
2. legacy or specialty AI surfaces that still call models without `AiResult`
3. specialty draft endpoints outside the shared draft-pool cache path

The automated baseline in `docs/DB_FIRST_ARCHITECTURE_AUDIT_2026-04-27.md` remains useful as a broad detector, but some findings are now heuristic false positives because the route still contains a rebuild helper behind a DB/cache wrapper.

## DB-First Wins Completed

### Shared caches and boundaries

- `AiResult`: deterministic AI cache helper in `lib/ai/ai-result-cache.ts`
- `SportsDataCache`: shared sports/news/ESPN/Sleeper data cache via `lib/sports-router.ts`, `lib/workers/api-chain.ts`, and related helpers
- `WeatherCache`: cache-first weather reads via `lib/weather/weatherService.ts`
- `DraftPoolCache`: live, mock, and specialty pool caching via:
  - `app/api/leagues/[leagueId]/draft/pool/route.ts`
  - `lib/mock-draft/mock-draft-pool-cache.ts`
  - `lib/draft-room/specialty-draft-pool-cache.ts`

### Phase-complete active runtime surfaces

- Trade/Waiver deterministic AI routes: `AiResult` complete
- Mock draft deterministic AI routes: `AiResult` complete
- Sleeper dashboard waiver/trade strips: `SportsDataCache` complete
- ESPN mock-draft news adjuster: cache-first via `lib/mock-draft/adp-realtime-adjuster.ts`
- Weather game/chat enrichment: `WeatherCache` complete
- NewsAPI DB-first helper path: `lib/news/newsapi-cache.ts`
- Mock draft pool: `DraftPoolCache` complete
- Dispersal preview asset pool: `DraftPoolCache` complete

## Provider / Surface Classification

| Surface | Classification | Concrete owners | Notes |
| --- | --- | --- | --- |
| `AiResult` deterministic route pattern | A | `lib/ai/ai-result-cache.ts`, `app/api/instant/improve-trade/route.ts`, `app/api/mock-draft/needs/route.ts`, `app/api/mock-draft/ai-pick/route.ts`, `app/api/legacy/waiver/analyze/route.ts` | Active deterministic AI paths now cache by feature/scope/provider/model/payload hash. |
| Trade improve suggestions | A | `app/api/instant/improve-trade/route.ts` | Cache-first deterministic branch uses `getOrCreateAiResult`; only streaming/real-time mode stays live by design. |
| Sleeper dashboard strips | A | `lib/dashboard-strip/fetchWaiverDashboard.ts`, `lib/dashboard-strip/fetchTradesDashboard.ts` | Runtime reads from `SportsDataCache`; direct provider pressure moved off page load. |
| `SportsDataCache` router | B | `lib/sports-router.ts`, `lib/workers/api-chain.ts` | DB/cache first, but still allows live provider fallback on miss/stale. This is acceptable for ingestion-style helpers but not always ideal for page-load callers. |
| API-Sports provider ingestion | D | `lib/api-sports.ts`, `lib/workers/providers/api-sports.ts`, `lib/workers/api-chain.ts` | Correct place for direct upstream reads is ingestion/background/provider layer. |
| ESPN provider ingestion/read-through cache | B | `lib/mock-draft/adp-realtime-adjuster.ts`, `lib/workers/api-chain.ts` | Active mock-draft path now caches ESPN news rows in `SportsDataCache`, but still does live ESPN fetch on cold miss. |
| NewsAPI runtime helper | B | `lib/news/newsapi-cache.ts` | Reads `SportsNews` first, then `SportsDataCache` stale fallback, then live refresh on miss. Much improved, but not pure DB-only. |
| NewsAPI ingestion | D | `lib/workers/newsapi-ingestion.ts` | Correct direct live usage for background sync. |
| Weather cache-first helper | B | `lib/weather/weatherService.ts`, `app/api/weather/game/route.ts`, `app/api/sports/weather/route.ts`, `app/api/start-sit/weather/route.ts` | `WeatherCache` first with live refresh on miss/stale. Correct cache-first pattern; not strict DB-only. |
| Weather refresh cron | D | `app/api/weather/refresh-cron/route.ts` | Intended background warmer for upcoming games. |
| Legacy weather route | E, F | `app/api/start-sit/weather.route.js` | Old JS endpoint still calls OpenWeather directly on request and bypasses `WeatherCache`. Active App Router owner is `app/api/start-sit/weather/route.ts`. |
| Payments: Stripe checkout/session creation | C | `app/api/stripe/create-checkout-session/route.ts`, `app/api/bracket/stripe/checkout/route.ts`, `app/api/subscription/billing-portal/route.ts`, `app/api/donate/route.ts`, `app/api/leagues/[leagueId]/finance/entry-checkout/route.ts` | Intentionally live, user-triggered external action. Not a DB-first violation. |
| Payments: Stripe webhooks | D | `app/api/stripe/webhook/route.ts`, `app/api/bracket/stripe/webhook/route.ts` | Intentionally live inbound webhook handlers that persist state to DB. |
| Payments: PayPal/Coinbase | E | `app/api/test-keys/route.ts`, `lib/league-finance/manualPaymentPresets.ts` | No active runtime integration found beyond env diagnostics and manual-rail presets. |
| Live draft pool route | A | `app/api/leagues/[leagueId]/draft/pool/route.ts` | DB `DraftPoolCache` first, memory fallback second, rebuild only on miss, persists result back to DB. |
| Mock draft pool route | A | `app/api/mock-draft/adp/route.ts`, `lib/mock-draft/mock-draft-pool-cache.ts` | Shared `DraftPoolCache` wrapper proven with same-fingerprint rebuild then DB hit. |
| Dispersal preview asset pool | A | `app/api/leagues/[leagueId]/dispersal-draft/preview/route.ts`, `lib/draft-room/specialty-draft-pool-cache.ts` | Specialty pool now cached in `DraftPoolCache` and no longer rebuilt every preview request. |
| Specialty boards through shared live route | A | `app/api/leagues/[leagueId]/draft/pool/route.ts`, `lib/draft-room/getResolvedDraftPoolForLeague.ts` | Rookie/devy/C2C pool types on the shared live route are now under the cached live draft pool path. |
| Standalone devy draft endpoint | H | `app/api/devy/draft/route.ts` | Calls `buildAnnualDraftPool` on each request; not yet on `DraftPoolCache`. |
| Legacy devy board route | E, G | `app/api/legacy/devy-board/route.ts` | Legacy route still does direct OpenAI-based reasoning without `AiResult`; not part of the modern cached path. |
| Legacy start/sit injuries route | E | `app/api/start-sit/injuries.route.js` | Inert duplicate. Runtime `GET /api/start-sit/injuries` resolves to `app/api/start-sit/injuries/route.ts`, which reads `getInjuryReport()` and serves DB-backed/demo fallback output instead of the legacy live provider cascade. |
| Legacy start/sit roster route | E | `app/api/start-sit/roster.route.js` | Inert duplicate. Runtime `GET /api/start-sit/roster` resolves to `app/api/start-sit/roster/route.ts`, which serves linked-league/demo output and does not execute the legacy live provider cascade. |
| Player/news DB reads for chat/injury dashboards | A | `lib/chat-data-enrichment.ts`, `app/api/dashboard/ai-tools/injury-brief/route.ts`, `lib/chimmy/chimmy-sport-data-digest.ts` | Reads from `SportsNews`, `SportsInjury`, and cache-backed helpers. |
| Legacy news emergency fallback helper | B | `lib/upstream-apis.ts` | Annotated DB-first exception fallback when DB news is empty. Better than direct route usage, but still a live escape hatch. |
| Image/logo/headshot runtime | B, I | `lib/workers/api-chain.ts`, `lib/api-sports.ts`, `lib/openweathermap.ts` | Many media rows are DB/cached, but the broad audit still finds lots of image/media direct URLs and fallback lookups. This remains a large cleanup class. |
| AI commissioner / specialty AI services | G | `lib/ai-commissioner/AICommissionerService.ts`, `lib/unified-ai/index.ts`, `lib/trade-value-console/runTradeConsoleAnalysis.ts`, `app/api/instant/trade/route.ts` | Representative direct model call sites still outside `AiResult`. |

## Remaining Intentional Live Paths

These are acceptable and should not be treated as DB-first regressions.

### C. Intentionally live user-triggered actions

- Stripe checkout session creation and billing portal routes
- any explicit streaming/chat AI route where the product requires live model output
- user-triggered refresh branches where the route is not a page-load data dependency and the response is the live action itself

### D. Intentionally live background sync/cron

- sports/news provider ingestion workers
- weather refresh cron
- Stripe webhook handlers
- draft/cache warming scripts

## Remaining Risks

### Real remaining bad paths

1. Legacy JS start/sit routes still issue live third-party page-load calls.
2. Some legacy/specialty AI services still call providers directly without `AiResult`.
3. Standalone devy draft endpoint still rebuilds per request.
4. Image/logo/media findings remain very large and need a focused cleanup pass.

### Audit interpretation risks

1. Draft-pool rebuild findings are overstated by static heuristics when the route contains a rebuild helper behind a DB cache wrapper.
2. Some NewsAPI/weather findings are now partial-by-design cache-first helpers, not raw page-load direct-host violations.
3. Payment routes should remain intentionally live; forcing DB-first there would be architecturally wrong.

## Recommended Next 10 Tasks

1. Delete or hard-disable `app/api/start-sit/injuries.route.js` and `app/api/start-sit/roster.route.js` as inert duplicate files so they stop inflating audit noise.
2. Delete or hard-disable `app/api/start-sit/weather.route.js` in favor of `app/api/start-sit/weather/route.ts`.
3. Improve the active `app/api/start-sit/roster/route.ts` read model so it uses DB/cache-backed projections instead of illustrative demo projections.
4. Improve the active `app/api/start-sit/injuries/route.ts` mapping quality so DB-backed rows stop collapsing to `Unknown` / `Unknown Player`.
5. Move `app/api/devy/draft/route.ts` onto `DraftPoolCache` using the same shared fingerprinted pattern as live/mock/specialty pools.
6. Audit `app/api/instant/trade/route.ts` and move deterministic branches to `AiResult`.
7. Audit `lib/ai-commissioner/AICommissionerService.ts` for deterministic cacheability and migrate eligible calls to `AiResult`.
8. Audit `lib/unified-ai/index.ts` for deterministic/non-streaming branches and add `AiResult` where feasible.
9. Reduce image/logo/media live fallback usage by standardizing DB-backed headshot/logo readers and gating page-load fallback fetches with `AF_DISABLE_IMAGE_LOOKUP_ON_PAGE_LOAD`.
10. Tighten `lib/news/newsapi-cache.ts` and `lib/weather/weatherService.ts` for stricter DB-cache-only mode when `AF_USE_DB_CACHE_ONLY=1`, then regenerate the architecture audit.

## Testing Checklist for Fast Local/Dev Testing

1. Run `npx prisma validate`.
2. Run `npm run audit:db-first-architecture`.
3. Hit the live draft pool route twice with the same fingerprint and confirm first rebuild, second DB cache hit.
4. Hit the mock draft ADP/pool route twice with the same fingerprint and confirm first rebuild, second DB cache hit.
5. Hit dispersal preview twice with the same inputs and confirm first rebuild, second DB cache hit.
6. Exercise `app/api/instant/improve-trade/route.ts` twice with deterministic inputs and confirm `AiResult` hit on the second request.
7. Exercise weather routes with and without warmed rows and confirm `WeatherCache` metadata shows cache hits once warmed.
8. Exercise a NewsAPI-backed helper and confirm it serves `SportsNews`/`SportsDataCache` before live refresh.
9. Verify Stripe webhook persistence against DB rows rather than attempting to make it DB-first.
10. Recheck the legacy JS routes to ensure they are either removed, replaced, or clearly quarantined from active UI paths.

## Environment Flags for DB-Cache-Only Testing

These come from `lib/db-first-mode.ts`.

```bash
AF_USE_DB_CACHE_ONLY=1
AF_DISABLE_LIVE_API_ON_PAGE_LOAD=1
AF_DISABLE_IMAGE_LOOKUP_ON_PAGE_LOAD=1
AF_DISABLE_ADP_LIVE_MERGE_ON_PAGE_LOAD=1
AF_DISABLE_STATS_LIVE_MERGE_ON_PAGE_LOAD=1
AF_MOCK_AI_CACHE_FIRST=1
AF_DISABLE_AI_LIVE_CALLS=1
AF_DRAFT_POOL_CACHE_TTL_SECONDS=300
```

## Closeout Read

### What is complete

- the main runtime bottlenecks targeted in Phases 2A-5B are now cache-first or DB-first
- payment/webhook surfaces are correctly classified as intentionally live external actions
- the shared cache primitives (`AiResult`, `SportsDataCache`, `WeatherCache`, `DraftPoolCache`) are the right long-term architecture units

### What still needs engineering work

- legacy start/sit JS routes
- non-cached specialty AI call sites
- standalone specialty draft endpoints outside the shared pool cache
- image/media fallback cleanup

### What should not trigger more migration churn

- Stripe checkout and billing portal routes
- Stripe webhook handlers
- ingestion workers and cron refreshers
- cache-first helpers that intentionally allow controlled live refresh on miss/stale unless strict DB-only mode is enabled

## Draft Pool Regression Snapshot (2026-04-27)

The latest draft-pool data-quality regression pass validates the core identity/media/projection fixes remain stable.

### Command Pack (executed)

1. `npx tsx scripts/regression-draft-pool-data-quality.ts --leagueId=ff789927-99f5-4346-9c1c-03308990ea63`
2. `npx prisma validate`
3. `npm run draft-pool:cache:audit -- --leagueId ff789927-99f5-4346-9c1c-03308990ea63`
4. `npx tsx scripts/audit-player-identity-collisions.ts --leagueId=ff789927-99f5-4346-9c1c-03308990ea63 --json`

### Result

- Regression script: PASS (11 checks)
- Prisma validate: PASS
- Draft pool cache audit: PASS
- Identity collision audit: PASS

### Key Metrics

- `duplicatePlayerIdGroups`: 0
- `knownPairCollisionViolations`: 0
- `missingHeadshots`: 0
- `trueMissingTeamLogos`: 0
- `missingProjectionCount`: 0
- `fallbackProjectionCount`: 1398
- `fallbackBySource.adp_position_fallback`: 980
- `fallbackBySource.rookie_adp_position_fallback`: 257
- `fallbackBySource.kicker_adp_binned_fallback`: 115
- `fallbackBySource.team_def_baseline_fallback`: 46
- `taggedRealRows`: 0
- `rookieSignalCoveragePct`: 99.16
- `identityMissingSleeperCarryForward`: 0

### Guardrails Now Covered by Regression

1. Known identity-collision pairs remain de-collided.
2. Marvin Harrison Jr. and Marvin Harrison remain distinct.
3. Russell Wilson sleeper identity remains pinned to `1234`.
4. De'Von Achane sleeper identity remains pinned to `7373`.
5. Missing headshots remain zero.
6. True missing team logos remain zero.
7. Projection fallback fills all missing projections.
8. Fallback rows carry `projectionSource`.
9. Real projection rows are not fallback-tagged.
10. Rookie signal coverage remains above threshold for non-DEF/K rows.
11. Identity rows with resolvable sleeperId stay at zero (all blocked rows resolved).

### Blocked Sleeper ID Fix (applied 2026-04-27)

14 `PlayerIdentityMap` rows had `sleeperId = null` despite the draft pool cache knowing
the correct Sleeper ID. These were classified as blocked by the broad-safety backfill
script (team drift / multi-candidate scenarios). A targeted fix script was written and
applied:

- Script: `scripts/backfill-blocked-sleeper-ids.ts`
- npm shortcut: `npm run draft-pool:backfill-blocked-sleeper-ids -- --leagueId=<id> [--apply]`
- 14 rows written, 0 collisions, 0 skipped
- Script re-derives the blocked list live from DB+cache (idempotent, safe to re-run)
- Regression guard check #11 permanently locks this count at zero going forward

### Fast Local Run Shortcut

- `npm run draft-pool:regression:data-quality -- --leagueId=<leagueId>`

## AI Route Cache Smoke Proof (2026-04-27)

Authenticated two-call proof is now complete for all protected AI routes using smoke-provider mode.

### Runtime Mode Used

- `AI_RESULT_CACHE_SMOKE_PROVIDER=true`
- Auth/access logic remained unchanged.
- `power-rankings` daily limiter remained active (no route-level bypass introduced).

### Proof Scope

Target routes:

1. `/api/ai/power-rankings`
2. `/api/ai/waiver-recs`
3. `/api/ai/matchup-preview`
4. `/api/ai/commish-note`

### Verified Behavior

For all four routes:

- Call 1: `200`, `source: smoke-provider`
- Call 2: `200`, `source: ai-result-cache`
- `resultKey` unchanged between calls
- `AiResult.updatedAt` unchanged on second call (cache reuse, not regeneration)

### Representative Result Keys (stable between calls)

- `power-rankings:be6b278547df9c6a644826e877be3ca7a926fe19f949eb82526c71483b8b36df`
- `waiver-recs:28d31a4656e85a5f5a2e65e6c4dfbdce2b952d1e95686f3bbb95ee68155f0101`
- `matchup-preview:a85432b5ba62993c929baa5311675b110fef50a58b7d120c5bd4923543714c43`
- `commish-note:de829e8fb9dc35c123625e7af1f33fde22bcdf937862e1553d85988f4949880d`

### Fixture Hygiene

- Sleeper-synced test fixture was removed after proof.
- DB cleanup verified (`league` / `sleeperLeague` rows removed).
- Temporary smoke scripts deleted.
- Smoke-mode dev server stopped.

### CI Recommendation

Keep full authenticated smoke-provider route proof manual-only by default:

1. Requires authenticated browser session and Sleeper fixture lifecycle setup/cleanup.
2. Requires mutable runtime state (fixture linking, potential daily limiter interaction).
3. Is best treated as release-gate evidence, not per-PR CI.

Keep these checks in automated CI:

1. `npx prisma validate`
2. `npm run ai-result-cache:regression`
3. `npm run ai-result-cache:audit`

### Optional Post-Credit Follow-Up

When Anthropic credits are restored, rerun one real-provider two-call pass for the same four routes to capture non-smoke provider evidence alongside this smoke-mode deterministic cache proof.
