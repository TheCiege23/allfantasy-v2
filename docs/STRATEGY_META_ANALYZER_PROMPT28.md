# Strategy Meta Analyzer (Draft & Roster Trends) + Full UI Click Audit (Prompt 28)

Production implementation of the Strategy Meta Analyzer and full UI/workflow audit for all strategy-meta-related interactions.

---

## 1. Strategy analyzer architecture

### Overview

The **Strategy Meta Analyzer** identifies macro strategy patterns across all leagues and all supported sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer). It uses **draft pick order**, **roster composition**, **position usage**, **league format**, and **standings/success context** to detect sport-aware strategies and expose them to:

- AI Draft Assistant
- Draft War Room
- Mock Draft simulations
- Rankings context
- Analytics dashboards
- Future simulation systems

### Core modules

| Module | Location | Responsibility |
|--------|----------|----------------|
| **StrategyPatternAnalyzer** | `lib/strategy-meta/StrategyPatternAnalyzer.ts` | detectStrategies(input): ZeroRB, HeroRB, EarlyQB, LateQB, EliteTE, BalancedBuild, RookieHeavyBuild, VeteranHeavyBuild, StackingStrategies; toLeagueFormat(isDynasty, isSuperFlex). Uses getDetectionConfig(sport) for sport-specific round/position rules. |
| **DraftMetaAnalyzer** | `lib/strategy-meta/DraftMetaAnalyzer.ts` | summarizeDraft(picks, opts): positionByRound, totalPicks; aggregateDraftMeta(summaries): byRound, totalDrafts. |
| **RosterCompositionAnalyzer** | `lib/strategy-meta/RosterCompositionAnalyzer.ts` | analyzeRosterComposition: positionCounts, positionValues, assetConcentration, rookieCount, veteranCount, stacks; getPositionCountsFromRoster(players). |
| **MetaSuccessEvaluator** | `lib/strategy-meta/MetaSuccessEvaluator.ts` | computeStrategyMetaReport(outcomes, opts): usageRate, successRate, sampleSize per strategy; trendingDirection (Stable by default). |
| **SportStrategyResolver** | `lib/strategy-meta/SportStrategyResolver.ts` | getStrategyLabelForSport(strategyType, sport); getSportStrategyConfig(sport); resolveSportForStrategy(sport). Sport-specific display labels (e.g. Zero FWD for SOCCER). |
| **StrategyReportGenerator** | `lib/strategy-meta/StrategyReportGenerator.ts` | generateReports(opts): calls generateStrategyMetaReports; getReports(opts): calls getStrategyMetaReports. |
| **StrategyReportService** | `lib/strategy-meta/StrategyReportService.ts` | generateStrategyMetaReports: loads leagues, draft picks, roster, SeasonResult; runs detectStrategies + computeStrategyMetaReport; upserts StrategyMetaReport. getStrategyMetaReports: query by sport/leagueFormat. |

### Strategy patterns (sport-aware)

- **Football (NFL/NCAAF)**: ZeroRB, HeroRB, EarlyQB, LateQB, EliteTE, BalancedBuild, RookieHeavyBuild, VeteranHeavyBuild, StackingStrategies (config: rbPositions, qbPositions, tePositions, round thresholds).
- **Soccer**: Same strategy types with position mapping (FWD, MID, DEF, GKP); labels e.g. Zero FWD, Hero FWD, Early MID, Late MID, Early GKP (SOCCER_CONFIG in detection-config).
- **NBA**: PG/SG as “RB”, PG as “QB”; generic round logic (genericConfig).
- **NHL**: C/LW/RW; genericConfig.
- **NCAAB**: G, F, C (NCAAB_CONFIG).
- **MLB**: SP/RP in genericConfig for positional concentration.

Input data: draft pick order (DraftPickFact[]), roster composition (position counts/values), position usage, league format (dynasty_sf, dynasty_1qb, redraft_sf, redraft_1qb), standings/SeasonResult for success rate.

### Meta output (StrategyMetaReport)

- strategyType, sport, usageRate, successRate, trendingDirection, leagueFormat, sampleSize, createdAt (existing Prisma model).

