# Prompt 30 Click Audit Matrix

Fantasy Data Warehouse mandatory workflow audit.

Scope includes every button, dropdown, toggle, tab, link, modal action, transition, preview update, submit action, success redirect path, and error path for warehouse-related UX.

## Audit table

| ID | Interaction | Component | Route | Handler/state | Backend/API | Cache/reload | Status |
|---|---|---|---|---|---|---|---|
| W01 | Dashboard entry "League history warehouse" | `FinalDashboardClient` | `/app/home` | Link navigation | None | Deep-link to league page tab | Fixed |
| W02 | League tab deep-link | `LeagueHomeShellPage` | `/leagues/[leagueId]?tab=Previous%20Leagues` | `useSearchParams` -> `setActiveTab` | None | Restores tab context from URL | Fixed |
| W03 | Previous Leagues tab button | `LeagueHomeShellPage` | `/leagues/[leagueId]` | `onClick` -> `setActiveTab("Previous Leagues")` | None | Tab switch render | Pass |
| W04 | Warehouse view selector | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onChange` -> `setView` | `/api/warehouse/league-history?view=` | Re-fetch on apply/refresh | Pass |
| W05 | Sport filter selector | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onChange` -> `setSport(normalizeToSupportedSport(...))` | `/api/warehouse/league-history?sport=` | Re-fetch on apply/refresh | Pass |
| W06 | Season filter input | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onChange` -> `setSeason` | `season` query param | Re-fetch on apply/refresh | Pass |
| W07 | From week input | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onChange` -> `setFromWeek` | `fromWeek` query param | Re-fetch on apply/refresh | Pass |
| W08 | To week input | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onChange` -> `setToWeek` | `toWeek` query param | Re-fetch on apply/refresh | Pass |
| W09 | Team ID filter input | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onChange` -> `setTeamId` | `teamId` query param | Required for `team`/`rosters` views | Pass |
| W10 | Player ID filter input | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onChange` -> `setPlayerId` | `playerId` query param | Required for `player` view | Pass |
| W11 | Apply filters button | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onClick` -> `setApplyToken(k+1)` | Warehouse route with all active params | Explicit submit action for filter state | Pass |
| W12 | Refresh button | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onClick` -> `setApplyToken(k+1)` | Same route, current filters | Forces re-read of current view | Pass |
| W13 | Chart toggle button | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onClick` -> `setShowCharts(!showCharts)` | None | UI-only preview change | Pass |
| W14 | AI insight launch button | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onClick` -> `setView("ai")` + refresh token | `view=ai` | Loads AI-ready warehouse context | Pass |
| W15 | Export JSON button | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onClick` -> blob download | Current in-memory payload | No stale mismatch; exports active view data | Pass |
| W16 | Back to Overview button | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | Callback -> `setActiveTab("Overview")` | None | Navigation back in league shell | Pass |
| W17 | Initial warehouse fetch | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `useEffect(fetchWarehouseData)` | Warehouse route | `cache: no-store` | Pass |
| W18 | Loading state | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `loading=true` during request | Same route | Spinner text shown | Pass |
| W19 | Error state | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `setError(...)` on non-OK/catch | Same route | Error text shown, recoverable | Pass |
| W20 | Summary view render | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | Uses `payload.summary` | `view=summary` | Reflects current filters | Pass |
| W21 | Matchups view render | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | Table render from `data.matchups` | `view=matchups` | Range filter respected | Pass |
| W22 | Matchup details drill-down | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onClick` -> `setSelectedMatchup` | Uses loaded row data | Modal open/close stable | Pass |
| W23 | Matchup details close | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | `onClick` -> `setSelectedMatchup(null)` | None | Modal closes | Pass |
| W24 | Standings view render | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | Table render from `data.standings` | `view=standings` | Season filter required and respected | Pass |
| W25 | Roster snapshot view render | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | List render from `data.snapshots` | `view=rosters&teamId=` | Team/date filters respected | Pass |
| W26 | Draft history view render | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | Table render from `data.draft` | `view=draft` | Season filter respected | Pass |
| W27 | Transaction view render | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | Table render from `data.transactions` | `view=transactions` | List refresh works | Pass |
| W28 | Player drill-down view render | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | Table/bar render from `data.playerFacts` | `view=player&playerId=&sport=` | Player/sport/season/range respected | Pass |
| W29 | Team drill-down view render | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | Table render from `data.teamMatchups` | `view=team&teamId=` | Team/season/range respected | Pass |
| W30 | AI insight view render | `WarehouseHistoryPanel` | `/leagues/[leagueId]` | JSON block from `data` | `view=ai` | Fresh payload each launch/refresh | Pass |
| W31 | Warehouse route param validation (`leagueId`) | API route | `/api/warehouse/league-history` | 400 on missing `leagueId` | Request validation | Deterministic error path | Pass |
| W32 | Warehouse route validation (`playerId` for player view) | API route | `/api/warehouse/league-history` | 400 when missing required drill-down ID | Request validation | Deterministic error path | Pass |
| W33 | Warehouse route validation (`teamId` for team/rosters view) | API route | `/api/warehouse/league-history` | 400 when missing required drill-down ID | Request validation | Deterministic error path | Pass |
| W34 | Warehouse route validation (`season` for standings view) | API route | `/api/warehouse/league-history` | 400 when season unavailable | Request validation | Deterministic error path | Pass |
| W35 | Warehouse route matchups data query | API route | `/api/warehouse/league-history?view=matchups` | Build where-clause from season/week range | Prisma `matchupFact.findMany` | `Cache-Control: no-store` | Pass |
| W36 | Warehouse route standings data query | API route | `/api/warehouse/league-history?view=standings` | Query standings history | `getStandingsHistory()` | `Cache-Control: no-store` | Pass |
| W37 | Warehouse route roster data query | API route | `/api/warehouse/league-history?view=rosters` | Query snapshots for team/range | `getRosterSnapshotsForTeam()` | `Cache-Control: no-store` | Pass |
| W38 | Warehouse route draft query | API route | `/api/warehouse/league-history?view=draft` | Query league draft history | `getDraftHistoryForLeague()` | `Cache-Control: no-store` | Pass |
| W39 | Warehouse route transaction query | API route | `/api/warehouse/league-history?view=transactions` | Query league transaction history | `getTransactionHistoryForLeague()` | `Cache-Control: no-store` | Pass |
| W40 | Warehouse route player drill-down query | API route | `/api/warehouse/league-history?view=player` | Query player game facts with sport/range | `getPlayerGameFactsForPlayer()` | `Cache-Control: no-store` | Pass |
| W41 | Warehouse route team drill-down query | API route | `/api/warehouse/league-history?view=team` | Query team matchups/standings/snapshots | Prisma + helper services | `Cache-Control: no-store` | Pass |
| W42 | Warehouse route AI context query | API route | `/api/warehouse/league-history?view=ai` | AI summary assembly | `getLeagueWarehouseSummaryForAI()` | `Cache-Control: no-store` | Pass |
| W43 | Unauthenticated league page load no longer deadlocks | `LeagueHomeShellPage` | `/leagues/[leagueId]` | `loadLeagueData` now clears loading when unauthenticated | None | Tabs render; workflow usable | Fixed |
| W44 | Sport scope enforcement in warehouse type layer | `lib/data-warehouse/types.ts` | Library | Uses shared `SUPPORTED_SPORTS` + normalizer | Shared `lib/sport-scope.ts` | Prevents single-sport hardcoding drift | Fixed |

## Execution evidence

- `npm run typecheck` -> passed
- `npx playwright test e2e/warehouse-click-audit.spec.ts` -> passed (3/3)

