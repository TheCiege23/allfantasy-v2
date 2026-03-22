# Prompt 35 — Rivalry Engine + Full UI Click Audit (Deliverable)

## 1. Rivalry Engine Architecture

- **Core orchestration:** `lib/rivalry-engine/RivalryEngine.ts` now runs detection/scoring/persistence with broader rivalry signals and deduplicated event tracking.
- **Signal pipeline:** `app/api/leagues/[leagueId]/rivalries/route.ts` builds per-pair maps from persisted data sources:
  - H2H from `MatchupFact` via `HeadToHeadAggregator`
  - playoff/championship/elimination from postseason-window matchup analysis
  - trades from Sleeper trade histories grouped by transaction
  - drama flags from `DramaEvent.relatedTeamIds`
  - contention overlap from `SeasonResult` contender overlap by season
- **Query layer:** `RivalryQueryService` supports league + sport + season + manager and manager-pair filters.
- **Timeline layer:** `RivalryTimelineBuilder` powers rivalry timelines with sport/season-aware filtering and route-level filters.
- **Sport-aware resolver:** `SportRivalryResolver` is now aligned to the single source of truth in `lib/sport-scope.ts` and supports:
  - NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.

---

## 2. Rivalry Scoring Logic

- **Inputs:** `totalMatchups`, `closeGameCount`, `playoffMeetings`, `eliminationEvents`, `championshipMeetings`, `upsetWins`, `tradeCount`, `contentionOverlapScore`, `dramaEventCount`.
- **Normalization + weighted score:** `RivalryScoreCalculator` computes a 0-100 bounded score from normalized factors and default weights.
- **Tier resolution:** `RivalryTierResolver` maps score to configurable thresholds:
  - Emerging, Heated, Blood Feud, League Classic.
- **Upset factor quality improvement:** H2H upset detection now uses season wins context from `SeasonResult` (winner with fewer season wins over stronger season-win opponent).

---

## 3. Schema Additions

Persisted rivalry models are in `prisma/schema.prisma`:

- **`RivalryRecord`** (`rivalry_records`)
  - `id` (rivalryId), `leagueId`, `sport`, `managerAId`, `managerBId`, `rivalryScore`, `rivalryTier`, `firstDetectedAt`, `updatedAt`.
  - unique pair index by `(leagueId, managerAId, managerBId)`.
- **`RivalryEvent`** (`rivalry_events`)
  - `id` (eventId), `rivalryId`, `eventType`, `season`, `matchupId`, `tradeId`, `description`, `createdAt`.
  - indexed for timeline reads.

Canonical pair ordering (`managerAId <= managerBId`) is enforced before persistence.

---

## 4. Timeline and Badge Integration Updates

- **Rivalry list badges:** `RivalryEngineList` shows rivalry tier badges and score/event metadata.
- **Rivalry timeline views:** 
  - `GET /api/leagues/[leagueId]/rivalries/[rivalryId]/timeline` supports `season` and `limit`.
  - `RivalryEngine` now records event classes for matchup, close game, upset, playoff, elimination, championship clash, trade, drama, and streak.
- **Head-to-head timeline link:** new endpoint `GET /api/leagues/[leagueId]/rivalries/[rivalryId]/head-to-head`.
- **Rivalry detail page:** new route `app/leagues/[leagueId]/rivalries/[rivalryId]/page.tsx` includes:
  - tabbed Timeline vs Head-to-head history
  - season filter
  - back navigation and refresh
  - “Explain this rivalry” action.

---

## 5. Full UI Click Audit Findings

Detailed matrix: `docs/PROMPT35_RIVALRY_CLICK_AUDIT_MATRIX.md`.

High-level status:

- **Rivalry dashboard entry:** `LeagueIntelligenceGraphPanel` rivalry tab switch works (`setView("rivalries")`).
- **Rivalry cards/buttons:** run engine, refresh, explain, timeline, detail link, H2H link all wired and tested.
- **Rivalry detail page:** back button, refresh, tab switches, season filter, explain button all wired end-to-end.
- **Manager comparison selectors:** added A/B selectors in `RivalryEngineList`; API pair filters (`managerAId`, `managerBId`) verified.
- **Sport + season filters:** passed through from panel/list into rivalry API and timeline/head-to-head endpoints.
- **Loading/error states:** verified for rivalry list, detail page, timeline/h2h panes.

---

## 6. QA Findings

- **Unit tests added:**
  - `__tests__/rivalry-score-calculator.test.ts`
  - `__tests__/rivalry-tier-resolver.test.ts`
- **E2E click audit added:**
  - `e2e/rivalry-engine-click-audit.spec.ts`
  - audits rivalry run, refresh, manager filters, explain, timeline, detail route, head-to-head tab, season filter.
- **No dead-click regressions found** in rivalry interaction surfaces covered by audit.

---

## 7. Issues Fixed

- Sport support hardcoding in rivalry resolver/types replaced with sport-scope source of truth.
- Rivalry GET API extended with season + manager pair filters.
- Rivalry POST API now computes richer rivalry signals (playoff, elimination, championship, trade, drama, contention overlap) before scoring.
- Rivalry events are now maintained idempotently across runs (deduped event writes) instead of create-only-on-first-run behavior.
- Added rivalry detail route and head-to-head endpoint to close missing drill-down flows.
- Added manager comparison selectors and detail/H2H links in rivalry cards for full click-path coverage.
- AI explain now uses current rivalry/timeline context with model-backed narrative + template fallback.

---

## 8. Final QA Checklist

- [ ] Run database migration/apply schema for rivalry models if not already applied.
- [ ] Run `npm run -s typecheck`.
- [ ] Run rivalry unit tests.
- [ ] Run `npm run test:e2e -- e2e/rivalry-engine-click-audit.spec.ts --project=chromium`.
- [ ] Smoke test rivalry tab with live league data in each supported sport:
  - NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
- [ ] Confirm rivalry detail page timeline and head-to-head routes on live data.

---

## 9. Explanation of the Rivalry Engine

The Rivalry Engine is now a production-ready, league-scoped rivalry intelligence system that detects rival pairs, scores rivalry intensity from historical competitive signals, resolves rivalry tiers, and persists a timeline-ready event stream.

It ties together matchup history, postseason pressure, championship interactions, trade behavior, contention overlap, and drama events into one normalized score and tier. Rivalries are viewable and explorable from the League Intelligence rivalry tab and dedicated rivalry detail route, with AI narrative explanations and season-filtered timeline/head-to-head drill-downs. The implementation remains sport-aware and compatible with existing league history, graph intelligence, dashboard, rivalry-card, and AI surfaces.