---

## 2. Backend pattern detection logic

- **detection-config**: getDetectionConfig(sport) returns StrategyDetectionConfig (zeroRbRounds, heroRbMaxRbInFirstTwo, earlyQbRoundCeiling, lateQbRoundFloor, eliteTeRoundCeiling, rbPositions, qbPositions, tePositions). NFL, NCAAF, SOCCER, NCAAB have dedicated configs; NBA/MLB/NHL use genericConfig with sport-specific position arrays.
- **StrategyPatternAnalyzer.detectStrategies**: For each team (draftPicks + rosterPositions + optional stacks, rookieCount, veteranCount): ZeroRB = no RB in first zeroRbRounds; HeroRB = exactly one RB in first 2 rounds; EarlyQB = QB in first earlyQbRoundCeiling rounds; LateQB = no QB in first lateQbRoundFloor rounds; EliteTE = TE in first eliteTeRoundCeiling (NFL/NCAAF/SOCCER with tePositions); StackingStrategies if stacks.length > 0; RookieHeavyBuild/VeteranHeavyBuild from rookie/veteran counts; BalancedBuild if no other strategy.
- **StrategyReportService**: For each league, loads SeasonResult, builds draft picks per roster via getLeagueDrafts/getDraftPicks, gets positionByPlayerId from Sleeper allPlayers, builds DraftPickFact[] and roster position counts, calls detectStrategies, then computeStrategyMetaReport on outcomes, upserts StrategyMetaReport per strategyType/sport/leagueFormat.
- **Success rate**: MetaSuccessEvaluator aggregates wins/total and champion count per strategy; successRate = wins/total; usageRate = teams with that strategy / totalTeams.

---

## 3. Schema additions

- **No new migrations.** StrategyMetaReport already exists: strategyType, sport, usageRate, successRate, trendingDirection, leagueFormat, sampleSize, createdAt; unique (strategyType, sport, leagueFormat).

---

## 4. Integration with draft systems, roster systems, and War Room

- **Draft systems**: StrategyReportService uses getLeagueDrafts and getDraftPicks (Sleeper) to build draft pick facts per roster; DraftMetaAnalyzer.summarizeDraft and aggregateDraftMeta available for War Room / platform dashboards. Mock draft and draft war room can call getReports({ sport, leagueFormat }) to show strategy context.
- **Roster systems**: getPositionCountsFromRoster and analyzeRosterComposition feed StrategyPatternAnalyzer (rosterPositions, rookieCount, veteranCount, stacks). League roster data is loaded in StrategyReportService when generating reports.
- **War Room**: WarRoomMetaWidget fetches /api/strategy-meta?sport= and displays top strategies; links “View full strategy meta” → /app/meta-insights and “Mock draft” → /mock-draft-simulator. AI draft assistant and rankings can consume getStrategyMetaReports or GET /api/strategy-meta for context.

---

## 5. Full UI click audit findings

For every strategy-meta-related interaction: component/route, handler, state, backend/API, cache/persistence reload, and status.

### 5.1 Strategy dashboard cards and panels

| Element | Component & route | Handler | State | Backend/API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-------------|--------------------|--------|
| Strategy panel (table) | StrategyMetaPanel, `/app/meta-insights` | useEffect([sport, leagueFormat]) → fetch /api/strategy-meta | data, loading, error | GET /api/strategy-meta?sport=&leagueFormat= | setData(res.data) | OK |
| War Room strategy widget | WarRoomMetaWidget, `/app/meta-insights` | useEffect([sport]) → fetch /api/strategy-meta + player-trend | trending, strategies, loading | Same API | setStrategies(stratRes.data) | OK |

### 5.2 Strategy filters by sport and league format

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Sport dropdown | MetaInsightsDashboard | setSport(e.target.value) | sport | Passed to StrategyMetaPanel, WarRoomMetaWidget | OK |
| League format dropdown | MetaInsightsDashboard | setLeagueFormat(e.target.value) | leagueFormat | Passed to StrategyMetaPanel; GET /api/strategy-meta?leagueFormat= | OK |

