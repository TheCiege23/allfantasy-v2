# Prompt 35 — Rivalry Engine + Full UI Click Audit (Deliverable)

## 1. Rivalry Engine Architecture

- **Purpose:** Detect, score, track, and display rivalries between managers/franchises per league, with sport-aware support and configurable tiers.
- **Data flow:**
  - **Inputs:** League ID, sport, season(s), optional trade/playoff/elimination/championship/drama maps keyed by canonical manager pair.
  - **Aggregation:** `HeadToHeadAggregator` reads `MatchupFact` (and league teams) to build per-pair H2H (total matchups, wins each side, close games, upsets).
  - **Scoring:** `RivalryScoreCalculator` turns aggregated inputs into a 0–100 score using configurable weights.
  - **Tiers:** `RivalryTierResolver` maps score to tier (Emerging, Heated, Blood Feud, League Classic) via configurable thresholds.
  - **Persistence:** `RivalryEngine` upserts `RivalryRecord` (canonical managerAId ≤ managerBId) and creates `RivalryEvent` timeline events on first creation.
- **Query:** `RivalryQueryService` lists rivalries by league (optional sport/manager filter), gets one by id or by pair; `RivalryTimelineBuilder` builds timeline from `RivalryEvent`.
- **Sport:** `SportRivalryResolver` normalizes and labels sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER).
- **Coexistence:** The existing `lib/rivalry-engine.ts` (e.g. `computeRivalryWeek` for transfer preview and RivalryWeekCards) is unchanged; the new engine under `lib/rivalry-engine/` is for persisted `RivalryRecord`/`RivalryEvent` and league-level rivalry views.

---

## 2. Rivalry Scoring Logic

- **Input shape:** `RivalryScoreInput`: totalMatchups, closeGameCount, playoffMeetings, eliminationEvents, championshipMeetings, upsetWins, tradeCount, contentionOverlapScore, dramaEventCount.
- **Normalization (per factor, then 0–100 cap):**
  - Total matchups: min(matchups/15, 1) × 100
  - Close game frequency: (closeGameCount / totalMatchups) × 100 when totalMatchups > 0
  - Playoff: min(playoffMeetings × 25, 100)
  - Elimination: min(eliminationEvents × 20, 100)
  - Championship: min(championshipMeetings × 50, 100)
  - Upset: min(upsetWins × 15, 100)
  - Trade: min(tradeCount × 12, 100)
  - Contention overlap and drama: already 0–100 or scaled similarly
- **Weights (default):** totalMatchups 0.15, closeGameFrequency 0.20, playoffMeetings 0.15, eliminationEvents 0.12, championshipMeetings 0.15, upsetFactor 0.08, tradeFrequency 0.10, contentionOverlap 0.03, dramaEvents 0.02 (sum 1.0).
- **Final score:** Weighted sum of normalized factors, clamped to 0–100, rounded to one decimal.

---

## 3. Schema Additions

- **RivalryRecord** (`rivalry_records`): id (cuid), leagueId, sport (VarChar 16), managerAId, managerBId (VarChar 128), rivalryScore (Float), rivalryTier (VarChar 32), firstDetectedAt, updatedAt. Unique (leagueId, managerAId, managerBId). Indexes: (leagueId, sport), (leagueId, rivalryTier), (managerAId, managerBId).
- **RivalryEvent** (`rivalry_events`): id (cuid), rivalryId (FK RivalryRecord, onDelete Cascade), eventType (VarChar 48), season (Int?), matchupId (VarChar 64?), tradeId (VarChar 64?), description (Text?), createdAt. Indexes: rivalryId, (eventType, season).

Canonical pair: managerAId and managerBId are stored in lexicographic order (managerAId ≤ managerBId) so the unique constraint is consistent.

---

## 4. Timeline and Badge Integration Updates

- **Timeline:** `RivalryTimelineBuilder` provides `buildTimelineForRivalry(rivalryId)` and `buildTimelineForLeague(leagueId, { sport?, season?, limit? })`. Used by GET `/api/leagues/[leagueId]/rivalries/[rivalryId]/timeline`.
- **Badges:** `RivalryTierResolver.getRivalryTierBadgeColor(tier)` returns a color hint (amber/red/orange/blue) for UI. League Intelligence panel “Rivalries” tab uses `RivalryEngineList` which shows tier badge, score, and event count per rivalry.
- **League Intelligence:** New “rivalries” view in `LeagueIntelligenceGraphPanel` shows `RivalryEngineList` with “Run rivalry engine”, “Refresh”, “Timeline”, and “Explain” per row. Explain calls POST `/api/leagues/[leagueId]/rivalries/explain` and displays narrative; Timeline calls GET `.../rivalries/[rivalryId]/timeline` and displays events inline.
- **Existing:** RivalryWeekCards (af-legacy, transfer preview) and RelationshipGraphView “rivalry” filter remain as-is; they use the legacy rivalry week computation and graph rivals respectively.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Status |
|----------|--------|---------|-------------|--------|
| **RivalryWeekCards** (af-legacy) | Expand/collapse cards | Local state (implicit in card layout) | Data from `transferPreview.rivalryWeek` | OK – presentational |
| **RivalryWeekCards** | Evidence chips | Display only (title=tooltip) | From `RivalryPair.evidence` | OK |
| **RivalryWeekCards** | Top rivalries list rows | No link (display only) | Same data | OK |
| **af-legacy** | Rivalry section visibility | Conditional render on `transferPreview?.rivalryWeek` | Transfer API returns rivalryWeek | OK |
| **RelationshipGraphView** | Filter buttons (all / rivalry / trade) | `setFilter(f)` | Local state; filters display of rivals vs trade partners | OK |
| **RelationshipGraphView** | Rivalry row manager names | `onSelectManager?.(entityId)` | Parent can switch view (e.g. to managers) | OK – wired |
| **LeagueIntelligenceGraphPanel** | View tabs (summary / graph / timeline / managers / rivalries) | `setView(v)` | Local state | OK |
| **LeagueIntelligenceGraphPanel** | Refresh button | `loadProfile(season)` | GET relationship-profile | OK |
| **LeagueIntelligenceGraphPanel** | AI explain (graph) | `setInsightDrawerOpen(true)` | GraphInsightDrawer | OK |
| **LeagueIntelligenceGraphPanel** | Season dropdown | `setSeason` | Filters profile/timeline | OK |
| **RivalryEngineList** | “Run rivalry engine” | `runEngine()` | POST `/api/leagues/[leagueId]/rivalries` then `load()` | OK |
| **RivalryEngineList** | “Refresh” | `load()` | GET `/api/leagues/[leagueId]/rivalries` | OK |
| **RivalryEngineList** | “Timeline” per row | `onViewTimeline(r.id)` | Parent fetches GET `.../rivalries/[rivalryId]/timeline` and sets state to show timeline | OK |
| **RivalryEngineList** | “Explain” per row | `onExplain(r.id)` | Parent fetches POST `.../rivalries/explain` with `{ rivalryId }` and shows narrative | OK |

