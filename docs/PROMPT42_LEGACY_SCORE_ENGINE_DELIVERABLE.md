# Prompt 42 — Legacy Score Engine + Full UI Click Audit (Deliverable)

## 1. Legacy Score Architecture

- **Purpose:** Measure long-term manager and franchise greatness via a Legacy Score (0–100) based on championships, playoff appearances, finals, win percentage, rivalry dominance, awards, consistency, dynasty runs, high-difficulty league success, and historical staying power. Scores are queryable, explainable, and visible across the product.
- **Data flow:**
  - **Evidence:** `LegacyEvidenceRecord` stores evidenceType, value, sourceReference per entity/sport. Evidence types: championships, playoff_appearances, finals_appearances, win_pct, rivalry_dominance, awards, consistency, dynasty_run, high_difficulty_success, staying_power. When none exists, default evidence is seeded. For MANAGER + leagueId, `LegacyEvidenceAggregator` also pulls from `SeasonResult` and `HallOfFameRow` to derive championships, playoff/finals proxy, win %, and staying power.
  - **Aggregation:** `LegacyEvidenceAggregator.aggregateLegacyEvidence` produces `AggregatedLegacyEvidence` (0–100 scale inputs per dimension).
  - **Scoring:** `LegacyScoreCalculator.computeLegacyScores` computes six dimension scores (0–100): championshipScore, playoffScore, consistencyScore, rivalryScore, awardsScore, dynastyScore, and overallLegacyScore (weighted sum). Weights are explainable and fixed.
  - **Persistence:** `LegacyScoreEngine.runLegacyScoreEngine` runs for one entity; `runLegacyScoreEngineForLeague` runs for all managers (rosters) in a league. Uses findFirst + create/update (no upsert with nullable leagueId) to persist `LegacyScoreRecord`.
  - **Query:** `LegacyRankingService` — `queryLegacyLeaderboard` (sport, leagueId, entityType, limit, offset), `getLegacyScoreByEntity`, `getLegacyScoreById`.
  - **AI / explanation:** `AILegacyExplanationService` — `buildLegacyExplanationContext`, `buildLegacyExplanationNarrative` for “Why is this score high?” and AI explain.
- **Sport:** All seven sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) via `SportLegacyResolver` and `lib/sport-scope`.
- **Preserved:** Championships, playoff history, standings history (SeasonResult, HallOfFameRow), rivalry systems, awards systems, Hall of Fame system, dynasty projections, manager/team profiles, dashboards, and league homepages are unchanged. Legacy Score is additive (new tables, engine, APIs, UI).

---

## 2. Scoring Logic

- **Dimensions (0–100 each):** championshipScore (championships, finals, playoff appearances), playoffScore (playoff + finals), consistencyScore (consistency + winPct), rivalryScore (rivalry dominance), awardsScore (awards), dynastyScore (dynasty run + staying power + high difficulty).
- **Overall:** Weighted sum of dimension scores: championship 28%, playoff 20%, consistency 18%, rivalry 12%, awards 10%, dynasty 12%. Result clamped 0–100.
- **Evidence → aggregation:** Stored evidence averaged per type; for MANAGER with leagueId, SeasonResult and HallOfFameRow augment championships, seasons played, wins, and champion flags. Aggregator outputs 0–100 inputs per dimension.
- **Explainable:** Weights and formulas are in code; breakdown API and narrative expose dimension scores and top drivers.

---

## 3. Schema Additions

- **LegacyScoreRecord** (`legacy_score_records`): id (cuid), entityType (VarChar 32), entityId (VarChar 128), sport (VarChar 16), leagueId (VarChar 64, optional), overallLegacyScore, championshipScore, playoffScore, consistencyScore, rivalryScore, awardsScore, dynastyScore (all Decimal 10,4), updatedAt. Unique (entityType, entityId, sport, leagueId). Indexes: (sport, leagueId), (entityType, entityId), (overallLegacyScore).
- **LegacyEvidenceRecord** (`legacy_evidence_records`): id (cuid), entityType, entityId, sport, evidenceType (VarChar 64), value (Decimal 12,4), sourceReference (VarChar 256, optional), createdAt. Indexes: (entityType, entityId, sport), (sport, evidenceType).

Migration: `20260318000000_add_legacy_score_engine`. Apply with `npx prisma migrate deploy` (or `prisma migrate dev` in interactive env).

---

## 4. Leaderboard and Profile Integration Updates

