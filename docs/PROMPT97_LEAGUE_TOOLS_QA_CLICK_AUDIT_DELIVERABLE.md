# Prompt 97 — End-to-End QA Pass for League Tools Polish + Full UI Click Audit

## 1. QA findings

### Trade Analyzer

| Area | Finding |
|------|--------|
| **Routes** | Primary UI: `/trade-evaluator` (main evaluator), `/trade-analyzer` (landing → links to evaluator). Legacy flow: `app/af-legacy/trade-analyzer` (LegacyTradeAnalyzerPage). |
| **Asset selection** | Trade evaluator: add/remove players and picks per side via `addPlayer`, `removePlayer`, `addPick`, `removePick`; state in `sender` / `receiver`. Legacy: `assetsA` / `assetsB`, pick selects, player queries. |
| **Analysis** | Submit triggers `handleSubmit` → `POST /api/trade-evaluator`; `loading`/`result`/`error` state updated; result rendered with fairness score, winner, explanation, insights. |
| **AI explanation** | “Discuss in AI Chat” link uses `getTradeAnalyzerAIChatUrl(buildTradeSummaryForAI(...))` → Chimmy with trade context. |
| **Reset / clear / swap** | `resetTrade()` clears both sides and result; `swapSides()` swaps sender/receiver state. Both wired to buttons. |
| **Sport options** | **Bug (fixed):** Page used `SUPPORTED_SPORTS` (undefined, not imported). Replaced with `getSportOptions()` from `@/lib/trade-analyzer` so sport dropdown works and shows all seven sports with correct labels. |

### Waiver Wire

| Area | Finding |
|------|--------|
| **Route** | `/waiver-ai` (standalone page); also WaiverPanel/WaiverAI components in app/legacy flows. |
| **Search / filters** | No global search field on standalone page; roster/bench/waiver pool are editable lists. League settings: format, sport, waiver type, week, FAAB/priority. Sport dropdown includes all seven (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER). |
| **Claim flow** | User configures roster, bench, waiver pool and submits → `POST /api/waiver-ai`; result shows `top_adds` with reasoning, FAAB recommendation, drop candidate. No explicit “claim” button (analysis only). |
| **FAAB flow** | When waiver type is FAAB, inputs for total FAAB, FAAB remaining, avg FAAB remaining; result cards show `faab_bid_recommendation` when present. |
| **Drop selection** | Result cards display `drop_candidate` per add; no separate drop-picker UI on standalone page. |
| **AI routing** | Waiver AI is the AI endpoint; “Trending players” links to `/app/meta-insights`. Rate-limit state (remaining, retryAfterSec) shown; cooldown disables submit. |

### Matchup Simulator (Simulation Lab)

| Area | Finding |
|------|--------|
| **Route** | `/app/simulation-lab` (SimulationLabPage). |
| **Team selection** | Season: your team mean/stdDev + opponent means (comma-separated). Playoffs: team means + target index. Dynasty: team means + seasons + playoff spots. No league/roster picker; numeric inputs only. |
| **Compare flow** | Each tab (Season / Playoffs / Dynasty) has its own panel with inputs and “Run” button; result displayed below. |
| **Rerun simulation** | “Run season sim” / “Run playoff sim” / “Run dynasty sim” each call their API again with current inputs; no explicit “Rerun” label but same behavior. |
| **Chart toggles** | No chart toggles present; results are text/table (expected wins, playoff %, dynasty table). |
| **AI explanation** | No dedicated AI explanation button on simulation-lab page. |

### Draft Room

| Area | Finding |
|------|--------|
| **Route** | Inside `af-legacy` (mock-draft tab); DraftRoom component in `app/af-legacy/components/mock-draft/DraftRoom.tsx`. |
| **Board rendering** | Board shows draft order and picks; `draftPicks`, `availablePlayers`, `myPicks`, slots drive display. |
| **Player filters** | `searchQuery`, `posFilter` (e.g. All), `showDrafted`, `rookiesOnly` filter the player list. |
| **Queue** | `queue` state; add to queue from player list; remove from queue; auto-pick from queue when user turn and AI auto-pick uses queue first. |
| **Pick flow** | “Make pick” calls `onMakePick({ name, position, team })`; queue item consumed on pick. |
| **AI / war room** | `onAiPick` for AI suggestion; `onAiDmSuggestion`; `onAiTradePropose`; `aiAutoPickMode` (off / bpa / needs) with optional `aiAutoQueue`. War room data from `/api/legacy/draft-war-room` (league context). |

