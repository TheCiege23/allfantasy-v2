# DB-First API Audit (2026-04-08)

## Scope
- Full repository scan using `npm run guard:db-first-api`.
- Policy: monitored third-party data API hosts must be called only from ingestion/sync paths.

## Baseline Result
- Total violations: 172
- Highest concentration area: `app/api` (109 violations)

## Post-Migration Snapshot (same day)

## Post-Migration Snapshot (continued)
- Full-scan violations after `app/api/mock-draft/league-import/route.ts` migration: 160
- Net reduction vs initial baseline: 12
- Full-scan violations after `app/api/legacy/transfer/route.ts` migration: 152
- Net reduction vs initial baseline: 20
- Full-scan violations after `app/api/legacy/trade/analyze/route.ts` migration: 146
- Net reduction vs initial baseline: 26
- Full-scan violations after `app/api/legacy/trade/league-managers/route.ts` migration: 140
- Net reduction vs initial baseline: 32
- Full-scan violations after `app/api/legacy/rankings/analyze/route.ts` migration: 134
- Net reduction vs initial baseline: 38
- Full-scan violations after `app/api/legacy/trades/check/route.ts` migration: 129
- Net reduction vs initial baseline: 43
- Full-scan violations after `app/api/legacy/trade-ideas/route.ts` and `app/api/legacy/rankings/historical-ratings/route.ts` migrations: 119
- Net reduction vs initial baseline: 53
- Full-scan violations after `app/api/legacy/trade/league-analyze/route.ts`, `app/api/legacy/rankings/league-format/route.ts`, and `app/api/legacy/rankings/playoff-forecast/route.ts` migrations: 107
- Net reduction vs initial baseline: 65
- Full-scan violations after `app/api/league/refresh/route.ts` migration: 104
- Net reduction vs initial baseline: 68
- Full-scan violations after `app/api/legacy/trade/roster/route.ts`, `app/api/admin/api-status/route.ts`, and `app/api/legacy/player-finder/route.ts` migrations: 95
- Net reduction vs initial baseline: 77
- Full-scan violations after additional app/api migrations (`legacy/backfill/playoffs`, `legacy/rankings/adaptive`, `legacy/rankings/enhanced`, `import-sleeper`, `leagues/import`, `leagues/import/batch`, `mock-draft/manager-dna`, `legacy/smart-recommendations`, `legacy/ai-gm-analyze`, `league/sleeper-user-leagues`, `league/sleeper-discover`, `league/discover`) and route-level exception annotations for user-delegated OAuth/live proxy paths: 63
- Net reduction vs initial baseline: 109
- `app/api` direct-host violations: 0

## Top Hotspot Files (by violation count)
1. 9 - `app/af-legacy/trade-analyzer/page.tsx`
2. 5 - `lib/trade-pre-analysis.ts`
3. 5 - `lib/trade-engine/league-context-assembler.ts`
4. 4 - `lib/devy/importEngine.ts`
5. 3 - `lib/upstream-apis.ts`
6. 3 - `lib/league/sleeper-import-process.ts`
7. 3 - `lib/agents/workers/api-health-monitor.ts`
8. 3 - `lib/admin-dashboard/SystemHealthResolver.ts`
9. 3 - `lib/sports-router.ts`
10. 2 - `app/api/leagues/import/batch/route.ts`

## Area Breakdown (high-level)
- 32 - `app/api`
- 9 - `app/af-legacy`
- 5 - `lib/trade-engine`
- 5 - `lib/trade-pre-analysis.ts`
- 4 - `lib/devy`
- 3 - `lib/agents`
- 3 - `lib/league`
- 3 - `lib/admin-dashboard`
- 3 - `lib/sleeper`
- 3 - `lib/upstream-apis.ts`
- 3 - `lib/sports-router.ts`

## Priority Queue

### Phase 1 (Highest RPM impact, user-facing)
- Migrate direct Sleeper reads in:
  - `app/api/trade-finder/matchmaking/route.ts`
  - `app/api/season-strategy/route.ts`
  - `app/api/sleeper/players/route.ts`
  - `app/api/mock-draft/league-import/route.ts`
- Replace direct route-level fetches with DB selectors backed by ingestion tables.

### Phase 2 (Legacy API routes)
- Consolidate legacy trade/ranking routes behind DB-backed read models:
  - `app/api/legacy/trade/**`
  - `app/api/legacy/rankings/**`
  - `app/api/legacy/trades/check/route.ts`
- Keep temporary exceptions only where migration is actively in progress.

### Phase 3 (Support libraries and dashboards)
- Move upstream fetch logic from read-time helpers into ingestion workers/services:
  - `lib/trade-pre-analysis.ts`
  - `lib/trade-engine/league-context-assembler.ts`
  - `lib/upstream-apis.ts`
  - `lib/sports-router.ts`
  - `lib/admin-dashboard/SystemHealthResolver.ts`

## Exception Policy During Migration
- Temporary bypass is allowed only with line annotation:
  - `db-first-exception: reason`
- Every exception must include a migration target and removal date in PR notes.

## Definition of Done
- User-facing routes and UI-backed server code read from DB-backed tables/views only.
- Direct monitored API hosts remain only in ingestion/sync modules.
- Guard passes in full-scan mode (`npm run guard:db-first-api`) with zero violations.
