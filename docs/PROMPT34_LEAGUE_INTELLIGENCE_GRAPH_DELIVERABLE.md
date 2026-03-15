# Prompt 34 — League Intelligence Graph Core Architecture + Full UI Click Audit — Deliverable

## 1. League Intelligence Graph Architecture

### Overview

The **League Intelligence Graph** maps relationships between managers, teams, leagues, trades, matchups, championships, rivalries, and dynasty power shifts. It supports both current and historical league intelligence and is used by dashboards, league/team pages, and AI systems.

### Data flow

```
Data sources (Warehouse, League, LeagueTrade, MatchupFact, SeasonResult, UserRivalry)
    → GraphNodeBuilder (nodes: League, TeamSeason, Manager, Championship, Trade, Rivalry)
    → GraphEdgeBuilder (edges: MANAGES, OWNS, WON_TITLE, TRADED_WITH, RIVAL_OF, FACED, DEFEATED, ACQUIRED, …)
    → GraphSnapshotService (persist to GraphNode, GraphEdge, LeagueGraphSnapshot)
    → GraphQueryService / RelationshipSummaryBuilder / LeagueRelationshipMapBuilder
    → API (relationship-map, relationship-profile, graph-insight) and UI (LeagueIntelligenceGraphPanel)
```

- **Build path:** `buildAndPersistSnapshot(leagueId, season)` builds nodes and edges from league, teams, trades, rivalries, championship results, and matchup facts (FACED/DEFEATED), then writes to `graph_nodes`, `graph_edges`, and `league_graph_snapshots`.
- **Query path:** `getStrongestRivals`, `getTopTradePartners`, `getManagerConnectionScores`, `getDramaCentralTeams`, `getPowerShiftOverTime`, `getRepeatedEliminationPatterns`, `buildRelationshipSummary`, `buildRelationshipMap` read from the persisted graph.
- **Sport isolation:** All seven sports (NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer) are supported; nodes and edges carry optional `sport` for filtering. Relationships are scoped by league and season unless a cross-season dynasty view is requested.

### Core modules

| Module | Purpose |
|--------|--------|
| **LeagueIntelligenceGraphService** | Orchestrator: build snapshot, get profile, get relationship map, query rivals/trade partners/power shift, getGraphSummaryForAI. |
| **GraphNodeBuilder** | Builds graph nodes from league, teams, trades, championships, rivalries; includes sport on each node. |
| **GraphEdgeBuilder** | Builds graph edges: MANAGES, OWNS, WON_TITLE, TRADED_WITH, RIVAL_OF, FACED, DEFEATED, ACQUIRED; includes sport; uses MatchupFact for FACED/DEFEATED. |
| **GraphHistoryAggregator** | Aggregates warehouse/history data for graph: getMatchupHistoryForGraph, getStandingsHistoryForGraph, getLeagueHistorySummaryForGraph, getTradeCountByPairForGraph. |
| **GraphQueryService** | Read-only queries: getStrongestRivals, getTopTradePartners, getManagerConnectionScores, getDramaCentralTeams, getPowerShiftOverTime, getEraDominance, getRepeatedEliminationPatterns. |
| **SportGraphResolver** | normalizeSportForGraph, getSportGraphLabel, isSupportedGraphSport; GRAPH_SPORTS (all seven). |
| **GraphSnapshotGenerator** | Alias for snapshot generation: generateSnapshot, buildAndPersistSnapshot, getSnapshot. |

---

## 2. Schema Additions

- **GraphNode:** Optional `sport` column added (`String?` @db.VarChar(16)) and index `@@index([leagueId, sport])` for sport-scoped queries.
- **GraphEdge:** Optional `sport` column added (`String?` @db.VarChar(16)) and index `@@index([edgeType, sport])` for filtering edges by sport.

Existing tables **graph_nodes**, **graph_edges**, **league_graph_snapshots** were already present; only optional `sport` and indexes were added. No new tables.

---

## 3. Graph Node and Edge Model Design

### Node types (GraphNodePayload / GraphNode)

| Node type | entityId / identity | leagueId | season | sport | metadata |
|-----------|----------------------|----------|--------|-------|----------|
| **League** | league.id | leagueId | null or season | from league | name, platform |
| **TeamSeason** | team.id | leagueId | season | from league | teamName, ownerName, externalId, wins, losses |
| **Manager** | manager:ownerName:externalId or userId | leagueId | season | from league | ownerName, teamId or source |
| **Championship** | champ:leagueId:season:rosterId | leagueId | season | from league | rosterId, season |
| **Trade** | trade.id (cuid) | leagueId | season | from trade or league | week, partnerRosterId, partnerName |
| **Rivalry** | userAId_userBId | leagueId | season | from league | userAId, userBId, totalMeetings, winsA, winsB |

### Edge types (EDGE_TYPES)