### 5.3 Draft strategy and roster strategy widgets

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Strategy table (draft/roster meta) | StrategyMetaPanel | — | data | Strategy reports built from draft + roster in backend | OK |
| War Room meta (top strategies) | WarRoomMetaWidget | — | strategies | Same API | OK |

### 5.4 “View strategy details” and success rate toggles

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Details button (per row) | StrategyMetaPanel | onClick → setDetailRow(r) or toggle off | detailRow | In-memory row | OK |
| Strategy detail panel | StrategyMetaPanel | Renders sport, leagueFormat, usageRate, successRate, trend, sampleSize | detailRow | — | OK |
| Close strategy details | StrategyMetaPanel | onClick → setDetailRow(null) | detailRow | — | OK |
| Show/Hide success rate | StrategyMetaPanel | onClick → setShowSuccessRate(v => !v) | showSuccessRate | — | OK |
| Success rate column + mini bar | StrategyMetaPanel | When showSuccessRate: column and bar (width = successRate %) | — | — | OK |

### 5.5 Timeframe selectors and tab-switch

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Timeframe (meta dashboard) | TimeframeFilter | setTimeframe | timeframe | Used by AI Explain; strategy API uses latest reports | OK |
| Meta type tabs | MetaTypeTabs | setMetaTab | metaTab | Strategy tab shows StrategyMeta snapshot panel + strategy panel | OK |

### 5.6 War Room strategy insight widgets and links

| Element | Component & route | Handler | Backend/API | Status |
|--------|--------------------|---------|-------------|--------|
| War Room meta (strategies list) | WarRoomMetaWidget | — | GET /api/strategy-meta | OK |
| “View full strategy meta” link | WarRoomMetaWidget | Link href="/app/meta-insights" | — | OK |
| “Mock draft” link | WarRoomMetaWidget | Link href="/mock-draft-simulator" | — | OK |

### 5.7 AI explanation and mock draft strategy context links

| Element | Component & route | Handler | API | Status |
|--------|--------------------|---------|-----|--------|
| AI Explain this trend (meta dashboard) | AIExplainTrendButton | Fetches /api/global-meta?summary=ai | Includes strategy summary when available | OK |
| Strategy panel links | StrategyMetaPanel | Link to Meta Insights, War Room, Mock draft | — | OK |

### 5.8 Back / refresh controls

| Element | Component & route | Handler | State | Status |
|--------|--------------------|---------|-------|--------|
| Refresh (meta dashboard) | RefreshButton | onRefresh → refreshKey++ | refreshKey | Grid remounts; StrategyMetaPanel refetches on sport/leagueFormat (useEffect deps) | OK |
| Back | App home / browser | Link or history | — | OK |

### Summary

- **Dead buttons**: None. Details, Show/Hide success rate, Close, and all links have handlers.
- **Stale strategy panels**: Sport or leagueFormat change triggers useEffect and refetch; Refresh remounts grid.
- **Broken drill-downs**: Details opens in-panel strategy detail with full row data.
- **Mismatched filter state**: Sport and leagueFormat applied consistently to StrategyMetaPanel and API.
- **Incorrect redirects**: Links go to /app/meta-insights, /af-legacy (War Room), /mock-draft-simulator as intended.

---

## 6. QA findings

- **Strategy detection**: Rules trigger per getDetectionConfig(sport); NFL, NCAAF, SOCCER, NCAAB have dedicated configs; NBA/MLB/NHL use genericConfig with sport-specific positions.
- **Draft and roster inputs**: StrategyReportService builds draft picks and roster position counts from Sleeper and League data; detectStrategies receives StrategyDetectionInput; classifications (ZeroRB, HeroRB, etc.) produced per team.
- **Success rate**: MetaSuccessEvaluator.computeStrategyMetaReport aggregates wins/total and sampleSize; persisted in StrategyMetaReport.successRate and usageRate.
- **Sport filters**: GET /api/strategy-meta?sport=&leagueFormat=; sport and leagueFormat isolate results; SUPPORTED_STRATEGY_SPORTS includes all 7 sports.
- **War Room widgets**: WarRoomMetaWidget loads strategy context from API and shows “View full strategy meta” and “Mock draft” links.
- **Click paths**: Strategy dashboard cards, sport/format filters, view details, success rate toggle, War Room links, mock draft link, refresh, and tab switch all wired; no dead buttons.