### Bracket Challenge

| Area | Finding |
|------|--------|
| **Route** | `/bracket`, `/brackets`; league/entry under `/bracket/leagues/[leagueId]`, entry in context. |
| **Bracket open** | BracketTreeView / BracketProView receive `nodes`, `initialPicks`; picks stored per node. |
| **Pick flow** | `submitPick(node, teamName)` → `POST /api/bracket/entries/[entryId]/pick`; local state `localPicks` updated optimistically; rollback on error. Lock state via `isPickLocked`; cascade clear via `cascadeClearInvalidPicks`. |
| **Save / submit** | BracketSubmitBar and BracketEntryActionsCard: “Submit” → `POST /api/bracket/entries/[entryId]/submit`. Validation: all picks filled; then status set to SUBMITTED. |
| **Leaderboard** | StandingsTab, MassiveLeaderboard; fetch `/api/bracket/leaderboard/league/[leagueId]` or global/friends; display rank, username, score. |
| **Scoring explanation** | Scoring rules and round breakdown come from league/tournament config and lib/brackets/scoring; displayed in standings/entry UI where implemented. |

### Tool Hub

| Area | Finding |
|------|--------|
| **Route** | `/tools-hub` (see Prompt 96 deliverable). |
| **Tool discovery** | Featured tools, By sport (cards + dropdown filter), All tools (category tabs), related links on cards. |
| **Related tools** | Each tool card shows up to 3 related links from `getRelatedTools(slug)`. |
| **Sport / category filters** | Sport dropdown and category tabs filter the “All tools” list; state in `sportFilter`, `categoryFilter`. |
| **Quick links** | Main experiences (App, Bracket, Legacy), Chimmy AI, Back to Home; all use ROUTES from tool-hub. |

### AI tool routing

| Entry point | Route / behavior |
|-------------|------------------|
| Trade Analyzer “Discuss in AI Chat” | `getTradeAnalyzerAIChatUrl(buildTradeSummaryForAI(...))` → Chimmy with trade summary. |
| Waiver AI | Analysis is AI-backed via `/api/waiver-ai`; no separate “open in Chimmy” on standalone page. |
| Draft Room AI | `onAiPick`, DM suggestion, trade proposal; can call `/api/mock-draft/ai-pick`. |
| Bracket AI | Bracket intelligence APIs (e.g. matchup, story); no generic “ask Chimmy” on bracket UI in scope. |
| Tool Hub | Chimmy block links to `/chimmy` (ROUTES.chimmy()). |

---

## 2. Full UI click audit findings

### Trade Evaluator (`/trade-evaluator`)

| Element | Component / location | Handler | State / API | Persistence / reload | Status |
|--------|------------------------|--------|-------------|----------------------|--------|
| Back to Home | Link | — | Navigate to `/` | — | OK |
| Add Player (sender/receiver) | button | `addPlayer(teamKey)` | Updates `sender`/`receiver` | None | OK |
| Remove Player (×) | button | `removePlayer(teamKey, i)` | Same | None | OK |
| Add Pick | button | `addPick(teamKey)` | Same | None | OK |
| Remove Pick (×) | button | `removePick(teamKey, i)` | Same | None | OK |
| League format / QB / Sport / Scoring / Date | select/input | setLeagueFormat, setQbFormat, setSport, setScoring, setAsOfDate | Local state | None | OK (sport fixed) |
| Swap sides | button | `swapSides` | Swaps sender/receiver | None | OK |
| Reset | button | `resetTrade` | Clears sides + result, error | None | OK |
| Evaluate Trade | submit | `handleSubmit` | POST /api/trade-evaluator; setLoading, setResult, setError | None | OK |
| Discuss in AI Chat | Link | href from getTradeAnalyzerAIChatUrl(...) | Navigate to Chimmy with query | — | OK |

### Waiver AI (`/waiver-ai`)

| Element | Component / location | Handler | State / API | Persistence / reload | Status |
|--------|------------------------|--------|-------------|----------------------|--------|
| Back to Home | Link | — | Navigate to `/` | — | OK |
| Trending players | Link | — | Navigate to `/app/meta-insights` | — | OK |
| Format / Sport / Waiver type / Week / FAAB / Priority | select/input | setFormat, setSport, setWaiverType, etc. | Local state | None | OK |
| Add/remove roster, bench, waiver rows | button / X | addPlayer, removePlayer, updatePlayer | roster, bench, waiverPool | None | OK |
| Get recommendations | button | handleSubmit | POST /api/waiver-ai; setResult, setError; ingestRateLimit | None | OK |
| Result card click (WaiverSuggestionCard) | onClick | setSelectedPlayer | selectedPlayer for modal/detail | None | OK |

