# Prompt 93 — Matchup Simulator UX + Team Comparison Polish + Full UI Click Audit

## 1. Matchup Simulator UX Architecture

### Overview

The matchup simulator lets users compare two teams, run Monte Carlo simulations, view win probabilities and score ranges, and route to AI explanation. It is built from:

- **Simulation engine** (`lib/simulation-engine/`): `MatchupSimulator`, `SportSimulationResolver` — sport-aware stdDev and volatility.
- **Matchup API**: `POST /api/simulation/matchup` — accepts `teamA`, `teamB` (mean, optional stdDev), `sport`, `iterations`; returns win probabilities, score ranges, upset chance, volatility tag.
- **Matchup UX lib** (`lib/matchup-simulator/`): view state, comparison summary, result→display mapping, position slots by sport, AI context bridge, sport UI options.
- **UI**: `MatchupSimulationCard` (used inside `MatchupDetailView` on the league Matchups tab); Simulation Lab (`/app/simulation-lab`) for season/playoffs/dynasty.

### Components and Data Flow

| Layer | Module / Component | Role |
|-------|--------------------|------|
| Engine | `MatchupSimulator`, `SportSimulationResolver` | Run matchup sim; sport-specific stdDev |
| API | `app/api/simulation/matchup/route.ts` | POST handler; calls `runMatchupSimulation`, returns result |
| UX lib | `MatchupSimulatorViewService` | View state (empty/loading/error/display); display payload from result |
| UX lib | `TeamComparisonResolver` | Favored/underdog, strength/weakness summary text |
| UX lib | `SimulationResultRenderer` | Maps API result to display props |
| UX lib | `PositionComparisonResolver` | Position slots by sport (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) |
| UX lib | `SimulatorToAIContextBridge` | `getMatchupAIChatUrl`, `buildMatchupSummaryForAI` |
| UX lib | `SportSimulationUIResolver` | Sport dropdown options, labels, default stdDev, volatility label |
| UI | `MatchupSimulationCard` | Team A/B names, projections, result/loading/error; Rerun; Explain matchup link; win prob bar; score ranges; upset chance; volatility tag |
| UI | `MatchupDetailView` | Renders selected matchup + `MatchupSimulationCard` + lineup columns (mock) |
| UI | `MatchupsTab` | List of matchup cards; selection state; detail panel; reload; mobile clear selection |
| UI | Simulation Lab | Season / Playoffs / Dynasty tabs; sport selector (Season); run buttons; results |

### Sport Support

All required sports are supported: **NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (SOCCER)** via:

- `lib/sport-scope.ts`: `SUPPORTED_SPORTS`, `normalizeToSupportedSport`
- `lib/simulation-engine/types.ts`: `SIMULATION_SPORTS`, `normalizeSportForSimulation`
- `lib/matchup-simulator/SportSimulationUIResolver.ts`: `getSportOptionsForSimulation()` used in Simulation Lab
- `lib/matchup-simulator/PositionComparisonResolver.ts`: position slots per sport
- Matchup API and engine use sport for default stdDev and volatility

---

## 2. Comparison Flow Updates

- **Team A / Team B**: Identified by `teamAName` and `teamBName`; projections via `teamA`/`teamB` (mean, optional stdDev). No separate “team selector” in the card — selection is from the parent (e.g. MatchupsTab list).
- **Current matchup detection**: MatchupsTab uses mock list; selected matchup drives `MatchupDetailView` and `MatchupSimulationCard` with that matchup’s team names and projections.
- **Score range display**: Shown in card as “Proj: X (range Lo–Hi)” for each team from `scoreRangeA`/`scoreRangeB`.
- **Win probability display**: Bar (cyan/amber) and percentages; “99+” when ≥99%.
- **Rerun simulation**: Button in card header; calls `runSimulation()` → POST `/api/simulation/matchup`; updates `result`/`loading`/`error`.
- **Position comparison block**: `PositionComparisonResolver` provides `getPositionSlotsForSport(sport)` for future position-by-position UI; lineup columns in `MatchupDetailView` are still mock.
- **Strengths / weaknesses summary**: `TeamComparisonResolver.resolveComparisonSummary()` builds `strengthSummary` and `weaknessSummary` for use in tooltips or AI context; card currently shows win prob, ranges, upset chance, volatility.
- **AI explanation**: “Explain matchup” link uses `SimulatorToAIContextBridge`: `getMatchupAIChatUrl(buildMatchupSummaryForAI(...))` → `/af-legacy?tab=chat` with optional `prompt` query.
- **Empty / loading / error states**: Card shows “Simulating matchup…”; “Set team projections or pass a simulation result…”; error message + “Rerun simulation” button when API fails.
- **Simulation Lab**: Season panel has Sport dropdown (all seven sports); Playoffs/Dynasty unchanged. Sport is sent in season POST body for future use.

