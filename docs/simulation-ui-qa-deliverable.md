# Simulation Engine UI & AI Integration — Deliverable

## 1. Simulation UI audit

- **Existing surfaces preserved**
  - **Homepage / league dashboard**: No existing simulation-specific widgets were removed; new forecast section is additive under Standings/Playoffs.
  - **Matchup pages**: `MatchupCard` and `MatchupDetailView` unchanged in structure; `MatchupSimulationCard` added inside the detail view when a matchup is selected.
  - **Standings**: League page Standings/Playoffs tab still shows the standings table first; below it, the new "Season & playoff forecast" card with `LeagueForecastSection` was added.
  - **AI chatbot / War Room**: No changes to existing chat or War Room; AI integration is limited to the new forecast-summary endpoint (narrative from simulation outputs).
  - **Rankings**: `LeagueRankingsV2Panel` and `ForwardOddsCard` are unchanged; season-forecast data is shown on the league page forecast section, not replacing inline forward odds.

- **Gaps addressed**
  - Matchup-level: win probability bars, projected score ranges, upset chance, and volatility were not surfaced in one place → **MatchupSimulationCard** + **POST /api/simulation/matchup**.
  - League-level: playoff odds, first-place/championship odds, expected wins, finish range, elimination risk were only in rankings v2 forward odds → **PlayoffOddsPanel**, **TeamForecastCard**, **LeagueForecastDashboard** + **LeagueForecastSection** wired to **GET/POST /api/leagues/[leagueId]/season-forecast**.
  - Confidence/volatility/freshness were not explicit → **SimulationConfidenceIndicator**.
  - No AI narrative from simulation data → **POST /api/leagues/[leagueId]/forecast-summary** (OpenAI).

## 2. Full updated frontend/dashboard/matchup/standings files

| Path | Label | Description |
|------|--------|-------------|
| `components/simulation/MatchupSimulationCard.tsx` | [NEW] | Win prob bars, projected score ranges, upset chance, volatility tag; optional client-side POST to `/api/simulation/matchup` when projections provided. |
| `components/simulation/PlayoffOddsPanel.tsx` | [NEW] | Renders grid of `TeamForecastCard` for playoff/title odds. |
| `components/simulation/TeamForecastCard.tsx` | [NEW] | Per-team: expected wins, expected seed, finish range, elimination risk, bye %, playoff/1st/championship bars. |
| `components/simulation/LeagueForecastDashboard.tsx` | [NEW] | Top contenders, bubble teams, confidence indicator, optional AI summary block, then `PlayoffOddsPanel`. |
| `components/simulation/SimulationConfidenceIndicator.tsx` | [NEW] | Model confidence (0–100), volatility tag, data freshness, sim count. |
| `components/simulation/LeagueForecastSection.tsx` | [NEW] | Fetches GET season-forecast; "Generate/Refresh" triggers POST; optionally requests AI summary; passes data to `LeagueForecastDashboard`. |
| `components/simulation/index.ts` | [NEW] | Public exports for simulation components. |
| `components/app/matchups/MatchupDetailView.tsx` | [UPDATED] | Imports and renders `MatchupSimulationCard` with `teamAName`, `teamBName`, `teamA`/`teamB` (mean from `projA`/`projB`, stdDev 15), `scoreA`/`scoreB`. |
| `app/leagues/[leagueId]/page.tsx` | [UPDATED] | Standings/Playoffs tab: added second Card "Season & playoff forecast" with `LeagueForecastSection`; passes `teamNames` and `teamRanks` from standings (entryId → entryName, rank). |

## 3. Backend integration adjustments

| Path | Label | Description |
|------|--------|-------------|
| `app/api/simulation/matchup/route.ts` | [NEW] | POST body: `teamA`, `teamB` (mean, optional stdDev), optional `iterations`. Uses `simulateMatchup` from `@/lib/monte-carlo`. Returns `winProbabilityA/B`, `marginMean`, `marginStdDev`, `scoreRangeA/B`, `upsetChance`, `volatilityTag`, `iterations`. |
| `app/api/leagues/[leagueId]/forecast-summary/route.ts` | [NEW] | POST body: `season`, `week`, `teamForecasts[]`. Builds short summary input; calls `openaiChatText` (OpenAI) for 2–4 sentence narrative; returns `{ summary, leagueId, season, week }`. |

No changes to existing season-forecast or rankings endpoints; they are consumed as-is by the new UI.

## 4. AI orchestration updates

- **DeepSeek**: Not wired in this deliverable; quantitative simulation remains in `lib/monte-carlo` and `lib/season-forecast`. DeepSeek can be used later for probability/statistical interpretation or heavier modeling.
- **Grok**: Not wired; trend/storyline context (e.g. “why your odds changed”) can be added later via a separate endpoint that consumes forecast + prior week and calls Grok.
- **OpenAI**: Used in **forecast-summary** for readable narrative (weekly playoff race summary, contenders, bubble). System prompt: concise fantasy analyst; user prompt: simulation forecast summary input (top contenders, bubble, playoff range). Temperature 0.5, max tokens 280.