### Simulation Lab (`/app/simulation-lab`)

| Element | Component / location | Handler | State / API | Persistence / reload | Status |
|--------|------------------------|--------|-------------|----------------------|--------|
| Season / Playoffs / Dynasty tabs | button | setTab | tab state; panel switch | None | OK |
| Sport (Season) | select | setSport | sport state | None | OK |
| Team mean, stdDev, opponents, playoff spots, iterations | input | setTeamMean, setTeamStd, setOpponentsText, etc. | Local state per panel | None | OK |
| Run season sim | button | run (useCallback) | POST /api/simulation-lab/season; setResult, setError | None | OK |
| Run playoff sim | button | run | POST /api/simulation-lab/playoffs | None | OK |
| Run dynasty sim | button | run | POST /api/simulation-lab/dynasty | None | OK |

### Draft Room (af-legacy mock-draft)

| Element | Component / location | Handler | State / API | Persistence / reload | Status |
|--------|------------------------|--------|-------------|----------------------|--------|
| Search / position filter / show drafted / rookies only | input, select, checkbox | setSearchQuery, setPosFilter, setShowDrafted, setRookiesOnly | Local state | None | OK |
| Add to queue | button | setQueue(prev => [...prev, player]) | queue | None | OK |
| Remove from queue | button | setQueue(prev => prev.filter(..., i !== idx)) | queue | None | OK |
| Make pick | button | onMakePick({ name, position, team }) | Parent state / API | Depends on parent | OK |
| AI pick / DM suggestion | button/callback | onAiPick, onAiDmSuggestion | API then onMakePick | None | OK |
| Settings / fullscreen / mobile tab | button/tab | setSettingsOpen, onToggleFullscreen, setMobileTab | Local / parent | None | OK |

### Bracket Challenge

| Element | Component / location | Handler | State / API | Persistence / reload | Status |
|--------|------------------------|--------|-------------|----------------------|--------|
| Node pick (team A/B) | BracketTreeView/BracketProView | submitPick(node, teamName) | POST /api/bracket/entries/[entryId]/pick; setLocalPicks | Optimistic + rollback | OK |
| Submit bracket | BracketSubmitBar / BracketEntryActionsCard | handleSubmit / submitBracket | POST /api/bracket/entries/[entryId]/submit | Status → SUBMITTED | OK |
| View Leaderboards | Link / tab | — | Navigate to standings/leaderboard | — | OK |
| Locked pick | — | isPickLocked; cascadeClearInvalidPicks | Read-only / clear invalid | — | OK |

### Tool Hub (`/tools-hub`)

| Element | Component / location | Handler | State / API | Persistence / reload | Status |
|--------|------------------------|--------|-------------|----------------------|--------|
| Sport filter dropdown | select | setSportFilter | Filters filteredToolSlugs | useMemo | OK |
| Category tabs | button | setCategoryFilter | Filters filteredToolSlugs | useMemo | OK |
| Featured card (headline, Open) | Link | — | toolLandingHref, openToolHref | — | OK |
| By sport cards | Link | — | ROUTES.sportLanding(slug) | — | OK |
| All tools card (headline, Open, Related) | Link | — | /tools/[slug], openToolHref, related hrefs | — | OK |
| Main experiences / Chimmy / Back home | Link | — | ROUTES | — | OK |

### Shared / shell