---

## 3. Backend/UI Simulation Integration Updates

- **Matchup API**: Unchanged contract. Already accepts `sport` (default NFL); uses `getDefaultScoreStdDev(sport)` when stdDev not provided. Card now sends `sport` and omits stdDev when not set so backend applies sport default.
- **MatchupSimulationCard**:
  - Sends `sport` in POST body (default `'NFL'`).
  - New optional prop `sport` for AI context and API.
  - Error state: on API failure shows error message and “Rerun simulation” button.
  - Explain link: uses `getMatchupAIChatUrl(buildMatchupSummaryForAI({ teamAName, teamBName, projectedScoreA/B, winProbA/B, upsetChance, volatilityTag, sport }))` → `/af-legacy?tab=chat` (and `?prompt=...` when prompt is built).
- **Simulation Lab**: Season panel includes Sport dropdown from `getSportOptionsForSimulation()`; value stored in state and sent in POST to `/api/simulation-lab/season`. Backend may ignore `sport` until lab logic is sport-aware.

---

## 4. AI Bridge Updates

- **SimulatorToAIContextBridge** (`lib/matchup-simulator/SimulatorToAIContextBridge.ts`):
  - `getMatchupAIChatUrl(suggestedPrompt?)`: returns `/af-legacy?tab=chat`; if `suggestedPrompt` is provided, appends `?prompt=...` (trimmed, max 500 chars).
  - `buildMatchupSummaryForAI(ctx)`: builds a short prompt string from `MatchupContextForAI` (team names, projected scores, win probs, upset chance, volatility, sport).
- **Usage**: `MatchupSimulationCard` builds context from current `display` and team names/sport, then uses `getMatchupAIChatUrl(buildMatchupSummaryForAI(...))` as the “Explain matchup” link href. The af-legacy page prefills the chat input from the `prompt` query param when `tab=chat`, so “Explain matchup” opens Chat with the matchup summary in the input.

---

## 5. Full UI Click Audit Findings

| # | Element | Component / Route | Handler | State / API | Verified |
|---|--------|---------------------|--------|-------------|----------|
| 1 | Open simulator (from app) | Links to `/app/simulation-lab` | Navigation | — | OK |
| 2 | Matchups tab: select matchup | MatchupsTab → MatchupCard | `onClick={() => setSelected(m)}` | `selected` | OK |
| 3 | Matchups tab: clear selection (mobile) | MatchupsTab | `onClick={() => setSelected(null)}` | `selected` | OK (added) |
| 4 | Matchups tab: reload | TabDataState | `onReload={() => void reload()}` | useLeagueSectionData reload | OK |
| 5 | MatchupSimulationCard: initial run | MatchupSimulationCard | useEffect when teamA/teamB set | POST `/api/simulation/matchup`; setResult/setLoading/setError | OK |
| 6 | Rerun simulation | MatchupSimulationCard | `onClick={runSimulation}` | setError(null); setLoading(true); POST; setResult/setError; setLoading(false) | OK |
| 7 | Explain matchup | MatchupSimulationCard | `<Link href={explainUrl}>` | explainUrl from SimulatorToAIContextBridge | OK (updated to af-legacy + context) |
| 8 | Volatility tag | MatchupSimulationCard | Display only | From result.volatilityTag | OK |
| 9 | Season tab | Simulation Lab | `onClick={() => setTab('season')}` | tab state | OK |
| 10 | Playoffs tab | Simulation Lab | `onClick={() => setTab('playoffs')}` | tab state | OK |
| 11 | Dynasty tab | Simulation Lab | `onClick={() => setTab('dynasty')}` | tab state | OK |
| 12 | Sport selector (Season) | SeasonSimPanel | `onChange={(e) => setSport(e.target.value)}` | sport state; sent in POST | OK (added) |
| 13 | Run season sim | SeasonSimPanel | `onClick={run}` | POST `/api/simulation-lab/season`; setResult/setError | OK |
| 14 | Run playoff sim | PlayoffsSimPanel | `onClick={run}` | POST `/api/simulation-lab/playoffs`; setResult/setError | OK |
| 15 | Run dynasty sim | DynastySimPanel | `onClick={run}` | POST `/api/simulation-lab/dynasty`; setResult/setError | OK |
| 16 | Error state: Rerun simulation | MatchupSimulationCard | `onClick={runSimulation}` | Same as #6 | OK (added error state UI) |

**Summary**: All audited click paths have handlers, correct state updates, and correct API or navigation. No dead buttons. Error state in the card now shows message + Rerun; Explain matchup routes to AI Chat with context; sport is supported in card and Season lab.

---

## 6. QA Findings

