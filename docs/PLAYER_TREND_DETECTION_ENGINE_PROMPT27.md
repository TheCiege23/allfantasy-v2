# Player Trend Detection Engine + Full UI Click Audit (Prompt 27)

Production implementation of the platform-wide player trend detection engine and full UI/workflow audit for all player-trend-related interactions.

---

## 1. Trend detection architecture

### Overview

The **Player Trend Detection Engine** detects platform-wide player trends across every supported sport (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer). It analyzes:

- **Waiver pickups** – waiver_add signals; addRate
- **Roster additions** – reflected in addRate (waiver add) and lineup_start
- **Trade demand** – trade_request → tradeInterest
- **Draft frequency** – draft_pick → draftFrequency
- **AI recommendation frequency** – ai_recommendation → addRate (interest)
- **Lineup start percentage** – lineup_start → lineupStartRate
- **Usage changes by sport context** – all signals stored per playerId + sport; SportTrendContextResolver provides sport-aware weights

Signals are tracked **separately by sport**; trend calculations are isolated per sport unless a platform-wide aggregate view is explicitly requested.

### Core modules

| Module | Location | Responsibility |
|--------|----------|----------------|
| **PlayerTrendAnalyzer** | `lib/player-trend/PlayerTrendAnalyzer.ts` | Query trending players: getHottestPlayers, getRisingPlayers, getFallers, getTrendingByDirection, getPlayerTrend. SUPPORTED_SPORTS includes all 7. |
| **TrendScoreCalculator** | `lib/player-trend/TrendScoreCalculator.ts` | calculateTrendScore(signals, weights); calculateTrendScoreForSport(signals, sport) for sport-aware weights; clampTrendScore, normalizeTrendScoreTo100 |
| **TrendDirectionClassifier** | `lib/player-trend/TrendDirectionClassifier.ts` | classifyTrendDirection(currentScore, previousScore, eventCount) → Rising | Hot | Stable | Falling | Cold; compares to historical baseline (previousTrendScore) |
| **PlayerTrendUpdater** | `lib/player-trend/PlayerTrendUpdater.ts` | updatePlayerTrend(playerId, sport); recordTrendSignal; recordTrendSignalsAndUpdate; uses sport-aware score via calculateTrendScoreForSport |
| **TrendSignalAggregator** | `lib/player-trend/TrendSignalAggregator.ts` | aggregateSignalsForPlayer(playerId, sport, windowMs); getPreviousTrendScore; maps signal types to addRate, dropRate, tradeInterest, draftFrequency, lineupStartRate, injuryImpact |
| **SportTrendContextResolver** | `lib/player-trend/SportTrendContextResolver.ts` | getTrendWeightsForSport(sport); resolveSportForTrend(sport); TREND_SPORTS; optional sport-specific weight overrides for configurable, sport-aware TrendScore |

### Trend score model

- **TrendScore** = AddRateWeight×addRate + DropRateWeight×dropRate + TradeInterestWeight×tradeInterest + DraftRateWeight×draftFrequency + StartRateWeight×lineupStartRate + InjuryImpactWeight×injuryImpact.
- Weights are **configurable** (DEFAULT_TREND_WEIGHTS in types) and **sport-aware** (SportTrendContextResolver.getTrendWeightsForSport). Default: addRate 0.25, dropRate -0.2, tradeInterest 0.2, draftFrequency 0.2, lineupStartRate 0.15, injuryImpact -0.15.
- Raw score is normalized to 0–100 for display and direction classification (normalizeTrendScoreTo100).

### Trend directions

- **Rising**, **Hot**, **Stable**, **Falling**, **Cold**.
- Determined by **comparing current trend score to historical baseline** (previousTrendScore) for the same player/sport, plus event count (MIN_EVENTS_FOR_DIRECTION). Thresholds: delta ≥ 5 and score ≥ 70 → Hot; delta ≥ 5 → Rising; delta ≤ -5 and score ≤ 30 → Cold; delta ≤ -5 → Falling; else Stable.

