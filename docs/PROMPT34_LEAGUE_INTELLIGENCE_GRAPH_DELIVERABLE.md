# Prompt 34 — League Intelligence Graph Core Architecture + Full UI Click Audit

## 1. League Intelligence Graph Architecture

The League Intelligence Graph is implemented as a persisted, queryable graph over league entities and relationships with current + historical context support.

- Build pipeline: `GraphNodeBuilder` + `GraphEdgeBuilder` -> `GraphSnapshotService` (`graph_nodes`, `graph_edges`, `league_graph_snapshots`).
- Query pipeline: `GraphQueryService`, `RelationshipSummaryBuilder`, `LeagueRelationshipMapBuilder`, `GraphInfluenceEngine`.
- Orchestration: `LeagueIntelligenceGraphService` and `LeagueIntelligenceGraphEngine`.
- Sport-aware scoping: `SportGraphResolver` now resolves sports from `lib/sport-scope.ts` source-of-truth.
- Data freshness: `relationship-map` and `relationship-profile` APIs can auto-rebuild empty graph data and support explicit `?rebuild=1`.

## 2. Schema Additions

Existing graph tables were preserved and reused.

- `GraphNode`: `sport` + indexes support sport-aware filtering.
- `GraphEdge`: `sport` + indexes support sport-aware filtering.
- `LeagueGraphSnapshot`: preserved for season/all-season snapshot metadata.

No destructive schema changes were introduced.

## 3. Graph Node and Edge Model Design

### Node model coverage

- `ManagerNode`: `managerId`, `displayName`, sport context, optional reputation + Hall-of-Fame metadata when available.
- `TeamNode` (`TeamSeason`): `teamId`, `leagueId`, `sport`, `season`.
- `LeagueNode`: `leagueId`, `sport`, `season`.
- Additional preserved nodes: `Trade`, `Championship`, `Rivalry`, `DraftPick`.

### Edge model coverage

Implemented and/or persisted graph structures now include:

- `TRADED_WITH`
- `FACED`
- `DEFEATED`
- `ELIMINATED`
- `RIVAL_OF`
- `LEAGUE_MEMBER_OF`
- `CHAMPION_OF`
- `COMMISSIONED_BY` (+ `COMMISSIONER_OF`)
- `POWER_SHIFT_EDGE`
- `DRAMA_EVENT_EDGE`
- `MANAGES`, `OWNS`, `WON_TITLE`, `ACQUIRED`, `DRAFTED`

`CO_MANAGED` remains type-supported and can be emitted when co-manager source data is present.

## 4. Backend Graph Services

Implemented/verified core modules required by Prompt 34:

- `LeagueIntelligenceGraphService`
- `GraphNodeBuilder`
- `GraphEdgeBuilder`
- `GraphHistoryAggregator`
- `GraphQueryService`
- `SportGraphResolver`
- `GraphSnapshotGenerator`

Key backend improvements in this pass:

- Sport filter plumbed through map/profile/query/analyzer services.
- Graph routes accept sport + rebuild controls.
- Relationship profile/map routes can rebuild stale/empty graph state.
- AI graph-insight route now accepts sport context for focused relationship explanations.

## 5. Integration Points (Warehouse, History, AI)

### Warehouse + historical sources

- `MatchupFact` -> `FACED` / `DEFEATED`.
- `SeasonResult` -> `WON_TITLE`, `CHAMPION_OF`, `ELIMINATED`, power-shift linkage.
- `LeagueTradeHistory`/`LeagueTrade` -> `TRADED_WITH`, `ACQUIRED`.
- `DraftFact` -> `DraftPick` nodes + `DRAFTED` edges.
- `DramaEvent` -> `DRAMA_EVENT_EDGE`.
- Rivalry records -> `RIVAL_OF`.
- Dynasty backfill route still refreshes graph snapshots.

### Reputation / Hall-of-Fame context

- Manager node metadata now includes optional reputation and Hall-of-Fame summaries if records exist.

### AI integration

- `graph-insight` supports sport-aware focused explanations (`summary`, `rivalry`, `manager`, `timeline` patterns).
- `getGraphSummaryForAI()` now supports sport-scoped context extraction.

## 6. Full UI Click Audit Findings

A full matrix is captured in:

- `docs/PROMPT34_GRAPH_CLICK_AUDIT_MATRIX.md`

Audited and verified/fixed interactions include:

- Graph dashboard entry (Intelligence tab).
- Season + sport graph filters.
- Refresh + rebuild graph buttons.
- Graph view filters (`all`, `rivalry`, `trade`).
- Node detail clicks + back navigation.
- Edge detail clicks + back navigation.
- AI “Explain this relationship” button.
- AI graph drawer open/close/regenerate.
- Rivalry engine run/refresh/explain/timeline clicks.
- Loading and error state rendering for graph views.
- API wiring + no-store fetch reload behavior.

## 7. QA Findings

Executed:

- `npm run -s typecheck` ✅
- `ReadLints` on changed files ✅
- `npm run test:e2e -- e2e/league-intelligence-graph-click-audit.spec.ts --project=chromium` ✅

QA confirms:

- End-to-end graph click flows are wired.
- Sport filtering is honored in relationship-profile/map and graph insight paths.
- Rebuild flow addresses stale/empty graph node states.
- Node/edge detail interactions and relationship AI explanation are operational.

## 8. Issues Fixed

1. Hardcoded sport behavior in graph/rivalry paths.
   - Replaced with `sport-scope`-based normalization and supported sport validation.

2. Missing explicit sport filtering for graph APIs/UI.
   - Added `sport` filtering support across graph analyzers, map/profile routes, and UI controls.

3. Stale graph states causing empty map/profile.
   - Added `rebuild` trigger and auto-rebuild fallback in graph API routes.

4. Missing required graph relationship structures.
   - Added `LEAGUE_MEMBER_OF`, `CHAMPION_OF`, `ELIMINATED`, `COMMISSIONED_BY`, `POWER_SHIFT_EDGE`, `DRAMA_EVENT_EDGE`, plus draft relationship wiring.

5. Missing node/edge drill-down click coverage.
   - Added node detail panel, edge detail panel, and explicit back navigation in graph view.

6. Missing direct AI relationship explanation in graph view.
   - Added “Explain this relationship” action from edge detail.

## 9. Final QA Checklist

- [x] Intelligence tab entry renders graph panel.
- [x] Season filter reloads relationship profile.
- [x] Sport filter reloads and scopes graph/profile calls.
- [x] Refresh button refetches graph data.
- [x] Rebuild button triggers graph rebuild and reload.
- [x] Graph view filter toggles and updates displayed relationship lists.
- [x] Node detail click + back navigation works.
- [x] Edge detail click + back navigation works.
- [x] “Explain this relationship” returns AI narrative.
- [x] Drawer open/close/regenerate works.
- [x] Rivalry list explain/timeline actions work.
- [x] Loading + error states are rendered by graph components.
- [ ] Full cross-sport manual pass in live data leagues for all seven sports (recommended final production smoke).

## 10. Explanation of the League Intelligence Graph

The League Intelligence Graph is a production graph intelligence layer that turns league history into relationship-aware signals:

- It maps managers, teams, league membership, trades, matchups, championships, rivalries, and drama/power-shift transitions.
- It supports both point-in-time (`season`) and historical (`all-season`) intelligence.
- It remains sport-aware via centralized sport normalization and filtering (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer).
- It powers UI relationship exploration (summary, graph, timeline, managers, rivalries), AI explainability, and future storyline-ready outputs.

In short: this implementation provides a sport-safe, history-aware graph core with auditable click flows and production-ready API/UI wiring.
