# Prompt 31 Click Audit Matrix
Fantasy Simulation Engine mandatory UI/workflow audit.

Scope includes matchup simulation, season/playoff simulation, simulation lab controls, AI explanation launch points, selectors, rerun/refresh controls, and navigation paths.

## Audit table

| ID | Interaction | Component | Route | Handler/state | Backend/API | Cache/reload | Status |
|---|---|---|---|---|---|---|---|
| S01 | Dashboard card to simulation area | `AdvantageDashboardPage` | `/app/advantage-dashboard` | Link navigation | None | Browser nav | Verified |
| S02 | Matchup simulation page entry | `app/app/matchup-simulation/page.tsx` | `/app/matchup-simulation` | Route render | None | Page render | Verified |
| S03 | `Sim My Matchup` button | `MatchupSimulationPage` | `/app/matchup-simulation` | `runSimulation()` sets loading/result/error | `POST /api/simulation/matchup` | Fresh result overwrite | Verified |
| S04 | Matchup rerun button | `MatchupSimulationPage` | `/app/matchup-simulation` | Reuses `runSimulation()` | `POST /api/simulation/matchup` | Re-fetch + card update | Verified |
| S05 | Matchup sport selector | `MatchupSimulationPage` | `/app/matchup-simulation` | `setSport` | Included in request body | Next click uses new sport | Verified |
| S06 | Matchup week/period input | `MatchupSimulationPage` | `/app/matchup-simulation` | `setWeekOrPeriod` | Included in request body | Next click uses new period | Verified |
| S07 | Team A/B projection inputs | `MatchupSimulationPage` | `/app/matchup-simulation` | `setTeamA`/`setTeamB` | Included in request body | Rerun updates outputs | Verified |
| S08 | Expected score chart render | `SimulationChart` | `/app/matchup-simulation` | Props-based render | From matchup response | Re-renders on result change | Verified |
| S09 | AI explanation link (matchup) | `MatchupSimulationPage` | `/app/matchup-simulation` | URL built from current result | Chimmy route URL | Uses latest result state | Verified |
| S10 | Share modal open | `MatchupSimulationPage` | `/app/matchup-simulation` | `setShareModalOpen(true)` | None | Local state persists | Verified |
| S11 | Copy caption button | `MatchupSimulationPage` | `/app/matchup-simulation` | clipboard write + copied state | `POST /api/share/generate-copy` fallback-safe | Local state reset timeout | Verified |
| S12 | Simulation lab tab: Season | `SimulationLabPage` | `/app/simulation-lab` | `setTab('season')` | None | Local state | Verified |
| S13 | Simulation lab tab: Playoffs | `SimulationLabPage` | `/app/simulation-lab` | `setTab('playoffs')` | None | Local state | Verified |
| S14 | Simulation lab tab: Dynasty | `SimulationLabPage` | `/app/simulation-lab` | `setTab('dynasty')` | None | Local state | Verified |
| S15 | Season lab sport selector | `SeasonSimPanel` | `/app/simulation-lab` | `setSport` | Sent in payload | Applied on run | Fixed |
| S16 | Season lab run button | `SeasonSimPanel` | `/app/simulation-lab` | `run()` + loading/result/error | `POST /api/simulation-lab/season` | Result panel replaces prior | Verified |
| S17 | Playoff lab sport selector | `PlayoffsSimPanel` | `/app/simulation-lab` | `setSport` | Sent in payload | Applied on run | Fixed |
| S18 | Playoff lab run button | `PlayoffsSimPanel` | `/app/simulation-lab` | `run()` + loading/result/error | `POST /api/simulation-lab/playoffs` | Result panel replaces prior | Verified |
| S19 | Dynasty lab sport selector | `DynastySimPanel` | `/app/simulation-lab` | `setSport` | Sent in payload | Applied on run | Fixed |
| S20 | Dynasty lab run button | `DynastySimPanel` | `/app/simulation-lab` | `run()` + loading/result/error | `POST /api/simulation-lab/dynasty` | Result table replaces prior | Verified |
| S21 | League tab deep-link to standings/playoffs | `LeagueHomeShellPage` | `/leagues/[leagueId]?tab=Standings%2FPlayoffs` | search param tab select | None | URL-driven tab restore | Verified |
| S22 | Season selector apply | `LeagueForecastSection` | `/leagues/[leagueId]` | `selectedSeason -> activeSeason` | `GET /api/leagues/[leagueId]/season-forecast` | `no-store` fetch + rerender | Fixed |
| S23 | Week selector apply | `LeagueForecastSection` | `/leagues/[leagueId]` | `selectedWeek -> activeWeek` | same GET route | `no-store` fetch + rerender | Fixed |
| S24 | Simulation count selector | `LeagueForecastSection` | `/leagues/[leagueId]` | `setSelectedSimulations` | included in POST body | used on rerun | Fixed |
| S25 | Playoff spots selector | `LeagueForecastSection` | `/leagues/[leagueId]` | `setSelectedPlayoffSpots` | included in POST body | used on rerun | Fixed |
| S26 | Apply controls button | `LeagueForecastSection` | `/leagues/[leagueId]` | sets active period + reload state | GET season forecast | Pulls current period snapshot | Fixed |
| S27 | Rerun season simulation button | `LeagueForecastSection` | `/leagues/[leagueId]` | `generate()` + refreshing state | `POST /api/leagues/[leagueId]/season-forecast` | POST then GET refresh | Fixed |
| S28 | AI explanation button | `LeagueForecastSection` | `/leagues/[leagueId]` | `generateAiSummary()` + aiLoading/aiError | `POST /api/leagues/[leagueId]/forecast-summary` | Uses current teamForecasts | Fixed |
| S29 | Team comparison selector A | `LeagueForecastSection` | `/leagues/[leagueId]` | `setCompareA` | None | Delta panel updates | Fixed |
| S30 | Team comparison selector B | `LeagueForecastSection` | `/leagues/[leagueId]` | `setCompareB` | None | Delta panel updates | Fixed |
| S31 | Forecast dashboard playoff odds cards | `LeagueForecastDashboard` + `PlayoffOddsPanel` | `/leagues/[leagueId]` | props render | season-forecast result | refreshes on rerun | Verified |
| S32 | Matchups period selector | `MatchupsTab` | `/app/league/[leagueId]?tab=Matchups` | `setSelectedWeekOrRound` | `/api/app/league/[leagueId]/matchups?week=` | reload via section hook | Verified |
| S33 | Matchup prev/next period buttons | `MatchupsTab` | `/app/league/[leagueId]?tab=Matchups` | local week state update | same matchups API | reload on state change | Verified |
| S34 | Matchup card click -> detail panel | `MatchupsTab` + `MatchupDetailView` | `/app/league/[leagueId]?tab=Matchups` | `setSelectedId` | None | detail panel swaps matchup | Verified |
| S35 | Matchup detail simulation auto-load | `MatchupSimulationCard` | `/app/league/[leagueId]?tab=Matchups` | `useEffect` fetch | `POST /api/simulation/matchup` | reruns when projections/context change | Fixed |
| S36 | Matchup detail sim CTA | `MatchupSimulationCard` | `/app/league/[leagueId]?tab=Matchups` | `runSimulation()` | `POST /api/simulation/matchup` | replaces prior result | Fixed |
| S37 | Matchup detail AI explanation link | `MatchupSimulationCard` | `/app/league/[leagueId]?tab=Matchups` | URL built from result | Chimmy URL | uses current sim state | Verified |
| S38 | Matchup simulation persistence wiring | `MatchupDetailView` -> `MatchupSimulationCard` | `/app/league/[leagueId]?tab=Matchups` | forwards `leagueId`, `weekOrPeriod`, team IDs | persisted via simulation API | retrievable in query layer | Fixed |
| S39 | Matchup score range consistency | `app/api/simulation/matchup/route.ts` | API | percentile range generation from distributions | simulation engine output | avoids stale static ranges | Fixed |
| S40 | Season simulation persistence | `POST season-forecast route` | API | delete/create week rows in `SeasonSimulationResult` | Prisma writes | latest week snapshot persisted | Fixed |
| S41 | Forecast freshness timestamp | `season-forecast route` + `LeagueForecastSection` | API + UI | return/use `generatedAt` | `SeasonForecastSnapshot.generatedAt` | visible freshness in dashboard | Fixed |
| S42 | Refresh button on league shell | `LeagueHomeShellPage` | `/leagues/[leagueId]` | `loadLeagueData` | roster/standings endpoints | no-store reload | Verified |
| S43 | Back navigation on league shell | `LeagueHomeShellPage` | `/leagues/[leagueId]` | Link to `/leagues` | None | browser nav | Verified |
| S44 | Sport source-of-truth enforcement | `lib/simulation-engine/types.ts` | Library | derives from `SUPPORTED_SPORTS` | `lib/sport-scope.ts` | prevents hardcoded drift | Fixed |

## Execution evidence

- `npm run typecheck` -> passed.
- `npx playwright test e2e/simulation-click-audit.spec.ts` -> passed (3/3).

