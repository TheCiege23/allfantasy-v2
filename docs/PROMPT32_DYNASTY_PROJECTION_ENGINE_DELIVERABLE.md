# Prompt 32 — Dynasty Projection Engine + Full UI Click Audit

Production implementation of the dynasty projection engine and mandatory UI/workflow audit for all dynasty-related interactions.

Latest implementation addendum:

- `docs/PROMPT32_IMPLEMENTATION_REPORT.md`
- `docs/PROMPT32_CLICK_AUDIT_MATRIX.md`

---

## 1. Dynasty projection architecture

### Overview

The **Dynasty Projection Engine** forecasts long-term franchise outlook across all supported sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer). It evaluates:

- 3-year and 5-year roster strength
- Championship window score
- Rebuild probability
- Aging curve impact (aging risk score)
- Future asset score (draft picks)
- Future team direction (contender/rebuilder/fringe)

Where a sport or format is less dynasty-oriented, the engine still provides a sport-appropriate long-term roster outlook.

### Layered structure

| Layer | Purpose | Implementation |
|-------|---------|----------------|
| **Existing dynasty-projection** | Roster future value, pick value, long-term strength | `lib/dynasty-projection/` (RosterFutureValueCalculator, DraftPickValueModel, LongTermStrengthEstimator, DynastyProjectionEngine) |
| **Dynasty engine (Prompt 32)** | Sport-aware resolver, aging curve, unified output, persistence | `lib/dynasty-engine/` |
| **Persistence** | DynastyProjection (Prompt 32 output) | Prisma `dynasty_projections`; existing `DynastyProjectionSnapshot` unchanged |
| **Query** | Dashboard, trade context, AI | `DynastyQueryService` |

### Directory layout

- **Schema**: `prisma/schema.prisma` — `DynastyProjection` (projectionId, teamId, leagueId, sport, championshipWindowScore, rebuildProbability, rosterStrength3Year, rosterStrength5Year, agingRiskScore, futureAssetScore, season, createdAt).
- **Lib**: `lib/dynasty-engine/`
  - `types.ts` — DynastyProjectionOutput, sport constants
  - `SportDynastyResolver.ts` — getPeakAgeRange(sport, position), isDynastyRelevant
  - `AgingCurveService.ts` — ageMultiplier(sport, position, age, horizon), rosterAgingRiskScore
  - `DynastyValueModel.ts` — re-exports calculateRosterFutureValue, valueFuturePicks; futureAssetScoreFromPicks
  - `RosterStrengthCalculator.ts` — calculateRosterStrength (3yr/5yr/agingRisk from roster)
  - `DynastyProjectionGenerator.ts` — generateDynastyProjection (uses DynastyProjectionEngine + maps to DynastyProjection, optional persist)
  - `DynastyQueryService.ts` — getDynastyProjection, getDynastyProjectionsForLeague, getDynastyContextForTeam
  - `index.ts` — central export
- **APIs**:
  - `GET/POST /api/leagues/[leagueId]/dynasty-projections` — fetch or generate DynastyProjection list
  - `POST /api/dynasty-outlook` — existing; AI dynasty outlook (unchanged)
  - `POST /api/rankings/dynasty-roadmap` — existing; AI dynasty roadmap (unchanged)

---

## 2. Modeling logic

- **Roster strength (3-year / 5-year)**: From `calculateRosterFutureValue` (age multipliers by position and horizon, scarcity). Combined with pick value in `estimateLongTermStrength`; normalized to 0–100 scale.
- **Rebuild probability**: Inverse of combined strength signal (next + 3yr + 5yr) in LongTermStrengthEstimator; higher when projected strength is low.
- **Championship window**: Derived from contender probability and window start/end years (strong now/mid/far → windowStartYear, windowEndYear). Mapped to championshipWindowScore (0–100).
- **Aging risk**: From RosterFutureValueBreakdown.agingRiskScore and injuryRiskScore; LongTermStrengthEstimator volatilityScore also reflects window span. Stored as agingRiskScore in DynastyProjection.
- **Future asset score**: From valueFuturePicks (near/long term contribution); normalized to 0–100 via futureAssetScoreFromPicks.
- **Sport-aware**: SportDynastyResolver.getPeakAgeRange(sport, position) drives AgingCurveService; NFL positions (QB, RB, WR, TE) have distinct peaks; NBA/NHL/MLB/NCAAB/NCAAF/Soccer use sport-appropriate defaults.

---

## 3. Schema additions

Single new model in `prisma/schema.prisma` under "Dynasty Projection Engine (Prompt 32)".

| Model | Table | Key fields |
|-------|-------|------------|
| **DynastyProjection** | `dynasty_projections` | projectionId (PK), teamId, leagueId, sport, championshipWindowScore, rebuildProbability, rosterStrength3Year, rosterStrength5Year, agingRiskScore, futureAssetScore, season, createdAt. Unique (leagueId, teamId). |

