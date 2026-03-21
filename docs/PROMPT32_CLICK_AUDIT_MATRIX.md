# Prompt 32 Click Audit Matrix
Dynasty Projection Engine mandatory UI/workflow audit.

## Audit table

| ID | Interaction | Component | Route | Handler/state | Backend/API | Cache/reload | Status |
|---|---|---|---|---|---|---|---|
| D01 | Open standings/playoffs tab | `LeagueHomeShellPage` | `/leagues/[leagueId]` | `setActiveTab("Standings/Playoffs")` | none | tab state | Verified |
| D02 | Dynasty card mounted | `DynastyProjectionPanel` | `/leagues/[leagueId]?tab=Standings/Playoffs` | initial `useEffect(load)` | `GET /api/leagues/[leagueId]/dynasty-projections` | pulls persisted or generates | Fixed |
| D03 | Sport filter select | `DynastyProjectionPanel` | same | `setSport` -> `load()` via callback deps | same GET with `sport` query | reload on sport change | Fixed |
| D04 | Team selector | `DynastyProjectionPanel` | same | `setSelectedTeamId` | none (client filtering) | local state | Verified |
| D05 | 3-year toggle | `DynastyProjectionPanel` | same | `setHorizon("3y")` | none | re-sorts cards client-side | Fixed |
| D06 | 5-year toggle | `DynastyProjectionPanel` | same | `setHorizon("5y")` | none | re-sorts cards client-side | Fixed |
| D07 | Refresh projections button | `DynastyProjectionPanel` | same | `load({ refresh: true })` | GET dynasty-projections with `refresh=1` | forces recompute + persist | Fixed |
| D08 | Dynasty ranking card click | `DynastyProjectionPanel` | same | `setSelectedTeamId` | none | local state update | Verified |
| D09 | Team comparison selector A | `DynastyProjectionPanel` | same | `setCompareA` | none | local delta recompute | Fixed |
| D10 | Team comparison selector B | `DynastyProjectionPanel` | same | `setCompareB` | none | local delta recompute | Fixed |
| D11 | AI dynasty advice button | `DynastyProjectionPanel` | same | `runAiAdvice()` state (`aiLoading`,`aiAdvice`,`aiError`) | `POST /api/dynasty-outlook` | fetches current-team advice | Fixed |
| D12 | Trade analyzer dynasty context link | `DynastyProjectionPanel` | same -> `/trade-finder` | link navigation with query context | none | query params persist context | Fixed |
| D13 | Back button | `DynastyProjectionPanel` + parent | same | `onBackToOverview` -> `setActiveTab("Overview")` | none | tab state transition | Fixed |
| D14 | Championship window chart | `DynastyProjectionPanel` | same | renders selected team metrics | none | updates on team select/refresh | Verified |
| D15 | Rebuild probability display | `DynastyProjectionPanel` | same | renders selected team metrics | none | updates on team select/refresh | Verified |
| D16 | Pick value drill-down | `DynastyProjectionPanel` | same | renders derived near/long-term values | none | updates on selected projection | Fixed |
| D17 | Roster strength trend graph | `DynastyProjectionPanel` | same | SVG from 3y/5y scores | none | updates on selection | Fixed |
| D18 | Loading state | `DynastyProjectionPanel` | same | `loading`/`refreshing` flags | dynasty-projections GET | cleanly toggles | Verified |
| D19 | Error state | `DynastyProjectionPanel` | same | `error` + `aiError` rendering | dynasty APIs | non-blocking failure UI | Fixed |
| D20 | Auto team defaults | `DynastyProjectionPanel` | same | `useEffect` seeds selected/compare ids | none | recalculated on fresh payload | Fixed |
| D21 | Dynasty API GET cached read | `dynasty-projections route` | `/api/leagues/[leagueId]/dynasty-projections` | resolves sport + league + optional team filter | Prisma read via `DynastyQueryService` | returns persisted rows | Fixed |
| D22 | Dynasty API GET refresh | same route | same | `refresh` branch builds inputs then generates | generator + Prisma upsert | writes and returns fresh rows | Fixed |
| D23 | Dynasty API POST manual mode | same route | same | accepts `teamInputs` and persists by default | generator + Prisma | supports explicit batch input | Verified |
| D24 | Dynasty API POST auto mode | same route | same | auto-builds inputs when `teamInputs` omitted | league/roster/player/pick queries | persist + immediate response | Fixed |
| D25 | Sport-aware normalization | `lib/dynasty-engine/types.ts` | library | `SUPPORTED_SPORTS` + normalize helpers | `lib/sport-scope.ts` | prevents single-sport drift | Fixed |
| D26 | Sport dynasty relevance gate | `SportDynastyResolver` | library | `isDynastyRelevant()` now includes all supported sports | none | no silent sport exclusion | Fixed |
| D27 | Dynasty insights sport selector | `DynastyInsightsPage` | `/app/dynasty-insights` | `setSport` and position reset | `GET /api/dynasty-intelligence` | reload on Update/AI click | Fixed |
| D28 | Dynasty insights position selector | `DynastyInsightsPage` | same | `setPosition` | same API | state drives request params | Verified |
| D29 | Dynasty insights age/base/player inputs | `DynastyInsightsPage` | same | controlled inputs | same API | state reflected in payload | Verified |
| D30 | Dynasty insights refresh button | `DynastyInsightsPage` | same | `load()` | same API | re-fetches latest calculations | Verified |
| D31 | Dynasty insights AI button | `DynastyInsightsPage` | same | `load(true)` + loading state | same API with `ai=1` | AI insight tied to current params | Fixed |
| D32 | Dashboard dynasty outlook card | `FinalDashboardClient` | `/app/home` | link navigation | none | deep-links into standings/playoffs dynasty card | Fixed |
| D33 | Trade finder dynasty context banner | `TradeFinderClient` | `/trade-finder` | reads search params (`context`,`dynastyTeamId`) | none | preserves context in UI | Fixed |
| D34 | Dynasty outlook API sport cache | `dynasty-outlook route` | `/api/dynasty-outlook` | normalizes sport, queries matching sports cache | Prisma sports players | no NFL hardcode | Fixed |
| D35 | Dynasty outlook API projection context | same route | same | includes current projection signals in prompt | `DynastyQueryService` | AI advice aligned with latest projections | Fixed |

## Execution evidence

- `npm run typecheck` -> passed.
- `npx playwright test e2e/dynasty-click-audit.spec.ts` -> passed (3/3 browsers).
- `npx playwright test e2e/simulation-click-audit.spec.ts` -> passed after dynasty route mocking/stability update.