AI output use cases supported:

- Weekly playoff race summary (forecast-summary).
- Matchup preview: win prob and upset chance come from simulation; narrative can be extended later (e.g. matchup story endpoint).
- “Why your odds changed”: requires prior-week forecast and trend; not implemented in this pass; structure is ready (dashboard + forecast API).

## 5. QA findings

- **Probabilities**: Matchup API returns 0–1 win probability; UI shows 0–100%. Playoff/championship percentages from season-forecast are 0–100; bars and labels match.
- **Stale data**: Forecast section uses GET on load and “Refresh” triggers POST; `generatedAt` is shown via `SimulationConfidenceIndicator` (e.g. “Updated 2h ago”). No automatic refetch interval; user can refresh.
- **Weekly updates**: When user clicks “Refresh”, POST runs the engine for current season/week; new snapshot overwrites previous for that league/season/week.
- **Multi-team standings**: `PlayoffOddsPanel` and dashboard grid are responsive (1 col mobile, 2–3 cols larger); many teams scroll in grid.
- **Mobile**: Simulation components use responsive classes (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, `flex-wrap`); confidence indicator and cards stack on small screens.
- **Confidence labels**: “High / Good / Moderate / Limited” from 0–100 score; volatility “High / Medium / Low” from margin/stdDev (matchup) or share of teams with wide finish range (dashboard).
- **AI summary**: Only shown when forecast-summary returns 200; if OpenAI is missing or fails, section still shows dashboard without AI block (no crash).
- **Performance**: Matchup simulation is a single POST (2k iters server-side). Season forecast POST runs 2k season sims server-side; GET is a single DB read. No heavy client work.

## 6. Issues fixed

- **MatchupSimulationCard**: Initial condition for fetch used wrong check (`!teamA?.mean != null`); replaced with explicit `typeof teamA?.mean === 'number' && typeof teamB?.mean === 'number'`.
- **League page**: Standings/Playoffs tab previously had one Card; added wrapper div and second Card for forecast so layout stays consistent and scroll order is standings then forecast.
- **Forecast section**: When no forecast exists, section shows “Generate forecast” instead of empty dashboard; when API returns 404, same CTA is shown so user can run POST (e.g. after rankings snapshot exists).

## 7. Final QA checklist

- [x] MatchupSimulationCard shows win probability bars, projected ranges, upset chance, volatility tag.
- [x] Matchup simulation API returns correct shape; frontend displays it without error.
- [x] PlayoffOddsPanel and TeamForecastCard render from `teamForecasts[]`; playoff/first-place/championship and expected wins/seed/range/elimination risk display correctly.
- [x] LeagueForecastDashboard shows contenders, bubble, confidence indicator, optional AI summary, then full playoff odds panel.
- [x] LeagueForecastSection loads GET season-forecast; Refresh runs POST; teamNames/teamRanks passed from standings when available.
- [x] League page Standings/Playoffs tab includes forecast section; build succeeds.
- [x] SimulationConfidenceIndicator shows confidence, volatility, freshness, sim count when provided.
- [x] Forecast-summary API uses OpenAI for short narrative; client only renders summary when present.
- [x] Mobile-friendly layout on simulation components.
- [x] No removal or breaking change to existing homepage widgets, matchup list, standings table, rankings panel, or chat.

## 8. Summary: how simulation outputs are now exposed

- **Matchups**: In the matchups tab, selecting a matchup opens the detail view. The detail view now includes **MatchupSimulationCard**, which uses the matchup’s projected scores (and optional stdDev) to call **POST /api/simulation/matchup** and display win probability bars, projected score ranges, upset chance (underdog win %), and a volatility tag (low/medium/high). Current scores are shown when provided.

- **Standings / league dashboard**: On the league page, the **Standings/Playoffs** tab shows the existing standings table and, below it, a **Season & playoff forecast** card. **LeagueForecastSection** fetches **GET /api/leagues/[leagueId]/season-forecast** (and optionally **POST** to generate/refresh). Results are passed to **LeagueForecastDashboard**, which shows:
  - **SimulationConfidenceIndicator**: model confidence, volatility, data freshness, sim count.
  - Optional **AI summary** from **POST /api/leagues/[leagueId]/forecast-summary** (OpenAI narrative).
  - **Title contenders** (top 4 by championship %).
  - **Bubble** (playoff prob 15–85%).
  - **PlayoffOddsPanel**: grid of **TeamForecastCard** with playoff %, first-place %, championship %, expected wins, expected seed, finish range, elimination risk, bye %.

- **Data flow**: Season forecast comes from the existing Season + Playoff Probability Engine (RankingsSnapshot + LeagueTeam/LegacyRoster → simulations → SeasonForecastSnapshot). Matchup simulation uses `lib/monte-carlo`’s `simulateMatchup`. AI narrative is generated by OpenAI from the same forecast payload. Existing rankings v2 forward odds and bracket/standings APIs are unchanged; simulation UI is additive and uses existing or new simulation endpoints only.