Existing `DynastyProjectionSnapshot` remains for backward compatibility (used by existing DynastyProjectionEngine.persistSnapshot).

---

## 4. Integration with roster systems, rankings, and trade systems

- **Roster**: Dynasty projection input uses `TeamDynastyInputs` (players as PlayerDynastyAsset[], futurePicks as FuturePickAsset[]). Callers (e.g. league dashboard or backfill) assemble from Roster + LeagueTeam + draft picks.
- **Rankings**: Rankings v2 and dynasty roadmap use roster signals and portfolio projections; `POST /api/rankings/dynasty-roadmap` returns AI roadmap. New `GET /api/leagues/[leagueId]/dynasty-projections` can feed numeric projections into rankings UI or AI.
- **Trade**: `DynastyQueryService.getDynastyContextForTeam(leagueId, teamId)` returns DynastyProjection for trade analyzer dynasty context. Trade analyzer and dynasty trade form can call this to inject 3yr/5yr strength and rebuild probability into AI or UI.
- **Warehouse**: Historical facts (e.g. standings, transactions) can be used by callers to build team inputs; engine does not read warehouse directly in this deliverable.

---

## 5. Full UI click audit findings

For every dynasty-projection-related element: **Component & route** | **Handler** | **State** | **Backend/API** | **Cached/persisted reload** | **Status**.

### 5.1 Rankings — Dynasty Outlook (AI)

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| "Dynasty Outlook" button | RankingsClient, /rankings | onClick → handleDynastyOutlook() | dynastyLoading, dynastyData, dynastyTeamId, dynastyError | POST /api/dynasty-outlook | Refetches on click | OK |
| Team selector (dynasty) | RankingsClient | onValueChange → handleDynastyOutlook(val) | dynastyTeamId | Same | Refetches for selected team | OK |
| Loading state | RankingsClient | — | dynastyLoading | — | "Evaluating rosters, aging curves…" | OK |
| Error state + Retry | RankingsClient | dynastyError set on API failure; Retry → handleDynastyOutlook | dynastyError | — | Retry refetches | OK (added) |
| Results (overall, contender/rebuilder, assets, risks, 3-year projection, recommendation) | RankingsClient | — | dynastyData | — | From API | OK |

### 5.2 League rankings v2 — Dynasty roadmap

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| Generate year plan / roadmap | LeagueRankingsV2Panel | fetch POST /api/rankings/dynasty-roadmap with rosterSignals, avgAge, totalValue, etc. | yearPlan, yearPlanLoading, yearPlanError | POST /api/rankings/dynasty-roadmap | On demand | OK |
| Dynasty view toggle | LeagueRankingsV2Panel | rankingView 'dynasty' vs 'power' | rankingView | — | Sorts teams by marketValueScore | OK |

### 5.3 League Intelligence — Dynasty timeline

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| Timeline tab | LeagueIntelligenceGraphPanel | setView('timeline') | view | — | Renders DynastyTimelineView | OK |
| Load dynasty seasons | LeagueIntelligenceGraphPanel | loadDynastySeasons() → GET dynasty-backfill | dynastySeasons | GET /api/leagues/[id]/dynasty-backfill | When isDynasty | OK |
| DynastyTimelineView (power transitions) | DynastyTimelineView | Receives profile.dynastyPowerTransitions, dynastySeasons | — | — | Parent passes data | OK |
| Empty state | DynastyTimelineView | "No dynasty timeline data yet. Run dynasty backfill…" | — | — | OK |

### 5.4 Dynasty trade analyzer page

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| Page | dynasty-trade-analyzer/page.tsx | Renders DynastyTradeForm | — | — | OK |
| DynastyTradeForm | DynastyTradeForm | Form submit / league context | — | Dynasty trade API | OK |

### 5.5 Dynasty projections API (new)

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| GET dynasty-projections | — | — | — | GET /api/leagues/[leagueId]/dynasty-projections?sport= | Returns { projections } | OK |
| POST dynasty-projections | — | — | — | POST body: { teamInputs, persist } | Generates and optionally persists | OK |

### 5.6 Sport filters / team selectors

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| League/team in rankings | RankingsClient | league from props/context; team selector dropdown | dynastyTeamId | dynasty-outlook with teamId | OK |
| Sport in dynasty-projections GET | API | Query param sport= | — | Filters by sport | OK |

### 5.7 Back and refresh

| Element | Component & route | Handler | State | API | Reload | Status |
|--------|--------------------|---------|-------|-----|--------|--------|
| Refresh rankings | RankingsClient | handleRefresh → POST /api/rankings then reload | refreshing | — | OK |
| Back navigation | Various | Link or router | — | — | OK |