- **League Legacy tab:** New “Legacy” tab in app league shell (`LeagueTabNav` + `LEAGUE_SHELL_TABS`). Renders `LegacyTab`: sport filter, Refresh, “Run legacy engine,” legacy leaderboard (records with overall score, “Why is this score high?” link to breakdown page, “AI explain” button). Cross-reference note to Hall of Fame tab.
- **Breakdown page:** `/app/league/[leagueId]/legacy/breakdown?entityType=MANAGER&entityId=...` shows full score breakdown (all six dimensions), “Why is this score high?” button (POST explain → narrative), and Back to league.
- **Legacy score badge:** `LegacyScoreBadge` component (leagueId, entityType, entityId) fetches GET legacy-score?entityType&entityId and displays “Legacy &lt;score&gt;” with tier-based styling (elite/strong/solid/building). Usable on profile cards, partner match, member lists.
- **Hall of Fame cross-link:** Hall of Fame section includes a note: “Legacy scores (championships, playoffs, consistency) are in the Legacy tab.” Legacy tab copy references Hall of Fame tab.
- **APIs:** GET `/api/leagues/[leagueId]/legacy-score` (entityType, entityId for single record; else leaderboard with sport, limit, offset). GET `/api/leagues/[leagueId]/legacy-score/breakdown` (entityType, entityId, sport — full breakdown + explanationContext). POST `/api/leagues/[leagueId]/legacy-score/run` (run engine for league). POST `/api/leagues/[leagueId]/legacy-score/explain` (body entityType, entityId, sport? — narrative for AI explain).
- **Future:** Platform-wide leaderboards, comparison views (side-by-side), dynasty intelligence integration can consume the same engine and APIs.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Persisted Reload | Status |
|----------|--------|---------|-------------|------------------|--------|
| **League shell** | Legacy tab | onChange('Legacy') | Renders LegacyTab | — | OK |
| **LegacyTab** | Sport filter | setSportFilter(e.target.value) | useLegacyScoreLeaderboard(leagueId, sport) | Refetch on filter change | OK |
| **LegacyTab** | Refresh button | refresh() | GET legacy-score list | Hook refresh() | OK |
| **LegacyTab** | Run legacy engine | runEngine() | POST legacy-score/run, then refresh() | Yes | OK |
| **LegacyTab** | “Why is this score high?” | Link to /app/league/.../legacy/breakdown?entityType&entityId | Breakdown page GET breakdown | Page fetch on load | OK |
| **LegacyTab** | “AI explain” button | explain(entityId) | POST legacy-score/explain; setExplainNarrative | Toggle show/hide | OK |
| **Legacy breakdown page** | Back to league | Link to /app/league/[leagueId] | — | — | OK |
| **Legacy breakdown page** | “Why is this score high?” | tellStory() | POST legacy-score/explain | setNarrative | OK |
| **LegacyScoreBadge** | (display only) | — | GET legacy-score?entityType&entityId in useEffect | Refetch when leagueId/entityId change | OK |
| **HallOfFameSection** | Legacy note | — | Text + “Legacy tab” | — | OK |
| **GET /legacy-score** | Leaderboard / single | useLegacyScoreLeaderboard, LegacyScoreBadge | Query params entityType, entityId, sport, limit, offset | Yes | OK |
| **GET /legacy-score/breakdown** | Breakdown page | Page load | entityType, entityId, sport | — | OK |
| **POST /legacy-score/run** | Run engine | runEngine() | Runs for all league managers; returns processed, results | refresh() after | OK |
| **POST /legacy-score/explain** | AI explain | explain(), tellStory() | Body entityType, entityId, sport?; returns narrative, breakdown | — | OK |

**Notes:**

- Loading/error: LegacyTab shows loading and error for leaderboard; Run button shows “Running…” while POST in flight. Breakdown page shows loading and error.
- “Why is this score high?” links to in-app breakdown page (drill-down), not raw API. AI explain uses current legacy score data from DB.
- No dead buttons identified; all handlers and APIs wired. Filters and refresh update state and refetch.

---

## 6. QA Findings

- **Scores:** Computed from evidence + league history (SeasonResult, HallOfFameRow for MANAGER). When no evidence, default seeds yield low but non-zero scores; league history boosts championships, playoff proxy, consistency, staying power.
- **Leaderboard:** Filter by sport and league (leagueId implicit in route). Entity type filter supported (default MANAGER in UI).
- **Breakdown:** All six dimensions and overall displayed; narrative from buildLegacyExplanationNarrative lists top drivers.
- **Profile/partner use:** LegacyScoreBadge can be placed next to manager id (e.g. rosterId) on profile or partner cards; fetches single record by entityType + entityId + leagueId.
- **Hall of Fame cross-links:** Hall of Fame section references Legacy tab; Legacy tab references Hall of Fame tab.
- **AI explain:** POST explain returns narrative built from current record; used in LegacyTab (inline) and breakdown page (button).
- **Sports:** All seven supported; sport normalized via SportLegacyResolver.