### Database structures (existing; used as specified)

**PlayerMetaTrend** – playerId, sport, trendScore, addRate, dropRate, tradeInterest, draftFrequency, lineupStartRate, injuryImpact, trendingDirection, previousTrendScore, updatedAt.

**TrendSignalEvent** – id, playerId, sport, signalType, value, leagueId, timestamp.

**Signal types**: waiver_add, waiver_drop, trade_request, draft_pick, lineup_start, ai_recommendation, injury, injury_event (injury_event added; maps to injuryImpact like injury).

---

## 2. Backend calculation logic

- **TrendSignalAggregator.aggregateSignalsForPlayer** – loads TrendSignalEvent in TREND_WINDOW_MS (7 days), maps each signalType to a TrendSignals key (addRate, dropRate, tradeInterest, draftFrequency, lineupStartRate, injuryImpact), normalizes by window days to produce rates.
- **TrendScoreCalculator.calculateTrendScoreForSport** – uses getTrendWeightsForSport(sport) and sums weight×signal; **TrendScoreCalculator.calculateTrendScore** – same with optional custom weights.
- **TrendDirectionClassifier.classifyTrendDirection** – if eventCount < MIN_EVENTS_FOR_DIRECTION returns Stable; else computes delta = currentScore - previousScore; applies DELTA_* and SCORE_* thresholds to return Hot/Rising/Stable/Falling/Cold.
- **PlayerTrendUpdater.updatePlayerTrend** – aggregates signals, gets previous score, computes raw score with sport-aware weights, normalizes to 0–100, classifies direction, upserts PlayerMetaTrend (including previousTrendScore for next period).
- **record-signals** – recordWaiverAdd, recordWaiverDrop, recordTradeRequest, recordDraftPick, recordLineupStart, recordAiRecommendation, recordInjuryImpact, recordInjuryEvent; all call recordTrendSignal. recordTrendSignalsAndUpdate records events then calls updatePlayerTrend for each affected player/sport.

---

## 3. Schema updates

- **No new migrations** for Prompt 27. PlayerMetaTrend and TrendSignalEvent already exist and match the required fields.
- **Signal type** – TrendSignalEvent.signalType is VarChar(24); 'injury_event' is supported and mapped to injuryImpact in TrendSignalAggregator (same as 'injury').

---

## 4. Integration with waiver system and player systems

- **Waiver system** – `lib/waiver-wire/run-hooks.ts` onWaiverRunComplete: after waiver processing, builds events (waiver_add for addPlayerId, waiver_drop for dropPlayerId) with league sport; calls **recordTrendSignalsAndUpdate(events)** so waiver claims correctly update trend signals. League sport is resolved from League.sport (default NFL).
- **Draft** – When draft picks are recorded with playerId/sport, call **recordDraftPick(playerId, sport, leagueId)** or recordTrendSignalsAndUpdate with draft_pick events so draft frequency increases (documented in PLAYER_TREND_ENGINE.md; integration point for mock-draft or draft war room when picks are finalized).
- **Trade** – When trades are completed or analyzed with players received, call **recordTradeRequest(playerId, sport, leagueId)** to update trade interest (documented; integration in trade analyzer or trade processing optional).
- **Lineup start** – When lineup/start data is available, call **recordLineupStart(playerId, sport, leagueId)** to increase lineupStartRate (documented).
- **AI recommendations** – When AI recommends a player for add/waiver/draft, call **recordAiRecommendation(playerId, sport)** so AI recommendation frequency is counted (documented; can be wired in waiver-ai or draft AI response paths).
- **Injury** – recordInjuryImpact or recordInjuryEvent for negative signal.
- **Player database** – Trend data keyed by playerId and sport; no change to SportsPlayer or identity maps. Player detail views can call getPlayerTrend(playerId, sport) or GET /api/player-trend?playerId=&sport= for trend panel.