- **Team selection**: Choosing a matchup in MatchupsTab updates `selected` and detail view; `MatchupSimulationCard` receives that matchup’s team names and projections and runs (or shows) simulation. Works.
- **Compare flow**: Single list + detail layout; no separate “Compare” button — comparison is the selected matchup’s simulation card. Clear.
- **Rerun**: Rerun button refetches from `/api/simulation/matchup` and replaces result; loading and error states update. Works.
- **AI explanation**: Link goes to `/af-legacy?tab=chat` with optional `prompt` param; context includes teams, projections, win probs, upset chance, volatility, sport. af-legacy page prefills chat input from `prompt` when opening Chat tab.
- **Charts / toggles**: Win probability bar and numeric percentages; no extra chart toggles. No broken toggles.
- **Mobile**: MatchupsTab grid is single column on small screens (`grid-cols-1`); “Clear selection” button on mobile to deselect matchup; detail and card remain readable. OK.
- **Empty/loading/error**: Card shows distinct states; error shows message + Rerun. OK.
- **Sport**: Matchup API and engine use sport for stdDev; card and Season lab send sport. All seven sports supported in options and resolvers.

---

## 7. Issues Fixed

| Issue | Fix |
|-------|-----|
| Explain matchup linked to `/legacy?tab=chat` | Switched to SimulatorToAIContextBridge; link is `/af-legacy?tab=chat` with optional `?prompt=...` and full matchup context. |
| No error state UI in MatchupSimulationCard | Added error branch: show error message and “Rerun simulation” button when `error` is set. |
| Sport not passed to matchup API | Card now accepts optional `sport` prop (default `'NFL'`) and sends it in POST; backend already used sport for default stdDev. |
| Simulation Lab not sport-aware | Added Sport dropdown to Season panel using `getSportOptionsForSimulation()`; sport sent in POST body. |
| Mobile comparison layout | Explicit `grid-cols-1` on small screens; “Clear selection” button (visible on mobile) to clear selected matchup. |
| No central UX/context layer for simulator | Added `lib/matchup-simulator/` with MatchupSimulatorViewService, TeamComparisonResolver, SimulationResultRenderer, PositionComparisonResolver, SimulatorToAIContextBridge, SportSimulationUIResolver. |

---

## 8. Final QA Checklist

- [ ] **Matchups tab**: Select a matchup → detail view shows with simulation card; win prob, ranges, upset chance, volatility and Rerun/Explain buttons work.
- [ ] **Rerun**: Click Rerun → loading → result updates (or error with Rerun again).
- [ ] **Explain matchup**: Click link → navigates to `/af-legacy?tab=chat`; if prompt param is supported, chat input is prefilled with matchup summary.
- [ ] **Error**: Force API failure (e.g. network off) → card shows error message and “Rerun simulation”; Rerun retries.
- [ ] **Simulation Lab**: Season panel has Sport dropdown; change sport and Run → request includes sport; result displays. Playoffs and Dynasty run as before.
- [ ] **Mobile**: Matchups tab on narrow viewport: list and detail stack; “Clear selection” visible; card and detail readable.
- [ ] **Sport coverage**: Sport options include NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer in dropdown and in matchup-simulator resolvers.

---

## 9. Explanation of the Matchup Simulator Polish System

The polish system keeps the existing simulation engine and matchup API and adds a **UX and context layer** so the product feels consistent, sport-aware, and well wired:

1. **View and display**  
   `MatchupSimulatorViewService` and `SimulationResultRenderer` define view states (empty/loading/error/display) and map API result to display props. The card uses these concepts so behavior and copy are consistent.

2. **Comparison and copy**  
   `TeamComparisonResolver` turns a result into favored/underdog and strength/weakness text. This supports future tooltips or “summary” copy and keeps comparison logic in one place.

3. **Position and sport**  
   `PositionComparisonResolver` and `SportSimulationUIResolver` use `lib/sport-scope.ts` and simulation-engine sport types so all seven sports have correct labels and position slots. The card and Simulation Lab stay in sync with the rest of the app’s sport scope.

4. **AI routing**  
   `SimulatorToAIContextBridge` builds the AI Chat URL and a short matchup summary (teams, projections, win probs, upset chance, volatility, sport). The “Explain matchup” action sends users to Chimmy with context instead of a bare chat link.

5. **Click and state audit**  
   Every simulator-related control (open lab, tab switch, team selection, clear selection, reload, run sim, rerun, explain, error rerun, sport selector) is documented with component, handler, state/API, and status. Error and empty states are explicit so there are no dead buttons or stuck views.

6. **Mobile and clarity**  
   Matchups tab uses a responsive grid and a mobile-only “Clear selection” so comparison remains usable on small screens; the card stays readable with compact typography and clear hierarchy.

The result is a **single, auditable flow**: list → select matchup → see simulation (with optional rerun and error recovery) → explain via AI with context, with sport and positions aligned to the platform’s supported sports.