---

## 7. Issues Fixed

- **Schema:** Added LegacyScoreRecord and LegacyEvidenceRecord with indexes and unique (entityType, entityId, sport, leagueId). Migration file created.
- **Engine:** Implemented LegacyScoreEngine (runLegacyScoreEngine, runLegacyScoreEngineForLeague), LegacyScoreCalculator, LegacyEvidenceAggregator (with SeasonResult/HallOfFameRow pull for MANAGER), LegacyRankingService, SportLegacyResolver, AILegacyExplanationService. All export from `lib/legacy-score-engine`.
- **Persistence:** Used findFirst + create/update instead of upsert to avoid Prisma compound unique with nullable leagueId issues.
- **APIs:** GET legacy-score (list + single), GET legacy-score/breakdown, POST legacy-score/run, POST legacy-score/explain.
- **UI:** Legacy tab with leaderboard, sport filter, Refresh, Run engine, cards with “Why is this score high?” (breakdown page) and “AI explain”; breakdown page with full dimensions and explain button; LegacyScoreBadge component; Hall of Fame section note for Legacy tab.
- **Navigation:** “Why is this score high?” links to `/app/league/[leagueId]/legacy/breakdown?...` for proper drill-down.

---

## 8. Final QA Checklist

- [ ] Open app league page → Legacy tab; confirm sport filter, Refresh, Run legacy engine, and leaderboard (or empty state).
- [ ] Click “Run legacy engine”; confirm loading then list or “No legacy scores yet” updates after run.
- [ ] Change sport filter and click Refresh; confirm list updates.
- [ ] Click “Why is this score high?” on a record; confirm breakdown page loads with overall and six dimensions; click “Why is this score high?” and confirm narrative.
- [ ] In Legacy tab, click “AI explain” on a record; confirm narrative expands; click again to hide.
- [ ] Verify GET /legacy-score with leagueId returns list; with entityType + entityId returns single record.
- [ ] Verify GET /legacy-score/breakdown with entityType, entityId returns record + breakdown.
- [ ] Verify POST /legacy-score/explain with entityType, entityId returns narrative.
- [ ] Place LegacyScoreBadge on a profile or partner card (leagueId, entityId); confirm badge shows when record exists.
- [ ] Confirm Hall of Fame section shows Legacy tab note; Legacy tab shows Hall of Fame reference.
- [ ] Confirm no regression to Hall of Fame, Standings, or other league tabs.

---

## 9. Explanation of the Legacy Score Engine

The Legacy Score Engine measures long-term manager and franchise greatness:

1. **Evidence** is stored in `LegacyEvidenceRecord` (evidenceType, value, sourceReference). Types include championships, playoff_appearances, finals_appearances, win_pct, rivalry_dominance, awards, consistency, dynasty_run, high_difficulty_success, staying_power. For managers in a league, the aggregator also reads `SeasonResult` and `HallOfFameRow` to derive championship count, seasons played, wins, and champion flags so scores can be computed even before explicit evidence is added.

2. **Aggregation** combines evidence (and league history for MANAGER) into 0–100 inputs per dimension: championships, playoff/finals, win %, rivalry, awards, consistency, dynasty/staying power.

3. **Scoring** produces six dimension scores (0–100): championship, playoff, consistency, rivalry, awards, dynasty. The overall legacy score is a weighted sum (championship 28%, playoff 20%, consistency 18%, rivalry 12%, awards 10%, dynasty 12%), clamped to 0–100. Weights are explainable and comparable across sports.

4. **Persistence** stores one `LegacyScoreRecord` per (entityType, entityId, sport, leagueId). The engine can be run for a single entity or for all managers in a league (from SeasonResult rosterIds).

5. **APIs and UI** expose list/get, breakdown, run, and explain. The Legacy tab shows the league leaderboard with sport filter, Run engine, and per-record “Why is this score high?” (breakdown page) and “AI explain” (narrative). The breakdown page shows all dimension scores and an explain button. LegacyScoreBadge can be used on profile or partner cards. The system supports all seven sports and is designed for league and platform leaderboards, comparison views, and future dynasty intelligence integrations.