- **MANAGES**, **OWNS** — Manager → TeamSeason  
- **WON_TITLE** — TeamSeason → Championship  
- **CHAMPION_OF** — (alias/concept; WON_TITLE used in persistence)  
- **TRADED_WITH** — TeamSeason ↔ TeamSeason (aggregated by transaction)  
- **ACQUIRED** — Trade → TeamSeason  
- **RIVAL_OF** — Manager ↔ Manager  
- **FACED** — TeamSeason ↔ TeamSeason (from MatchupFact; weight = meeting count)  
- **DEFEATED** — TeamSeason (winner) → TeamSeason (loser) (from MatchupFact; weight = count)  
- **LOST_TO**, **ELIMINATED** — (used in queries; can be populated from playoff/elimination data)  
- **COMMISSIONER_OF**, **COMMISSIONED_BY** — (commissioner relationship when applicable)  
- **POWER_SHIFT_EDGE**, **DRAMA_EVENT_EDGE**, **CO_MANAGED** — (defined in types for future use)  
- **DRAFTED**, **INFLUENCED_BY**, **SUCCESSOR_OF**, **BLOCKED**, **MENTIONED** — (existing/extensible)

Node IDs are stable: `nodeId(nodeType, entityId, leagueId, season)`. Edge IDs: `edgeId(fromNodeId, toNodeId, edgeType, season, suffix?)`.

---

## 4. Backend Graph Services

| Service | Location | Main functions |
|---------|----------|----------------|
| **LeagueIntelligenceGraphService** | `lib/league-intelligence-graph/LeagueIntelligenceGraphService.ts` | buildSnapshot, getSnapshotPayload, getRelationshipProfile, getRelationshipMap, queryRivals, queryTradePartners, queryPowerShift, queryRepeatedEliminations, getGraphSummaryForAI |
| **GraphNodeBuilder** | `lib/league-intelligence-graph/GraphNodeBuilder.ts` | buildGraphNodes (League, TeamSeason, Manager, Championship, Trade, Rivalry; sport on each) |
| **GraphEdgeBuilder** | `lib/league-intelligence-graph/GraphEdgeBuilder.ts` | buildGraphEdges (MANAGES, OWNS, WON_TITLE, TRADED_WITH, RIVAL_OF, FACED, DEFEATED, ACQUIRED; sport on each; FACED/DEFEATED from MatchupFact) |
| **GraphHistoryAggregator** | `lib/league-intelligence-graph/GraphHistoryAggregator.ts` | getMatchupHistoryForGraph, getStandingsHistoryForGraph, getLeagueHistorySummaryForGraph, getTradeCountByPairForGraph |
| **GraphQueryService** | `lib/league-intelligence-graph/GraphQueryService.ts` | getStrongestRivals, getTopTradePartners, getManagerConnectionScores, getDramaCentralTeams, getPowerShiftOverTime, getEraDominance, getRepeatedEliminationPatterns |
| **SportGraphResolver** | `lib/league-intelligence-graph/SportGraphResolver.ts` | normalizeSportForGraph, getSportGraphLabel, isSupportedGraphSport, GRAPH_SPORTS |
| **GraphSnapshotService** | `lib/league-intelligence-graph/GraphSnapshotService.ts` | buildAndPersistSnapshot, getSnapshot (persist nodes/edges/snapshot; write sport) |
| **GraphSnapshotGenerator** | `lib/league-intelligence-graph/GraphSnapshotGenerator.ts` | generateSnapshot (alias), buildAndPersistSnapshot, getSnapshot |
| **RelationshipSummaryBuilder** | `lib/league-intelligence-graph/RelationshipSummaryBuilder.ts` | buildRelationshipSummary (rivalries, trade clusters, influence, central/isolated, power transitions, elimination patterns) |
| **DynastyPowerShiftDetector** | `lib/league-intelligence-graph/DynastyPowerShiftDetector.ts` | detectDynastyPowerShifts |
| **LeagueRelationshipMapBuilder** | `lib/league-intelligence-graph/LeagueRelationshipMapBuilder.ts` | buildRelationshipMap (nodes, edges, rivals, trade partners, etc.) |
| **GraphInfluenceEngine** | `lib/league-intelligence-graph/GraphInfluenceEngine.ts` | buildLeagueRelationshipProfile, getManagerInfluenceProfile, queryMostInfluentialManager, etc. |

---

## 5. Integration Points with Warehouse, History, and AI