| Element | Component / location | Handler | State / API | Persistence / reload | Status |
|--------|------------------------|--------|-------------|----------------------|--------|
| Nav “Tools” | Shell / NavLinkResolver | — | href /tools-hub; active for /tools-hub, /tools/* | — | OK |
| Search “Tools Hub” | SearchResultResolver | — | href /tools-hub | — | OK |
| Quick action Tools hub | QuickActionsService | — | href /tools-hub | — | OK |

---

## 3. Bugs found

1. **Trade Evaluator sport dropdown (fixed)**  
   - **File:** `app/trade-evaluator/page.tsx`  
   - **Issue:** `const SPORT_OPTIONS = SUPPORTED_SPORTS.map(...)` used `SUPPORTED_SPORTS`, which was not imported, so the sport dropdown would fail at runtime (undefined reference).  
   - **Fix:** Replaced with `const SPORT_OPTIONS = getSportOptions()` using the already-imported `getSportOptions` from `@/lib/trade-analyzer`, which returns options for all seven sports with correct labels (e.g. NCAA Football, NCAA Basketball, Soccer).

No other dead buttons, broken AI routing, or incorrect submit/redirect flows were identified in the audited paths.

---

## 4. Issues fixed

- **Trade Evaluator sport options:** Use `getSportOptions()` instead of undefined `SUPPORTED_SPORTS` so the League Settings sport dropdown renders and submits the correct sport (NFL, NHL, NBA, MLB, NCAA Football, NCAA Basketball, Soccer).

---

## 5. Regression risks

| Risk | Mitigation |
|------|------------|
| Trade evaluator sport options | `getSportOptions()` is the single source of truth from `lib/trade-analyzer` (which uses `lib/sport-scope`); no duplicate sport list. |
| Bracket pick submit | Submit validates all picks; API returns INCOMPLETE_BRACKET when missing; local state and server status kept in sync. |
| Waiver rate limit | Cooldown and remaining are derived from response; submit disabled during cooldown to avoid duplicate submits. |
| Draft room queue vs pick | Queue is consumed on pick; auto-pick effect depends on queue, draftPicks, and isUserTurn to avoid double-pick. |
| Tool hub filters | Filtering is derived in useMemo from props + sport/category state; no server call, so no stale filter state. |

---

## 6. Final QA checklist

- [ ] **Trade Analyzer:** Asset add/remove, analyze, result and AI chat link work; reset and swap work; sport dropdown shows all seven sports and submits correctly.
- [ ] **Waiver Wire:** League/team/waiver inputs, submit, result with FAAB/drop; rate limit cooldown disables submit; Back home and Trending players links work.
- [ ] **Matchup Simulator:** Season/Playoffs/Dynasty tabs and run buttons call correct APIs; results display; no chart toggles (none implemented).
- [ ] **Draft Room:** Board and player list render; filters and search work; queue add/remove; make pick and AI pick/suggestion work when wired by parent.
- [ ] **Bracket Challenge:** Picks save via pick API; submit enables when complete and calls submit API; leaderboard/standings load; locked/cascade behavior as designed.
- [ ] **Tool Hub:** Featured and All tools cards link to tool landing and open-tool URLs; sport and category filters narrow list; related links go to correct tool pages; main/Chimmy/back links work.
- [ ] **Mobile:** Key controls (buttons, links, dropdowns, inputs) are usable on small viewports; no critical flow only on desktop.
- [ ] **Shell / auth:** Nav, search, quick actions, and auth/settings flows unchanged and working.

---

## 7. Explanation of the end-to-end tools validation pass

This pass was a **production QA and click-by-click audit** of the main league tools and the Tool Hub. It did not change product behavior except to fix the Trade Evaluator sport dropdown.

**Scope**

- **Trade Analyzer:** `/trade-evaluator` and related flows (asset selection, analysis, AI chat link, reset, swap, league/sport options).
- **Waiver Wire:** `/waiver-ai` (settings, roster/bench/waiver pool, submit, result, FAAB/drop, rate limit, links).
- **Matchup Simulator:** `/app/simulation-lab` (Season/Playoffs/Dynasty tabs, inputs, run buttons, APIs, result display).
- **Draft Room:** DraftRoom in af-legacy (board, filters, queue, pick, AI pick/suggestion).
- **Bracket Challenge:** Bracket views, pick save, submit, leaderboard, scoring/lock behavior.
- **Tool Hub:** Discovery, featured/category/sport filters, related tools, quick links (per Prompt 96).
- **AI tool routing:** Trade → Chimmy, waiver/draft/bracket AI entry points and links.

**Method**

- Codebase inspection of routes, components, and handlers.
- For each major clickable (buttons, links, filters, submit, reset, etc.): identify component and route, confirm handler exists, confirm state/API and persistence/reload behavior.
- Verification that no undefined references or dead buttons remain in the audited paths.

**Outcome**

- One bug found and fixed: Trade Evaluator sport options now use `getSportOptions()`.
- All other audited flows have correct handlers, state updates, and API/navigation wiring; no dead buttons, duplicate submits, or bad redirects identified.
- Shell, auth, settings, dashboard, and chat flows were preserved and noted as in scope for regression only; no changes made to them.

**Deliverable**

- QA findings by tool.
- Full UI click audit tables (element, component, handler, state/API, persistence, status).
- Bugs found, issues fixed, regression risks, and final QA checklist.
- This document as the explanation of the end-to-end tools validation pass.