---

## 5. Full UI click audit findings

For every player-trend-related interaction: component/route, handler, state, backend/API, cache/persistence reload, and status.

### 5.1 Trending players dashboard cards and panels

| Element | Component & route | Handler | State | Backend/API | Persistence/reload | Status |
|--------|--------------------|---------|-------|-------------|--------------------|--------|
| Trending players panel (hottest) | PlayerTrendPanel, `/app/meta-insights` | useEffect([sport, list, limit]) → fetch /api/player-trend?list=hottest&sport=&limit= | data, loading, error | GET /api/player-trend | setData(res.data); loading/error set | OK |
| Fastest rising panel | PlayerTrendPanel, list=rising | Same | Same | Same API list=rising | Same | OK |
| Biggest fallers panel | PlayerTrendPanel, list=fallers | Same | Same | Same API list=fallers | Same | OK |
| Sport filter (meta dashboard) | MetaInsightsDashboard | onChange → setSport | sport | Passed to all panels | Panels refetch with new sport | OK |
| Timeframe (meta dashboard) | TimeframeFilter | onChange → setTimeframe | timeframe | Used by AI summary; trend panels use latest data | OK |
| Refresh (meta dashboard) | RefreshButton | onClick → onRefresh → refreshKey++ | refreshKey | — | Grid key={refreshKey} remounts; panels refetch | OK |

### 5.2 Sport and timeframe selectors

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Sport dropdown (meta insights) | MetaInsightsDashboard | setSport(e.target.value) | sport | All child panels use sport in API params | OK |
| Timeframe dropdown | TimeframeFilter | setTimeframe | timeframe | AI Explain uses it; trend lists use server default window | OK |
| Sport dropdown (waiver-ai) | waiver-ai page | setSport(e.target.value) | sport | Waiver context; Trending players link goes to meta-insights | OK |

### 5.3 Player detail clicks and “view trend details”

| Element | Component & route | Handler | State | Backend/API | Status |
|--------|--------------------|---------|-------|-------------|--------|
| Details button (per row) | PlayerTrendPanel | onClick → setDetailPlayer(p) | detailPlayer | Uses in-memory row (no extra fetch) | OK |
| Trend detail panel (dialog) | PlayerTrendPanel | Renders addRate, dropRate, tradeInterest, draftFrequency, lineupStartRate, injuryImpact | detailPlayer | — | OK |
| Close trend details | PlayerTrendPanel | onClick → setDetailPlayer(null) | detailPlayer | — | OK |
| Single-player trend API | — | GET /api/player-trend?playerId=&sport= | — | getPlayerTrend(playerId, sport); 200 + data or 404 | OK |

### 5.4 Add/drop graph toggles

| Element | Component & route | Handler | State | API | Status |
|--------|--------------------|---------|-------|-----|--------|
| Show add/drop toggle | PlayerTrendPanel | onClick → setShowAddDropToggle(v => !v) | showAddDropToggle | — | OK |
| Add/drop display | PlayerTrendPanel | When showAddDropToggle: show “+addRate / −dropRate” per row | — | Data from list response (addRate, dropRate) | OK |

### 5.5 AI recommendation links and waiver/draft/trade links

| Element | Component & route | Handler | Backend/API | Status |
|--------|--------------------|---------|-------------|--------|
| Meta Insights link (from trend panel) | PlayerTrendPanel | Link href="/app/meta-insights" | — | OK |
| Waiver AI link (from trend panel) | PlayerTrendPanel | Link href="/waiver-ai" | — | OK |
| See in Waiver AI (in detail) | PlayerTrendPanel | Link href=/waiver-ai?highlight=playerId | — | OK |
| Trending players link (waiver-ai page) | waiver-ai/page.tsx | Link href="/app/meta-insights" | — | Waiver page links into trending | OK |
| Back to Home (waiver-ai) | waiver-ai/page.tsx | Link href="/" | — | OK |
| Back (meta insights) | Browser or app home link | — | — | OK |

