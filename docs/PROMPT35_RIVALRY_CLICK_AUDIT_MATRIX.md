# Prompt 35 — Rivalry Click Audit Matrix

| ID | Surface | Clickable Element | Component / Route | Handler | State Update | API Wiring | Cache/Reload | Status |
|---|---|---|---|---|---|---|---|---|
| R01 | Dashboard entry | Rivalries tab | `components/app/league-intelligence/LeagueIntelligenceGraphPanel.tsx` | `setView("rivalries")` | switches panel view | none | n/a | PASS |
| R02 | Rivalry engine controls | Run rivalry engine | `RivalryEngineList` | `runEngine()` | `running` true/false, refresh list | `POST /api/leagues/[leagueId]/rivalries` | post-run `load()` | PASS |
| R03 | Rivalry engine controls | Refresh | `RivalryEngineList` | `load()` | `loading`, `error`, `rivalries` | `GET /api/leagues/[leagueId]/rivalries` | `cache: "no-store"` | PASS |
| R04 | Filters | Sport filter | `LeagueIntelligenceGraphPanel` + `RivalryEngineList` | `setSportFilter` + `load()` | fetch query changes | `sport` query param | no-store | PASS |
| R05 | Filters | Season filter | panel season + rivalry detail season selector | `setSeason` / `setSeasonFilter` | fetch query changes | `season` query param | no-store | PASS |
| R06 | Manager compare | Manager selector A | `RivalryEngineList` | `setManagerAFilter` | filtered fetch | `managerAId`/`managerId` query | no-store | PASS |
| R07 | Manager compare | Manager selector B | `RivalryEngineList` | `setManagerBFilter` | filtered fetch | `managerBId`/`managerId` query | no-store | PASS |
| R08 | Manager compare | Clear manager filters | `RivalryEngineList` | `clearFilters()` | resets selectors | re-fetch unfiltered rivalries | no-store | PASS |
| R09 | Rivalry cards | Timeline button | `RivalryEngineList` row | `onViewTimeline(r.id)` | timeline panel state set | `GET /rivalries/[rivalryId]/timeline` | no-store | PASS |
| R10 | Rivalry cards | Explain button | `RivalryEngineList` row | `onExplain(r.id)` | narrative state set | `POST /rivalries/explain` | current rivalry data used | PASS |
| R11 | Rivalry cards | Details link | `RivalryEngineList` row | Link nav | route change | `GET /rivalries/[rivalryId]` on page load | detail refresh available | PASS |
| R12 | Rivalry cards | H2H link | `RivalryEngineList` row | Link nav | route change + h2h tab intent | `GET /rivalries/[rivalryId]/head-to-head` | no-store | PASS |
| R13 | Rivalry detail page | Back button | `app/leagues/[leagueId]/rivalries/[rivalryId]/page.tsx` | Link nav | returns to intelligence | none | n/a | PASS |
| R14 | Rivalry detail page | Refresh button | detail page | `loadDetail()` + `loadTabData()` | reload detail and active tab | rivalry detail + timeline/h2h endpoints | no-store | PASS |
| R15 | Rivalry detail page | Explain this rivalry | detail page | `explain()` | `aiNarrative` update | `POST /rivalries/explain` | fresh request each click | PASS |
| R16 | Rivalry detail page | Timeline tab | detail page | `setTab("timeline")` | tab state + list updates | `GET /timeline` | season-aware query | PASS |
| R17 | Rivalry detail page | Head-to-head tab | detail page | `setTab("h2h")` | tab state + list updates | `GET /head-to-head` | season-aware query | PASS |
| R18 | Rivalry detail page | Season dropdown | detail page | `setSeasonFilter` | fetch scope update | `season` query on tab endpoint | no-store | PASS |
| R19 | Error states | Rivalry list load failure | `RivalryEngineList` | catch branch | `error` rendered | all rivalry list calls | retry via Refresh | PASS |
| R20 | Error states | Rivalry detail/tab load failure | detail page | catch branch | `error` rendered | detail/timeline/h2h calls | retry via Refresh | PASS |
| R21 | League widgets | Rivalry week card expand/collapse | `components/RivalryWeekCards.tsx` | local `setExpanded` | local state | none (presentational) | n/a | PASS |
| R22 | Graph rivalry interactions | Rivalry filter + row clicks | `RelationshipGraphView` | existing filter/select handlers | graph state updates | relationship-map/profile APIs | refresh/rebuild exists | PASS |

## Notes

- Rivalry score and tier data are persisted in `RivalryRecord`; timeline details are persisted in `RivalryEvent`.
- Rivalry detail drill-down now has dedicated route and head-to-head endpoint.
- AI rivalry explanations are model-backed with fallback text to avoid dead responses.