- **Fantasy Data Warehouse:** MatchupFact used for FACED/DEFEATED edges; SeasonStandingFact used via getStandingsHistoryForGraph; getLeagueHistorySummaryForGraph uses LeagueHistoryAggregator. Trade data from LeagueTradeHistory + LeagueTrade.
- **History systems:** GraphHistoryAggregator.getMatchupHistoryForGraph, getStandingsHistoryForGraph, getTradeCountByPairForGraph feed into graph build and analytics. Dynasty backfill triggers graph refresh (dynasty-backfill route calls buildLeagueGraph).
- **AI systems:** getGraphSummaryForAI(leagueId, options) returns a text summary of rivalries, trade pairs, and elimination patterns for Chimmy or other AI. graph-insight API uses buildLeagueRelationshipProfile and OpenAI/DeepSeek/Grok for “AI explain” in the UI.
- **League / team pages:** League page “Intelligence” tab renders LeagueIntelligenceGraphPanel (relationship profile, graph view, timeline, managers). relationship-map and relationship-profile APIs power the panel.

---

## 6. Full UI Click Audit Findings

### 6.1 Graph dashboard entry points

| Element | Component / Route | Handler | State | API / backend | Cache / reload | Status |
|--------|-------------------|--------|-------|----------------|----------------|--------|
| “Intelligence” tab | `app/leagues/[leagueId]/page.tsx` | Tab click → set activeTab | activeTab | N/A | N/A | **OK** |
| League Intelligence Graph panel | `LeagueIntelligenceGraphPanel.tsx` | Renders when activeTab === "Intelligence" | view, season, profile, loading, error | GET relationship-profile | loadProfile(season) on mount and when season changes | **OK** |

### 6.2 Season and view controls

| Element | Component / Route | Handler | State | API / backend | Cache / reload | Status |
|--------|-------------------|--------|-------|----------------|----------------|--------|
| Season dropdown (dynasty) | `LeagueIntelligenceGraphPanel.tsx` | onChange → setSeason | season | N/A | useEffect reloads profile when season changes | **OK** |
| View tabs (summary, graph, timeline, managers) | Same | onClick → setView(v) | view | N/A | N/A | **OK** |
| **Refresh** button | Same | onClick → loadProfile(season) | loading | GET relationship-profile | Refetches profile | **OK** (added) |
| AI explain button | Same | onClick → setInsightDrawerOpen(true) | insightDrawerOpen | N/A | Opens drawer | **OK** |

### 6.3 Relationship graph view

| Element | Component / Route | Handler | State | API / backend | Cache / reload | Status |
|--------|-------------------|--------|-------|----------------|----------------|--------|
| Load relationship map | `RelationshipGraphView.tsx` | load() in useEffect | data, loading, error | GET relationship-map?season= | On mount; no refresh button in view | **OK** |
| Filter (all / rivalry / trade) | Same | onClick → setFilter(f) | filter | N/A | N/A | **OK** |
| Rivalry row click (node A or B) | Same | onClick → onSelectManager(entityId) | N/A | N/A | Parent setView("managers") | **OK** |
| Trade partner row click | Same | onClick → onSelectManager(entityId) | N/A | N/A | Same | **OK** |

### 6.4 Timeline and managers

| Element | Component / Route | Handler | State | API / backend | Cache / reload | Status |
|--------|-------------------|--------|-------|----------------|----------------|--------|
| Dynasty timeline | `DynastyTimelineView.tsx` | Display only (profile.dynastyPowerTransitions) | N/A | N/A | From profile | **OK** |
| Manager relationship cards | `ManagerRelationshipCard.tsx` | Display only | N/A | N/A | From profile | **OK** |

### 6.5 AI explain drawer

| Element | Component / Route | Handler | State | API / backend | Cache / reload | Status |
|--------|-------------------|--------|-------|----------------|----------------|--------|
| Open drawer | `GraphInsightDrawer.tsx` | Parent sets open | open | N/A | N/A | **OK** |
| Close overlay | Same | onClick on overlay → onClose() | N/A | N/A | N/A | **OK** |
| Close button | Same | onClick → onClose() | N/A | N/A | N/A | **OK** |
| Fetch insight (when open) | Same | useEffect → POST graph-insight | insight, loading, error | POST /api/leagues/[id]/graph-insight | When open and !insight && !loading | **OK** |

### 6.6 API routes

| Route | Method | Handler | Backend | Status |
|-------|--------|--------|---------|--------|
| /api/leagues/[leagueId]/relationship-map | GET | buildRelationshipMap | LeagueRelationshipMapBuilder | **OK** |
| /api/leagues/[leagueId]/relationship-profile | GET | buildRelationshipSummary | RelationshipSummaryBuilder | **OK** |
| /api/leagues/[leagueId]/graph-insight | POST | buildLeagueRelationshipProfile + OpenAI/DeepSeek/Grok | GraphInfluenceEngine, AI | **OK** |
| /api/leagues/[leagueId]/dynasty-backfill | POST | includes buildLeagueGraph after backfill | GraphSnapshotService | **OK** |

### 6.7 Summary