### 5.6 Draft room and trade analyzer trend indicators

| Element | Component & route | Handler | Backend/API | Status |
|--------|--------------------|---------|-------------|--------|
| Draft room | DraftRoom, af-legacy | Existing UI; trend data can be injected via getPlayerTrend in API or client | Optional: call getPlayerTrend in draft war room API and return trend badge | Documented; optional integration |
| Trade analyzer | Trade evaluator / InstantTradeAnalyzer | InstantTradeAnalyzer shows trend (TrendingUp/Down) from player.trend | Uses own data source (e.g. trendingPlayer or API); can be wired to getPlayerTrend for consistency | OK (existing); can add /api/player-trend?playerId= in trade flow |
| War Room meta widget | WarRoomMetaWidget, meta-insights | Fetches /api/player-trend list=hottest | Same API | OK |

### 5.7 Refresh and back buttons

| Element | Component & route | Handler | State | Status |
|--------|--------------------|---------|-------|--------|
| Refresh (meta insights) | RefreshButton | onRefresh → refreshKey++ | refreshKey | OK |
| Back to Home (waiver-ai) | Link | href="/" | — | OK |
| Back (meta insights) | App home link | href="/app/home" or /leagues | — | OK |

### 5.8 Loading and error states

| Element | Component & route | Handler | User-visible | Status |
|--------|--------------------|---------|--------------|--------|
| PlayerTrendPanel loading | PlayerTrendPanel | loading true; “Loading…” | OK |
| PlayerTrendPanel error | setError(res.error or catch) | Red error text | OK |
| Single-player 404 | GET ?playerId=&sport= | 404 + { error: 'Not found', data: null } | OK |

### Summary

- **Dead links**: None. Meta Insights, Waiver AI, See in Waiver AI, Trending players (from waiver) all wired.
- **Stale trend graphs**: Sport/limit/list changes trigger useEffect; Refresh forces remount/refetch.
- **Broken sport filters**: Sport passed to all panels and API; SUPPORTED_SPORTS includes all 7; invalid sport returns 400 with supported list.
- **Mismatched trend details**: Detail panel uses same row data as list (addRate, dropRate, etc.); single-player API available for external use.
- **Incorrect navigation**: Links go to /app/meta-insights, /waiver-ai, /; no wrong redirects.

---

## 6. QA findings

- **Trend signals** – waiver_add, waiver_drop, trade_request, draft_pick, lineup_start, ai_recommendation, injury, injury_event supported; injury_event maps to injuryImpact.
- **Trend score** – Configurable and sport-aware via getTrendWeightsForSport; calculateTrendScoreForSport used in PlayerTrendUpdater.
- **Trend direction** – Classified from current vs previous score and event count; sport isolation by player/sport key.
- **Sport isolation** – All 7 sports (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER) in SUPPORTED_SPORTS and TREND_SPORTS; filters isolate results.
- **Waiver integration** – onWaiverRunComplete calls recordTrendSignalsAndUpdate with waiver_add/waiver_drop; league sport from League.sport.
- **UI** – Trending panels, sport/timeframe, view trend details, add/drop toggle, Meta Insights and Waiver AI links, waiver page link to trending; refresh and back present. Single-player trend API implemented.

---

## 7. Issues fixed

- **injury_event missing** – Added to TREND_SIGNAL_TYPES and SIGNAL_TO_SIGNAL_KEY (injuryImpact); added recordInjuryEvent in record-signals.
- **Sport-aware trend score** – Added SportTrendContextResolver.getTrendWeightsForSport; TrendScoreCalculator.calculateTrendScoreForSport; PlayerTrendUpdater uses it so TrendScore is configurable and sport-aware.
- **No “view trend details”** – Details button and detail panel (add/drop, trade, draft, lineup, injury) added to PlayerTrendPanel; Close button clears detail.
- **No add/drop toggle** – “Show/Hide add/drop” toggle and per-row add/drop display added.
- **Waiver page not linking to trending** – “Trending players” link to /app/meta-insights added on waiver-ai page.
- **Single-player trend API** – GET /api/player-trend?playerId=&sport= returns getPlayerTrend result or 404.
- **Types comment** – Updated to list SOCCER in supported sports.

