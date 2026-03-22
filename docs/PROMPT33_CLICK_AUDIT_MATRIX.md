# Prompt 33 - UI Click Audit Matrix (AI + Simulation)

| ID | Interaction | Component | Route | Handler | State Update | Backend/API Wiring | Cache/Reload Behavior | Status |
|---|---|---|---|---|---|---|---|---|
| A01 | Sim My Matchup | `MatchupSimulationPage` | `/app/matchup-simulation` | `runSimulation` | `loading/result/error` | `POST /api/simulation/matchup` | Rerun replaces prior result | OK |
| A02 | Rerun simulation | `MatchupSimulationPage` | `/app/matchup-simulation` | `runSimulation` | Same | Same | Same | OK |
| A03 | Explain matchup link | `MatchupSimulationPage` | `/app/matchup-simulation` -> `/af-legacy?tab=chat` | Anchor navigation | N/A | Context now includes `insightType=matchup` | Uses fresh chat context | FIXED |
| A04 | Explain matchup link | `MatchupSimulationCard` | league/matchup surfaces | Anchor navigation | N/A | Context now includes `leagueId/insightType/sport/week` | Uses fresh chat context | FIXED |
| A05 | Apply season/week settings | `LeagueForecastSection` | `/leagues/[leagueId]?tab=Standings/Playoffs` | Apply button | `activeSeason/activeWeek` | next `GET /season-forecast` uses active values | Reload via load/generate | OK |
| A06 | Rerun season simulation | `LeagueForecastSection` | same | `generate()` | `refreshing/forecasts` | `POST /api/leagues/[leagueId]/season-forecast` | Followed by `load()` | OK |
| A07 | AI explanation button | `LeagueForecastSection` | same | `generateAiSummary()` | `aiLoading/aiSummary/aiError` | `POST /api/leagues/[leagueId]/forecast-summary` | Summary refreshes on rerun | OK |
| A08 | Ask Chimmy playoff link | `LeagueForecastDashboard` | same -> `/af-legacy?tab=chat` | Anchor navigation | N/A | Context now includes `leagueId/insightType=playoff/season/week` | Fresh chat context | FIXED |
| A09 | Explain playoff odds (card) | `TeamForecastCard` | same -> `/af-legacy?tab=chat` | Anchor navigation | N/A | New team-scoped context (`teamId`, `insightType=playoff`) | Fresh chat context | ADDED |
| A10 | Team comparison selectors | `LeagueForecastSection` | same | `setCompareA/B` | `comparison` recomputed | no API | In-memory update | OK |
| A11 | Dynasty AI advice | `DynastyProjectionPanel` | `/leagues/[leagueId]` | `fetch('/api/dynasty-outlook')` | `adviceLoading/advice/error` | `POST /api/dynasty-outlook` | Refresh button refetches projections | OK |
| A12 | Dynasty trade context link | `DynastyProjectionPanel` | `/trade-finder` | Anchor navigation | N/A | URL context for dynasty handoff | Context banner hydrates | OK |
| A13 | Trade "Discuss in AI Chat" | `trade-evaluator` + `DynastyTradeForm` + `TradeFinderV2` | `/trade-evaluator`, `/dynasty-trade-analyzer`, `/trade-finder` | Anchor/button navigation | N/A | Now includes `insightType=trade` (+ league id where available) | Fresh chat context | FIXED |
| A14 | Waiver refresh | `WaiverWirePage` | `/waiver-ai` / league waivers | `load()` | `loading/players/claims/history` | settings/claims/players/roster/history APIs | Full panel refresh | OK |
| A15 | Waiver drawer open/close | `WaiverWirePage` + `WaiverClaimDrawer` | waiver pages | `setDrawerOpen` / close callback | drawer state | claim APIs only on submit | Close respects loading guard | OK |
| A16 | Waiver claim save/cancel | `WaiverWirePage` | waiver pages | `updateClaimById`/`cancelClaimById` | pending list | `PATCH/DELETE /claims/:id` | reload after mutation | OK |
| A17 | Get AI waiver help link | `WaiverWirePage` | waiver pages -> chat | Anchor navigation | N/A | Now includes `leagueId/insightType=waiver/sport` | Fresh chat context | FIXED |
| A18 | Draft helper refresh | `DraftHelperPanel` | draft room | `onRefresh` | recommendation states | draft recommendation API | refresh updates recommendation | OK |
| A19 | Ask Chimmy about this pick | `DraftHelperPanel` | draft room -> chat | Anchor navigation | N/A | Now includes `leagueId/insightType=draft/sport` | Fresh chat context | FIXED |
| A20 | Graph insight open/close | `GraphInsightDrawer` | league intelligence routes | open state + close button/backdrop | `open/error/loading/insight` | `POST /api/leagues/[leagueId]/graph-insight` | Regenerate refetches | OK |
| A21 | Graph regenerate | `GraphInsightDrawer` | same | `fetchInsight()` | loading cycle | same endpoint | Replaces insight payload | OK |
| A22 | Legacy chat deep-link prompt | `ChimmyChatTab` | `/af-legacy?tab=chat` | prompt decode and shell prefill | input state | chat POST on send | prompt param cleared after use | OK |
| A23 | Legacy chat deep-link league context | `af-legacy/page` + `ChimmyChatTab` | `/af-legacy?tab=chat&leagueId=...` | `setChatLeagueId` from URL | `chatLeagueId` | passed to chat shell -> chimmy route | Prevents stale league context | FIXED |
| A24 | Chimmy send message | `ChimmyChatShell` | `/af-legacy?tab=chat` | `sendMessage` | messages/typing/meta | `POST /api/chat/chimmy` now includes optional context fields | retry path preserved | FIXED |
| A25 | Chimmy retry | `ChimmyChatShell` | same | `handleRetry` | replace last assistant message | same endpoint | no dead state | OK |
| A26 | Chimmy image remove | `ChimmyChatShell` | same | local button | `imagePreview/imageFile` cleared | none | immediate | OK |
| A27 | Back to overview buttons | league widgets (`DynastyProjectionPanel`, `WarehouseHistoryPanel`) | `/leagues/[leagueId]` | callbacks | tab state switches | none | immediate | OK |
| A28 | Loading and error surfaces | simulation, dynasty, waiver, graph, chat | multi-route | existing handlers | loading/error flags | route-specific | retry and refresh wired | OK |

## Notes

- Core stale-context issue was in chat entry-point handoff (prompt-only links). This is now context-aware through query params -> shell form-data -> targeted insight routing.
- All audited flows preserve existing functionality while adding context precision and sport-aware routing.
