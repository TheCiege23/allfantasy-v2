# Prompt 34 — Graph UI Click Audit Matrix

| ID | Interaction | Component / Route | Handler Verified | State Update Verified | API / Backend Verified | Cache / Reload Verified | Status |
|---|---|---|---|---|---|---|---|
| G01 | Intelligence entry point | `app/leagues/[leagueId]/page.tsx` | `setActiveTab("Intelligence")` | `activeTab` updates | N/A | N/A | PASS |
| G02 | Graph panel initial load | `LeagueIntelligenceGraphPanel` | `loadProfile()` in `useEffect` | `loading/error/profile` | `GET /relationship-profile` | `cache: no-store` | PASS |
| G03 | Season filter | `LeagueIntelligenceGraphPanel` | `setSeason()` | season state changes and reloads | `GET /relationship-profile?season=` | reload on dependency change | PASS |
| G04 | Sport filter | `LeagueIntelligenceGraphPanel` | `setSportFilter()` | sport state changes and reloads | `GET /relationship-profile?sport=` | reload on dependency change | PASS |
| G05 | Refresh graph profile | `LeagueIntelligenceGraphPanel` | `loadProfile(season)` | toggles loading + profile | `GET /relationship-profile` | live refetch (`no-store`) | PASS |
| G06 | Rebuild graph | `LeagueIntelligenceGraphPanel` | `loadProfile(..., { rebuild:true })` | profile reloads after rebuild call | `GET /relationship-profile?rebuild=1` -> backend rebuild | stale/empty graph addressed | PASS |
| G07 | View tab: summary | `LeagueIntelligenceGraphPanel` | `setView("summary")` | view state | N/A | N/A | PASS |
| G08 | View tab: graph | `LeagueIntelligenceGraphPanel` | `setView("graph")` | view state | N/A | N/A | PASS |
| G09 | View tab: timeline | `LeagueIntelligenceGraphPanel` | `setView("timeline")` | view state | profile-driven | inherited from profile reload | PASS |
| G10 | View tab: managers | `LeagueIntelligenceGraphPanel` | `setView("managers")` | view state | profile-driven | inherited from profile reload | PASS |
| G11 | View tab: rivalries | `LeagueIntelligenceGraphPanel` | `setView("rivalries")` | view state | rivalry endpoints wired | `no-store` rivalry fetches | PASS |
| G12 | Graph list filter all/rivalry/trade | `RelationshipGraphView` | `setFilter()` | filter state | N/A | N/A | PASS |
| G13 | Graph refresh | `RelationshipGraphView` | `load()` | loading/error/data | `GET /relationship-map` | `no-store` | PASS |
| G14 | Graph rebuild | `RelationshipGraphView` | `load({ rebuild:true })` | loading/error/data | `GET /relationship-map?rebuild=1` | stale map fallback fixed | PASS |
| G15 | Node detail click | `RelationshipGraphView` | node button `setSelectedNodeId()` | selected node state | N/A | N/A | PASS |
| G16 | Node detail back | `RelationshipGraphView` | `setSelectedNodeId(null)` | detail panel closes | N/A | N/A | PASS |
| G17 | Edge detail click | `RelationshipGraphView` | `setSelectedEdge()` | selected edge state | N/A | N/A | PASS |
| G18 | Edge detail back | `RelationshipGraphView` | `setSelectedEdge(null)` | detail panel closes | N/A | N/A | PASS |
| G19 | AI explain relationship | `RelationshipGraphView` | `explainRelationship()` | insight loading/result state | `POST /graph-insight` with focus context | fresh request each click | PASS |
| G20 | AI graph drawer open | `LeagueIntelligenceGraphPanel` -> `GraphInsightDrawer` | `setInsightDrawerOpen(true)` | drawer visibility | N/A | N/A | PASS |
| G21 | AI drawer fetch | `GraphInsightDrawer` | `fetchInsight()` | `loading/error/insight` | `POST /graph-insight` (`season`,`sport`) | no-store + regenerate supported | PASS |
| G22 | AI drawer close (X/overlay) | `GraphInsightDrawer` | `onClose()` | drawer closed | N/A | N/A | PASS |
| G23 | Rivalry list load | `RivalryEngineList` | `load()` | `loading/error/rivalries` | `GET /rivalries` (+ optional sport) | `no-store` | PASS |
| G24 | Run rivalry engine | `RivalryEngineList` | `runEngine()` | running/loading/error | `POST /rivalries` | post-run reload call | PASS |
| G25 | Rivalry refresh | `RivalryEngineList` | `load()` button | loading/data refresh | `GET /rivalries` | no-store | PASS |
| G26 | Rivalry explain button | `RivalryEngineList` + panel callback | `onExplain(rivalryId)` | narrative state updated | `POST /rivalries/explain` | immediate render update | PASS |
| G27 | Rivalry timeline button | `RivalryEngineList` + panel callback | `onViewTimeline(rivalryId)` | timeline state updated | `GET /rivalries/[id]/timeline` | immediate render update | PASS |
| G28 | API auto-rebuild on empty graph | `relationship-map` / `relationship-profile` routes | fallback rebuild logic | result retries after rebuild | `buildLeagueGraph()` invoked server-side | stale persistence recovery | PASS |

## Notes

- Full end-to-end graph click audit Playwright spec added: `e2e/league-intelligence-graph-click-audit.spec.ts`.
- Sport-scoped graph filtering now flows through UI -> API -> analyzers -> query layer.