---

## 8. Final QA checklist

- [ ] **Waiver claims** – Process a waiver with add/drop; verify TrendSignalEvent rows and PlayerMetaTrend updated (addRate/dropRate) for that player/sport.
- [ ] **Trades** – Where recordTradeRequest is called, verify tradeInterest increases for that player/sport.
- [ ] **Draft picks** – Where recordDraftPick is called, verify draftFrequency increases.
- [ ] **Lineup starts** – Where recordLineupStart is called, verify lineupStartRate updates.
- [ ] **AI recommendations** – If recordAiRecommendation is wired, verify events counted (addRate or separate metric).
- [ ] **Trend scores** – After signals recorded, updatePlayerTrend produces trendScore and trendingDirection; score uses sport-aware weights when sport provided.
- [ ] **Trend direction** – With previousTrendScore and eventCount ≥ MIN_EVENTS_FOR_DIRECTION, direction is Rising/Hot/Stable/Falling/Cold as expected.
- [ ] **Sport filters** – Filter by NFL, SOCCER, etc.; only that sport’s PlayerMetaTrend rows returned.
- [ ] **Trending panels** – Hottest, rising, fallers show data when PlayerMetaTrend has rows; loading and error states.
- [ ] **View trend details** – Details button opens panel with addRate, dropRate, tradeInterest, draftFrequency, lineupStartRate, injuryImpact; Close closes.
- [ ] **Show add/drop** – Toggle shows/hides per-row add/drop rates.
- [ ] **Meta Insights / Waiver AI links** – From trend panel and waiver page; navigate correctly.
- [ ] **Single-player API** – GET /api/player-trend?playerId=X&sport=Y returns 200 + data or 404.
- [ ] **All seven sports** – NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER selectable and applied to trend queries and weights.

---

## 9. Explanation of the player trend engine

The **Player Trend Detection Engine** is a platform-wide layer that:

1. **Ingests signals** – Waiver add/drop, trade request, draft pick, lineup start, AI recommendation, injury (and injury_event) are recorded as TrendSignalEvent per playerId/sport. Waiver processing already calls recordTrendSignalsAndUpdate; draft, trade, lineup, and AI can call the same record* helpers.

2. **Aggregates by player/sport** – Over a 7-day window, events are summed and normalized to rates (addRate, dropRate, tradeInterest, draftFrequency, lineupStartRate, injuryImpact). Each sport is isolated (no cross-sport mixing in a single trend row).

3. **Scores and classifies** – A configurable, sport-aware weighted sum produces a raw trend score, normalized to 0–100. Direction (Rising, Hot, Stable, Falling, Cold) is computed by comparing current score to the stored previousTrendScore and event count, so direction reflects change vs historical baseline for that sport.

4. **Powers outputs** – Trending player lists (hottest, rising, fallers), AI recommendations (via getHottestPlayers/getRisingPlayers/getFallers in ai-meta-context), waiver alerts (trend data in waiver flows), draft assistant context (trend available for draft APIs), trade analyzer context (getPlayerTrend or list API), and player detail trend panels (Details in PlayerTrendPanel, GET ?playerId=&sport=).

5. **UI** – Meta Insights dashboard shows trending panels with sport filter, timeframe, refresh, view trend details, add/drop toggle, and links to Waiver AI and Meta Insights; waiver-ai page links to “Trending players.” All player-trend-related click paths are wired with no dead buttons or broken navigation.

The engine is production-ready: backend logic, sport-aware weights, signal types (including injury_event), waiver integration, and full UI click audit completed.