- **Added:** Refresh button on League Intelligence Graph panel to refetch relationship profile.
- **Verified:** All graph-related tabs, filters, season selector, AI explain drawer, relationship map load, rivalry/trade row clicks, and API routes are wired. No dead buttons or broken drill-downs found.

---

## 7. QA Findings

- **Graph build:** buildAndPersistSnapshot runs in transaction; nodes/edges/snapshot written with optional sport. FACED/DEFEATED edges appear when MatchupFact data exists for the league/season.
- **Sport:** Nodes and edges carry sport; SportGraphResolver supports all seven sports; relationships are isolated by league and season (and sport when filtering).
- **UI:** Intelligence tab shows LeagueIntelligenceGraphPanel; summary/graph/timeline/managers views and AI explain drawer work; Refresh refetches profile.
- **AI:** graph-insight returns metrics interpretation and readable summary; getGraphSummaryForAI available for Chimmy or other consumers.
- **History:** GraphHistoryAggregator and MatchupFact integration provide matchup history for FACED/DEFEATED; dynasty backfill triggers graph refresh.

---

## 8. Issues Fixed

1. **Missing FACED/DEFEATED edges**  
   - **Fix:** GraphEdgeBuilder now reads MatchupFact for the league/season, resolves team nodes by teamA/teamB/winnerTeamId, and creates FACED (symmetric meeting count) and DEFEATED (winner → loser) edges with sport.

2. **No sport on nodes/edges**  
   - **Fix:** Schema: optional `sport` on GraphNode and GraphEdge with indexes. GraphNodeBuilder and GraphEdgeBuilder set sport on all nodes and edges; GraphSnapshotService persists sport.

3. **Missing edge types**  
   - **Fix:** types.ts EDGE_TYPES extended with FACED, DEFEATED, LEAGUE_MEMBER_OF, CHAMPION_OF, COMMISSIONED_BY, POWER_SHIFT_EDGE, DRAMA_EVENT_EDGE, CO_MANAGED.

4. **No refresh on graph panel**  
   - **Fix:** LeagueIntelligenceGraphPanel: added Refresh button that calls loadProfile(season) so users can reload after building the graph or changing data.

5. **New modules (Prompt 34)**  
   - **Added:** SportGraphResolver, GraphHistoryAggregator, LeagueIntelligenceGraphService, GraphSnapshotGenerator; index exports updated.

---

## 9. Final QA Checklist

- [ ] **Intelligence tab:** Open league → Intelligence tab → League Intelligence Graph panel loads (summary by default).
- [ ] **Season filter:** In dynasty league, change season dropdown → profile reloads; view shows correct season or “All seasons”.
- [ ] **Refresh:** Click Refresh → profile refetches; loading state and then updated counts/cards.
- [ ] **View tabs:** Switch summary / graph / timeline / managers → correct view; graph view loads relationship-map; timeline shows power transitions; managers shows central/isolated cards.
- [ ] **Graph view:** Filter all / rivalry / trade; click a rivalry or trade partner name → switches to managers view (if onSelectManager wired).
- [ ] **AI explain:** Click “AI explain” → drawer opens; insight fetches (POST graph-insight); close overlay or ✕ closes drawer.
- [ ] **APIs:** GET relationship-map?season= and GET relationship-profile?season= return 200 with expected shape when graph data exists.
- [ ] **Build:** Trigger dynasty backfill or graph build for a league → then open Intelligence tab and Refresh → profile reflects new data.
- [ ] **Sport:** Create or use league for each supported sport (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer); build graph and confirm no errors and sport stored on nodes/edges.

---

## 10. Explanation of the League Intelligence Graph

The **League Intelligence Graph** is a directed, weighted graph of league entities (managers, teams, leagues, trades, championships, rivalries) and relationships (who manages which team, who traded with whom, who faced or defeated whom, who won titles, who are rivals). It is built from:

- **League and teams** (League, LeagueTeam) for nodes and MANAGES/OWNS.
- **SeasonResult** (champion = true) for Championship nodes and WON_TITLE edges.
- **LeagueTradeHistory + LeagueTrade** for Trade nodes and TRADED_WITH / ACQUIRED edges.
- **UserRivalry** for RIVAL_OF edges between managers.
- **MatchupFact** (warehouse) for FACED and DEFEATED edges between teams.

The graph is stored in **graph_nodes** and **graph_edges** and summarized in **league_graph_snapshots**. Queries support “strongest rivals,” “top trade partners,” “connection scores,” “drama central teams,” “power shift over time,” “repeated elimination patterns,” and full **relationship profiles** (rivalries, trade clusters, influence leaders, central/isolated managers, dynasty power transitions). The **relationship map** (nodes, edges, rivals, trade partners) and **relationship profile** drive the **League Intelligence Graph** UI and the **AI explain** drawer. Sport is stored on nodes and edges so the graph works correctly across **NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, and Soccer** with relationships isolated by league and season unless a cross-season dynasty view is requested.