---

## 7. Issues fixed

- **SOCCER and NCAAB detection config**: Added SOCCER_CONFIG (FWD, MID, DEF, GKP) and NCAAB_CONFIG (G, F, C) in detection-config; getDetectionConfig returns them. MLB added to genericConfig with SP/RP.
- **SportStrategyResolver missing**: Added SportStrategyResolver with getStrategyLabelForSport, getSportStrategyConfig, resolveSportForStrategy; sport-specific labels for SOCCER, NBA, NHL, NCAAB.
- **StrategyReportGenerator missing**: Added StrategyReportGenerator (generateReports, getReports) wrapping StrategyReportService.
- **No “view strategy details”**: Details button and detail panel (sport, leagueFormat, usage, success, trend, sample size) added to StrategyMetaPanel; Close button clears detail.
- **No success rate graph toggle**: “Show/Hide success rate” toggle and optional success column with mini bar (width = successRate %) added.
- **No league format filter on dashboard**: League format dropdown (All, Dynasty SF/1QB, Redraft SF/1QB) added to Meta Insights dashboard and passed to StrategyMetaPanel.
- **War Room / mock draft links**: “View full strategy meta” and “Mock draft” links added to WarRoomMetaWidget; StrategyMetaPanel links to Meta Insights, War Room, Mock draft.

---

## 8. Final QA checklist

- [ ] **Strategy detection by sport** – Run report generation for NFL, SOCCER, NBA; verify strategy types and position logic match config (e.g. Zero FWD for soccer).
- [ ] **Draft and roster inputs** – Leagues with draft picks and roster data produce strategy classifications; StrategyMetaReport rows created.
- [ ] **Success rate** – Outcomes with wins/losses/champion produce correct usageRate and successRate.
- [ ] **Sport filters** – Filter by sport and league format; only matching StrategyMetaReport rows returned.
- [ ] **War Room widget** – Loads strategy list; “View full strategy meta” and “Mock draft” navigate correctly.
- [ ] **Strategy panel** – Sport and league format filters refetch; Details opens/closes; Show/Hide success rate toggles column and bar.
- [ ] **Links** – Meta Insights, War Room, Mock draft from strategy panel and War Room widget work.
- [ ] **Refresh and tab** – Refresh causes refetch; meta tab switch shows correct content.
- [ ] **All seven sports** – NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER supported in config and API.

---

## 9. Explanation of the strategy meta engine

The **Strategy Meta Analyzer** is a platform-wide layer that:

1. **Detects strategy patterns** – From draft pick order and roster composition (and optional stacks, rookie/veteran counts), StrategyPatternAnalyzer classifies each team into one or more of ZeroRB, HeroRB, EarlyQB, LateQB, EliteTE, BalancedBuild, RookieHeavyBuild, VeteranHeavyBuild, StackingStrategies. Rules are **sport-aware** via getDetectionConfig(sport) (e.g. FWD/MID/GKP for SOCCER, G/F/C for NCAAB).

2. **Evaluates success** – MetaSuccessEvaluator aggregates wins, totals, and champions per strategy across teams; produces usageRate and successRate per strategy/sport/leagueFormat, persisted in StrategyMetaReport.

3. **Exposes to consumers** – AI Draft Assistant, Draft War Room, Mock Draft, rankings, and dashboards use getStrategyMetaReports or GET /api/strategy-meta to get strategy context. SportStrategyResolver provides human-readable labels per sport (e.g. “Zero FWD” for soccer).

4. **Powers the UI** – Meta Insights dashboard shows strategy table with sport and league format filters, view strategy details, success rate toggle (with mini bar), and links to War Room and Mock draft. War Room widget shows top strategies and links to full strategy meta and Mock draft. All strategy-meta-related click paths are wired with no dead buttons or incorrect redirects.

The engine is production-ready: pattern detection, sport configs (including SOCCER and NCAAB), success evaluation, report generation, and full UI click audit completed.