### Summary (UI audit)

- **Dynasty Outlook**: Button and team selector wired; loading and **error + Retry** added so failed API shows message and retry. **Fixed**: setDynastyError on failure; render error block with Retry button.
- **Dynasty roadmap**: LeagueRankingsV2Panel calls dynasty-roadmap with roster data; year plan state and error handled. OK.
- **Dynasty timeline**: Tab and loadDynastySeasons wired; DynastyTimelineView display-only. OK.
- **Dynasty trade analyzer**: Page and form present; dynasty context can be supplied via getDynastyContextForTeam where needed. OK.
- **3-year / 5-year**: Dynasty outlook shows "3-Year Projection" (year1/year2/year3 rank from AI). Numeric 3yr/5yr strength in DynastyProjection available via new API for future UI (e.g. toggle or cards). No dead buttons found after fixes.

---

## 6. QA findings

- **Dynasty projections**: Generator uses existing DynastyProjectionEngine; output mapped to DynastyProjection (championshipWindowScore, rebuildProbability, rosterStrength3Year, rosterStrength5Year, agingRiskScore, futureAssetScore); persist writes to dynasty_projections.
- **3-year and 5-year**: Stored in rosterStrength3Year and rosterStrength5Year; GET dynasty-projections returns them; UI can add toggle/cards when consuming this API.
- **Rebuild probability**: Displayed in AI dynasty outlook as contender/rebuilder/fringe; numeric value in DynastyProjection.rebuildProbability.
- **Sport filters**: dynasty-projections GET accepts sport param; SportDynastyResolver used in engine for peak ages and sport normalization.
- **Trade analyzer**: getDynastyContextForTeam(leagueId, teamId) available for dynasty context; trade analyzer can be wired to use it in a follow-up.
- **AI dynasty advice**: Dynasty outlook and dynasty roadmap use current league/roster data; error path now visible with Retry.

---

## 7. Issues fixed

| Issue | Severity | Fix |
|-------|----------|-----|
| Dynasty Outlook had no error state | Medium | Added dynastyError state; on API failure set error and show message + Retry button. |
| No unified DynastyProjection output/store | Medium | Added DynastyProjection schema and dynasty-engine (DynastyProjectionGenerator, DynastyQueryService); GET/POST /api/leagues/[id]/dynasty-projections. |
| Sport-aware aging not centralized | Low | Added SportDynastyResolver and AgingCurveService with getPeakAgeRange(sport, position). |

---

## 8. Final QA checklist

- [x] Dynasty projection architecture in place (DynastyValueModel, AgingCurveService, DraftPickValueModel re-export, RosterStrengthCalculator, DynastyProjectionGenerator, DynastyQueryService, SportDynastyResolver).
- [x] Modeling logic: 3yr/5yr strength, rebuild prob, championship window, aging risk, future asset score; sport-aware peak ages.
- [x] Schema: DynastyProjection added and migrated.
- [x] Integration: Roster/rankings/trade integration points documented; new API for projections.
- [x] Dynasty Outlook: Error state and Retry button; handler and API verified.
- [x] Dynasty roadmap and timeline: Handlers and data flow verified.
- [x] Full UI click audit completed; dynasty-related click paths verified.
- [x] Sport and team selectors isolate or scope dynasty data.

---

## 9. Explanation of the dynasty projection engine

The **Dynasty Projection Engine** is the layer that produces a unified long-term franchise outlook. It:

1. **Reuses existing dynasty-projection** — Roster future value (age multipliers by position and horizon), draft pick value (near/long term), and long-term strength (contender/rebuild probability, window years) from `lib/dynasty-projection`.
2. **Adds sport-aware tuning** — SportDynastyResolver provides peak age ranges by sport and position; AgingCurveService exposes age multipliers and roster aging risk. NFL, NBA, NHL, MLB, NCAAB, NCAAF, and Soccer use appropriate defaults so dynasty logic is not forced to one sport.
3. **Produces DynastyProjection** — One record per team: championshipWindowScore, rebuildProbability, rosterStrength3Year, rosterStrength5Year, agingRiskScore, futureAssetScore. Stored in `dynasty_projections` for dashboard cards, trade context, and AI.
4. **Exposes query API** — DynastyQueryService and GET/POST `/api/leagues/[leagueId]/dynasty-projections` allow fetching or generating projections; getDynastyContextForTeam supports trade analyzer dynasty context.

The engine supports **dynasty rankings**, **AI rebuild advice** (via existing dynasty-outlook and dynasty-roadmap), **trade analyzer context**, **league power projections**, and **dashboard future outlook cards**. All dynasty-related UI (Dynasty Outlook button and team selector, dynasty roadmap, dynasty timeline, dynasty trade analyzer) has been audited; the only code change was adding error state and Retry for the Dynasty Outlook flow.
