# Prompt 38 — Integration Click Audit Matrix

Legend:

- `PASS` = handler/state/API/cache path verified end-to-end
- `FIXED` = issue found and corrected in this implementation pass

| ID | Component | Route | Interactive Element | Handler Verified | State Verified | API Wiring Verified | Persist/Reload Verified | Result |
|---|---|---|---|---|---|---|---|---|
| IA01 | `UnifiedRelationshipInsightsPanel` | `/app/league/[leagueId]?tab=Intelligence` | Sport dropdown | `onChange -> setSportFilter` | Filter state updates and re-queries | `GET /relationship-insights?sport=` | Re-fetch on filter update | PASS |
| IA02 | `UnifiedRelationshipInsightsPanel` | `/app/league/[leagueId]?tab=Intelligence` | Season input | `onChange -> setSeasonFilter` | Season state updates | `GET /relationship-insights?season=` | Re-fetch on season update | PASS |
| IA03 | `UnifiedRelationshipInsightsPanel` | `/app/league/[leagueId]?tab=Intelligence` | Refresh button | `onClick -> load()` | Loading/error/reset states | `GET /relationship-insights` | Fresh no-store response rendered | PASS |
| IA04 | `UnifiedRelationshipInsightsPanel` | `/app/league/[leagueId]?tab=Intelligence` | Sync layer button | `onClick -> syncLayer()` | Syncing disabled state + payload replacement | `POST /relationship-insights` | Returned `insights` replaces stale panel data | PASS |
| IA05 | `UnifiedRelationshipInsightsPanel` | `/app/league/[leagueId]?tab=Intelligence` | AI explain button | `onClick -> explain(row)` | Explain loading + toggle/hide state | `POST /relationship-insights/explain` | Per-row explain cache toggles correctly | PASS |
| IA06 | `UnifiedRelationshipInsightsPanel` | `/app/league/[leagueId]?tab=Intelligence` | Rivalry context link | Link handler present | N/A (navigation action) | Rivalry page detail calls verified | Navigates to canonical app-shell rivalry detail | PASS |
| IA07 | `UnifiedRelationshipInsightsPanel` | `/app/league/[leagueId]?tab=Intelligence` | Drama context link | Link handler present | N/A | Drama detail endpoint called | Opens event detail with current context | PASS |
| IA08 | `UnifiedRelationshipInsightsPanel` | `/app/league/[leagueId]?tab=Intelligence` | Behavior context link | Link handler present | N/A | Compare page API call verified | Manager pair query preserved | PASS |
| IA09 | `UnifiedRelationshipInsightsPanel` | `/app/league/[leagueId]?tab=Intelligence` | Trade context link | Link handler present | N/A | N/A | Correct tab redirect | PASS |
| IA10 | `IntelligenceTab` | `/app/league/[leagueId]?tab=Intelligence` | Open unified insights workspace link | Link handler present | N/A | Page load APIs verified | Route transition successful | PASS |
| IA11 | `LeagueIntelligenceGraphPanel` | `/app/league/[leagueId]?tab=Intelligence` | Rivalries summary card | `onClick -> setView('rivalries')` | View tab state updates | Rivalry list fetch active | Rivalry list reloads with active filters | FIXED |
| IA12 | `LeagueIntelligenceGraphPanel` | `/app/league/[leagueId]?tab=Intelligence` | Trade clusters summary card | `onClick -> setView('graph')` | View state updates | Relationship-map fetch already wired | Graph view reflects current map payload | FIXED |
| IA13 | `LeagueIntelligenceGraphPanel` | `/app/league/[leagueId]?tab=Intelligence` | Power transitions summary card | `onClick -> setView('timeline')` | View state updates | Timeline view data source wired | Transition data preserved on switch | FIXED |
| IA14 | `RelationshipGraphView` | `/app/league/[leagueId]?tab=Intelligence` | Edge detail -> Explain this relationship | `onClick -> explainRelationship()` | Loading/result state updates | `POST /graph-insight` | Insight text replaced on subsequent clicks | PASS |
| IA15 | `RelationshipGraphView` | `/app/league/[leagueId]?tab=Intelligence` | Edge detail -> Open rivalry context | `onClick -> openRivalryContext()` | Error fallback state updates | `GET /rivalries?managerAId&managerBId` (fallback) | Navigates to rivalry detail; no dead button | FIXED |
| IA16 | `RelationshipGraphView` | `/app/league/[leagueId]?tab=Intelligence` | Manager card button | `onSelectManager` callback exists | Selected manager focus state tracked | N/A | Managers list now highlights selected manager | FIXED |
| IA17 | `ManagerRelationshipCard` | `/app/league/[leagueId]?tab=Intelligence` | Open drama context | Link handler present | N/A | Drama timeline query receives `relatedManagerId` | Filtered storyline list reloads correctly | FIXED |
| IA18 | `ManagerRelationshipCard` | `/app/league/[leagueId]?tab=Intelligence` | Compare behavior profile | Link handler present | N/A | Profile compare API uses managerA/B | Correct comparison target persists | FIXED |
| IA19 | `ManagerRelationshipCard` | `/app/league/[leagueId]?tab=Intelligence` | Trade context | Link handler present | N/A | N/A | Correct tab redirect | FIXED |
| IA20 | `RivalryEngineList` | `/app/league/[leagueId]?tab=Intelligence` | Details link | Link handler present | N/A | `GET /rivalries/[rivalryId]` | Canonical `/app/league/.../rivalries/...` path | FIXED |
| IA21 | `RivalryEngineList` | `/app/league/[leagueId]?tab=Intelligence` | H2H link | Link handler present | N/A | `GET /rivalries/[rivalryId]/head-to-head` | `sport/season` query propagation preserved | FIXED |
| IA22 | `RivalryEngineList` | `/app/league/[leagueId]?tab=Intelligence` | Timeline button | `onViewTimeline` callback exists | Timeline panel state updates | `GET /rivalries/[rivalryId]/timeline` | Timeline panel refreshes current rivalry | PASS |
| IA23 | `RivalryEngineList` | `/app/league/[leagueId]?tab=Intelligence` | Explain button | `onExplain` callback exists | Explain panel state updates | `POST /rivalries/explain` | Explain panel replaces stale narrative | PASS |
| IA24 | `RivalryDetailPage` | `/app/league/[leagueId]/rivalries/[rivalryId]` | Back to Intelligence | Link handler present | N/A | N/A | Returns to app-shell intelligence tab | FIXED |
| IA25 | `RivalryDetailPage` | `/app/league/[leagueId]/rivalries/[rivalryId]` | Refresh | `onClick -> loadDetail/loadTabData` | Loading/error reset states | Detail + tab APIs re-fired | Fresh payload replaces prior state | PASS |
| IA26 | `RivalryDetailPage` | `/app/league/[leagueId]/rivalries/[rivalryId]` | Explain this rivalry | `onClick -> explain()` | Explaining state + narrative updates | `POST /rivalries/explain` | Explanation refreshes with latest linked data | PASS |
| IA27 | `RivalryDetailPage` | `/app/league/[leagueId]/rivalries/[rivalryId]` | Rivalry Timeline / H2H tabs | `setTab()` handlers exist | Tab state changes | Timeline/H2H APIs switch correctly | Reloaded per-tab data persists | PASS |
| IA28 | `RivalryDetailPage` | `/app/league/[leagueId]/rivalries/[rivalryId]` | Season filter | `setSeasonFilter()` exists | Filter state updates | Season query propagates to tab APIs | Filtered records reload correctly | PASS |
| IA29 | `RivalryDetailPage` | `/app/league/[leagueId]/rivalries/[rivalryId]` | Open linked drama context | Link handler present | N/A | Drama timeline API receives manager/sport/season | Correct redirected filter state | FIXED |
| IA30 | `RivalryDetailPage` | `/app/league/[leagueId]/rivalries/[rivalryId]` | Open manager behavior context | Link handler present | N/A | Profile compare API query propagation | Correct manager pair retained | FIXED |
| IA31 | `RivalryDetailPage` | `/app/league/[leagueId]/rivalries/[rivalryId]` | Open top linked storyline | Link handler present | N/A | `GET /drama/[eventId]` | Top linked event opens successfully | FIXED |
| IA32 | `LeagueDramaDashboardPage` | `/app/league/[leagueId]/drama` | Sport/season/type/min score filters | `set*Filter` handlers exist | Filter state + pagination reset | `GET /drama/timeline` query propagation | Reloaded filtered timeline verified | PASS |
| IA33 | `LeagueDramaDashboardPage` | `/app/league/[leagueId]/drama` | Related manager filter | `setRelatedManagerFilter` added | State updates + offset reset | `relatedManagerId` reaches timeline API | Manager-scoped timeline reloads | FIXED |
| IA34 | `LeagueDramaDashboardPage` | `/app/league/[leagueId]/drama` | Refresh storylines | `runEngine()` exists | Running/error state updates | `POST /drama/run` | Timeline reloaded after run completion | PASS |
| IA35 | `LeagueDramaDashboardPage` | `/app/league/[leagueId]/drama` | Reload timeline | `load()` exists | Loading/error reset states | `GET /drama/timeline` | No stale cache data retained | PASS |
| IA36 | `LeagueDramaDashboardPage` | `/app/league/[leagueId]/drama` | Prev/Next page | `setOffset` handlers exist | Offset state updates | `offset` reaches timeline API | Correct page transitions verified | PASS |
| IA37 | `DramaEventDetailPage` | `/app/league/[leagueId]/drama/[eventId]` | Open linked rivalry | `openLinkedRivalry()` exists | Resolving/error states update | `GET /rivalries?managerAId&managerBId` | Canonical app-shell redirect works | FIXED |
| IA38 | `DramaEventDetailPage` | `/app/league/[leagueId]/drama/[eventId]` | Tell me the story | `tellStory()` exists | Narrative loading state updates | `POST /drama/tell-story` | Latest response replaces prior story | PASS |
| IA39 | `DramaEventDetailPage` | `/app/league/[leagueId]/drama/[eventId]` | Refresh page | `router.refresh()` handler exists | Route data refreshes | Detail endpoint re-fetched | Persisted update reflected | PASS |
| IA40 | `DramaEventDetailPage` | `/app/league/[leagueId]/drama/[eventId]` | Open matchup/trade context | Link handlers present | N/A | N/A | Correct redirects validated | PASS |
| IA41 | `PsychologicalProfileDetailPage` | `/app/league/[leagueId]/psychological-profiles/[profileId]` | `?tab=evidence` deep-link | Search-param handler added | Evidence section focus state | Profile/evidence APIs wired | Deep-link now consistently lands on evidence | FIXED |
| IA42 | `PsychologicalProfileDetailPage` | `/app/league/[leagueId]/psychological-profiles/[profileId]` | Refresh + Refresh evidence | Load handlers exist | Loading/error states verified | Profile + evidence APIs called | Refetch replaces stale rows | PASS |
| IA43 | `PsychologicalProfileDetailPage` | `/app/league/[leagueId]/psychological-profiles/[profileId]` | Explain this manager style | Explain handler exists | Explaining state verified | `POST /psychological-profiles/explain` | Narrative updates in place | PASS |
| IA44 | `PsychologicalProfileDetailPage` | `/app/league/[leagueId]/psychological-profiles/[profileId]` | Open drama context | Link handler present | N/A | Drama timeline query propagation | Correct manager/season redirect | FIXED |
| IA45 | `PsychologicalProfileDetailPage` | `/app/league/[leagueId]/psychological-profiles/[profileId]` | Open trade context | Link handler present | N/A | N/A | Correct tab redirect | FIXED |
| IA46 | `BehaviorProfilesPanel` | `/app/league/[leagueId]?tab=Settings` | Trade context button on row | Link handler present | N/A | N/A | Profile->trade drill-down added | FIXED |
| IA47 | `relationship-map` API | `/api/leagues/[leagueId]/relationship-map` | Sync-rivalry edge refresh path | Query flag handler exists | N/A | Bridge service called pre-response | Returned map reflects persisted sync | FIXED |
| IA48 | `relationship-profile` API | `/api/leagues/[leagueId]/relationship-profile` | Sync-rivalry edge refresh path | Query flag handler exists | N/A | Bridge service called pre-response | Returned profile aligns with synced graph edges | FIXED |
| IA49 | `rivalries/explain` API | `/api/leagues/[leagueId]/rivalries/explain` | Explain submission | Body parse + handler exists | N/A | Includes profiles + linked drama in prompt context | Updated explanation uses integrated context | FIXED |
| IA50 | `drama/tell-story` API | `/api/leagues/[leagueId]/drama/tell-story` | Story submission | Body parse + handler exists | N/A | Includes unified relationship context hint | Narrative reflects integrated storyline context | FIXED |

## Automated verification executed

- `e2e/league-intelligence-graph-click-audit.spec.ts`
- `e2e/rivalry-engine-click-audit.spec.ts`
- `e2e/psychological-profiles-click-audit.spec.ts`
- `e2e/league-drama-click-audit.spec.ts`
- `e2e/relationship-storytelling-integration-click-audit.spec.ts`

All above passed in the final audit run after route-normalization assertion updates.