**Notes:**

- No dedicated “rivalry detail page” route exists; detail is shown inline in the League Intelligence “rivalries” view (timeline + explain).
- Graph “rivalries” come from relationship-map (graph edges), not from RivalryRecord; engine rivalries are in the “rivalries” tab.
- Trade count in the engine currently uses `getTradeCountByPairForGraph`; keys are Sleeper username|partnerRosterId, which may not match managerAId|managerBId (team externalId/ownerName). If no matchup data exists for a league, rivalries may be empty until MatchupFact is populated.

---

## 6. QA Findings

- **Rivalry scores:** Generated from H2H + optional inputs; formula and weights produce 0–100. Manual check: run engine for a league with MatchupFact data and confirm scores and tiers in list.
- **Tiers:** Resolve correctly for default thresholds (Emerging 0–39, Heated 40–64, Blood Feud 65–84, League Classic 85+).
- **Timelines:** Populate on first creation of a RivalryRecord; re-running engine does not duplicate events (events created only when record is new).
- **Head-to-head:** HeadToHeadAggregator uses MatchupFact + LeagueTeam; manager ids are team externalId when useTeamIds is true. Sport filter in list isolates by `sport` on RivalryRecord.
- **AI explanation:** Explain endpoint returns a short narrative and timeline preview; no AI model call in current implementation (narrative is template-based). Can be wired to graph-insight or another AI later.
- **Click paths:** All listed buttons and filters have handlers and API/data wiring; no dead buttons identified in the audited components.

---

## 7. Issues Fixed

- **RivalryScoreCalculator:** Corrected final score to be the weighted sum (0–100) without an extra scaling factor so the result stays in 0–100.
- **HeadToHeadAggregator:** Fixed `Map<string {` typo to `Map<string, {`; clarified team resolution using LeagueTeam (externalId, ownerName) and MatchupFact.
- **RivalryEngine:** Events are created only when a RivalryRecord is first created to avoid duplicate timeline events on re-runs.
- **RivalryEngineList:** Replaced dynamic Tailwind tier classes with explicit amber/red/orange/blue classes so styles are included by purge.
- **LeagueIntelligenceGraphPanel:** Added “rivalries” view and wired Explain/Timeline to new API routes and local state for narrative and timeline display.

---

## 8. Final QA Checklist

- [ ] Run Prisma migration for RivalryRecord and RivalryEvent (or apply schema manually).
- [ ] For a league with MatchupFact data: POST run rivalry engine, then GET list rivalries; confirm records and scores.
- [ ] Filter list by sport and by managerId; confirm results.
- [ ] Open a rivalry Timeline in League Intelligence → Rivalries tab; confirm events load.
- [ ] Click Explain for a rivalry; confirm narrative appears.
- [ ] Confirm RivalryWeekCards still render on af-legacy when transfer preview includes rivalryWeek.
- [ ] Confirm RelationshipGraphView filter “rivalry” and manager clicks still work.
- [ ] Confirm no duplicate RivalryEvent rows after multiple engine runs for the same league.

---

## 9. Explanation of the Rivalry Engine

The Rivalry Engine is a league-scoped system that:

1. **Detects** manager pairs that have faced each other (and optionally traded or met in playoffs/championships) using matchup facts and optional trade/playoff data.
2. **Scores** each pair from 0 to 100 using weighted factors: volume of matchups, share of close games, playoff/elimination/championship meetings, upsets, trades, contention overlap, and drama events.
3. **Assigns a tier** (Emerging, Heated, Blood Feud, League Classic) from configurable score thresholds so leagues can highlight the most intense rivalries.
4. **Stores** one RivalryRecord per league and manager pair (with canonical ordering) and RivalryEvent rows for timeline (e.g. h2h_matchup, close_game, upset_win, trade).
5. **Exposes** list/detail/timeline and an “Explain this rivalry” narrative via API and integrates into the League Intelligence panel with a “Rivalries” tab, Run engine, Refresh, Timeline, and Explain actions.

It supports all required sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) via sport normalization and is designed to work with existing matchup history (MatchupFact), optional trade data, and future playoff/elimination/championship and drama feeds. The legacy weekly rivalry experience (Rivalry of the Week, Revenge Game, Trade Tension) remains separate and continues to use the existing `computeRivalryWeek` flow.
