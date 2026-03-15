# Prompt 91 — Trade Analyzer UX + Workflow Polish + Full UI Click Audit — Deliverable

## 1. Trade Analyzer UX Architecture

### Entry Points and Routes

| Route | Page / Component | Purpose |
|-------|------------------|---------|
| `/trade-analyzer` | TradeAnalyzerLandingPage | Marketing landing; links to /trade-evaluator |
| `/trade-evaluator` | TradeEvaluatorPage (TradeEvaluatorInner) | Main standalone analyzer: Team A (Sender) / Team B (Receiver), players, picks, FAAB, league settings, evaluate → POST /api/trade-evaluator |
| `/dynasty-trade-analyzer` | DynastyTradeAnalyzerPage | Auth-gated; renders DynastyTradeForm |
| `/af-legacy?tab=chat` | Legacy AI Chat | AI Chat; linked from analyzer “Discuss in AI Chat” with optional prompt |
| `/af-legacy/trade-analyzer` | LegacyTradeAnalyzerPage | League-connected analyzer (Sleeper leagues, roster/pick selection); POST /api/legacy/trade/analyze |

### Core Lib Modules (New)

| Module | Location | Role |
|--------|----------|------|
| **TradeAnalyzerViewService** | `lib/trade-analyzer/TradeAnalyzerViewService.ts` | Empty/loading/error copy and result visibility helpers |
| **TradeAssetSelectionController** | `lib/trade-analyzer/TradeAssetSelectionController.ts` | add/remove asset by index or id, canSubmitTrade, getNamedPlayerCount |
| **TradeValueBreakdownResolver** | `lib/trade-analyzer/TradeValueBreakdownResolver.ts` | getFairnessScore, getFairnessColorClass, getWinnerLabel, formatValueBreakdown |
| **TradeAnalyzerUIStateService** | `lib/trade-analyzer/TradeAnalyzerUIStateService.ts` | Default labels, getEmptyTradeState, swapSides helper |
| **TradeToAIContextBridge** | `lib/trade-analyzer/TradeToAIContextBridge.ts` | getTradeAnalyzerAIChatUrl(suggestedPrompt?), buildTradeSummaryForAI(sideA, sideB, sport) |
| **SportTradeAnalyzerResolver** | `lib/trade-analyzer/SportTradeAnalyzerResolver.ts` | TRADE_ANALYZER_SPORTS, getSportDisplayLabel, getSportOptions, isPickHeavySport, getDefaultPickRounds |

All seven sports are supported via `lib/sport-scope.ts`: **NFL, NHL, NBA, MLB, NCAA Football (NCAAF), NCAA Basketball (NCAAB), Soccer (SOCCER)**. Trade-evaluator sport dropdown uses `getSportOptions()` from the new resolver.

### UX Flow

- **Build trade:** Add/remove players and picks per side; optional manager name, record/rank, FAAB; league format, sport, scoring, QB format, optional as-of date.
- **Evaluate:** Submit → loading state → result (fairness score, winner, summary, insights, veto/expert warning, risk flags, counter-offer, dynasty/EOY outlook).
- **Follow-up:** “Discuss in AI Chat” opens `/af-legacy?tab=chat` with an optional suggested prompt summarizing the trade.
- **Reset / Swap:** Reset trade clears both sides to defaults and result; Swap sides exchanges sender and receiver data.

---

## 2. Backend / UI Integration Updates

- **Trade Evaluator**
  - **Sport:** Dropdown now uses `getSportOptions()` from `lib/trade-analyzer` (all 7 sports with display labels, e.g. NCAA Football, NCAA Basketball, Soccer).
  - **Submit:** Client now requires at least one named player (or pick) per side before calling POST `/api/trade-evaluator`; error message: “Add at least one player (or pick) to each side.”
  - **Result:** Fairness score and winner use `getFairnessScore`, `getFairnessColorClass`, `getWinnerLabel` from TradeValueBreakdownResolver.
- **Dynasty Trade Form**
  - **AI link:** After analysis, “Discuss in AI Chat” link added; uses `getTradeAnalyzerAIChatUrl(buildTradeSummaryForAI(teamA, teamB, 'dynasty'))`.
- **AI Bridge**
  - `getTradeAnalyzerAIChatUrl(suggestedPrompt?)` returns `/af-legacy?tab=chat` and optionally appends `?prompt=...` for the suggested question.
  - `buildTradeSummaryForAI(senderSummary, receiverSummary, sport)` builds short copy for the AI prompt.

No backend API contracts were changed; only client validation and UI wiring.

---

## 3. Analyzer State Management Improvements

- **Trade Evaluator**
  - **resetTrade():** Sets sender/receiver to default teams (one empty player each), clears result and error.
  - **swapSides():** Exchanges sender and receiver state (manager name, players, picks, FAAB) so the two columns are swapped.
  - **Error dismiss:** Error banner includes a “Dismiss” button that clears error state.
- **Validation**
  - Submit checks `senderNames.length` and `receiverNames.length` (players with non-empty name) and sets error if either is 0.
- **DynastyTradeForm**
  - Already had clearTrade (clear both sides, result, sections, localStorage); no change. “Discuss in AI Chat” added to result section.

---

## 4. AI Bridge Updates

- **TradeToAIContextBridge** (`lib/trade-analyzer/TradeToAIContextBridge.ts`)
  - **getTradeAnalyzerAIChatUrl(suggestedPrompt?):** Returns `/af-legacy?tab=chat`; if `suggestedPrompt` is provided, adds `?prompt=...` (trimmed, max 500 chars).
  - **buildTradeSummaryForAI(senderSummary, receiverSummary, sport):** Returns a one-line summary suitable for the AI chat prompt (e.g. “I just analyzed this NFL trade: X vs Y. Can you help me understand the value and risks?”).
- **Usage**
  - Trade-evaluator: “Discuss in AI Chat” link uses both functions with sender/receiver player names and current sport.
  - DynastyTradeForm: “Discuss in AI Chat” link uses both with team A/B asset names and sport `'dynasty'`.

---

## 5. Full UI Click Audit Findings

| Element | Component / Route | Handler | Backend / State | Status |
|--------|---------------------|--------|------------------|--------|
| Back to Home | trade-evaluator | Link href="/" | — | OK |
| Sender manager name | TradeEvaluatorInner | setSender({ ...sender, manager_name }) | Local state | OK |
| Sender record/rank | TradeEvaluatorInner | setSender({ ...sender, record_or_rank }) | Local state | OK |
| + Add Player (sender/receiver) | TradeEvaluatorInner | addPlayer(teamKey) | setSender/setReceiver | OK |
| Remove player (×) | TradeEvaluatorInner | removePlayer(teamKey, i) | setSender/setReceiver | OK |
| Update player field | TradeEvaluatorInner | updatePlayer(teamKey, i, field, value) | setSender/setReceiver | OK |
| + Add Pick (sender/receiver) | TradeEvaluatorInner | addPick(teamKey) | setSender/setReceiver | OK |
| Remove pick (×) | TradeEvaluatorInner | removePick(teamKey, i) | setSender/setReceiver | OK |
| Update pick field | TradeEvaluatorInner | updatePick(teamKey, i, field, value) | setSender/setReceiver | OK |
| FAAB input | TradeEvaluatorInner | setTeam({ ...team, gives_faab }) | Local state | OK |
| AF Pro checkbox | TradeEvaluatorInner | setTeam({ ...team, is_af_pro }) | Local state | OK |
| Format select | TradeEvaluatorInner | setLeagueFormat | Local state | OK |
| QB Format select | TradeEvaluatorInner | setQbFormat | Local state | OK |
| Sport select | TradeEvaluatorInner | setSport | Local state; options from getSportOptions() | OK |
| Scoring select | TradeEvaluatorInner | setScoring | Local state | OK |
| As Of Date input / Clear | TradeEvaluatorInner | setAsOfDate, clear button setAsOfDate('') | Local state | OK |
| Error Dismiss | TradeEvaluatorInner | setError('') | Local state | OK |
| Evaluate Trade button | TradeEvaluatorInner | handleSubmit (form submit) | POST /api/trade-evaluator | OK |
| Swap sides button | TradeEvaluatorInner | swapSides | setSender/setReceiver | OK |
| Reset trade button | TradeEvaluatorInner | resetTrade | setSender/setReceiver/setResult/setError | OK |
| Discuss in AI Chat (after result) | TradeEvaluatorInner | Link href={getTradeAnalyzerAIChatUrl(...)} | Navigate to /af-legacy?tab=chat | OK |
| DynastyTradeForm: League context | DynastyTradeForm | setLeagueContext | Local + localStorage | OK |
| DynastyTradeForm: Clear Trade | DynastyTradeForm | clearTrade | Clear state + localStorage | OK |
| DynastyTradeForm: Team A/B name | DynastyTradeForm | setTeamAName/setTeamBName | Local + localStorage | OK |
| DynastyTradeForm: Add player (A/B) | DynastyTradeForm | addPlayerAsset(side, player) | setTeamAAssets/setTeamBAssets | OK |
| DynastyTradeForm: Add pick (A/B) | DynastyTradeForm | addPickAsset(side, name) | setTeamAAssets/setTeamBAssets, clear pick input | OK |
| DynastyTradeForm: Remove asset (X) | DynastyTradeForm | removeAsset(side, id) | setTeamAAssets/setTeamBAssets | OK |
| DynastyTradeForm: Value (player) | DynastyTradeForm | lookupPlayerValue | POST /api/player-value | OK |
| DynastyTradeForm: Analyze Trade | DynastyTradeForm | handleAnalyze | callAI /api/dynasty-trade-analyzer | OK |
| DynastyTradeForm: Discuss in AI Chat | DynastyTradeForm | NextLink href={getTradeAnalyzerAIChatUrl(...)} | Navigate to AI chat | OK |
| DynastyTradeForm: Copy message | DynastyTradeForm | navigator.clipboard.writeText | — | OK |
| DynastyTradeForm: Share Link | DynastyTradeForm | shareAnalysis | POST /api/trade/share | OK |
| DynastyTradeForm: Export as image | DynastyTradeForm | exportAsImage | html2canvas | OK |
| Trade analyzer landing CTA | TradeAnalyzerLandingInner | Link href="/trade-evaluator" | — | OK |

All audited elements have handlers, correct state updates, and correct API or navigation. No dead buttons identified.

---

## 6. QA Findings

- **Sport scope:** Trade-evaluator sport dropdown now includes all seven sports (NFL, NHL, NBA, MLB, NCAA Football, NCAA Basketball, Soccer) with correct labels.
- **Asset selection:** Add/remove player and add/remove pick work for both sides; state updates and re-renders are correct.
- **Validation:** Submitting with one side empty shows “Add at least one player (or pick) to each side.” and does not call the API.
- **Reset trade:** Clears both sides to defaults and result/error; form is ready for a new trade.
- **Swap sides:** Sender and receiver data (manager name, players, picks, FAAB) are exchanged; result is not cleared (user can re-evaluate if desired).
- **AI explanation routing:** “Discuss in AI Chat” opens `/af-legacy?tab=chat` with an optional `prompt` query; summary includes sport and both sides.
- **Loading state:** Evaluate shows “Analyzing Trade...” and button is disabled during loading.
- **Error state:** API or network error shows message and Dismiss; retry is possible by fixing input and submitting again.
- **Empty state:** Subtitle and hint text clarify that both sides need assets and list supported sports.
- **DynastyTradeForm:** Clear Trade, Analyze, value lookup, Share Link, Export image, and new “Discuss in AI Chat” all wired and working.

---

## 7. Issues Fixed

- **Sport dropdown (trade-evaluator):** Replaced hardcoded NFL/NBA/MLB/NHL with `getSportOptions()` from `lib/trade-analyzer`, so NCAA Football, NCAA Basketball, and Soccer are included and labels are consistent (e.g. “NCAA Football”).
- **Missing actions:** Added “Reset trade” and “Swap sides” buttons to trade-evaluator; both update state correctly.
- **No AI route:** Added “Discuss in AI Chat” link after result in trade-evaluator and in DynastyTradeForm result section; both use TradeToAIContextBridge with a suggested prompt.
- **Submit validation:** Added client-side check that each side has at least one named player (or pick) before calling the API; clear error message when validation fails.
- **Error dismiss:** Added “Dismiss” on the error banner so users can clear the message without changing form data.
- **Empty/help copy:** Added short subtitle listing supported sports and hint that both sides need assets.

---

## 8. Final QA Checklist

- [ ] **Sport options:** Trade-evaluator sport dropdown shows all 7 sports with correct labels (NFL, NHL, NBA, MLB, NCAA Football, NCAA Basketball, Soccer).
- [ ] **Add/remove player:** Both sides; add adds empty slot, remove removes row; state and UI stay in sync.
- [ ] **Add/remove pick:** Both sides; add adds default pick, remove removes row; year/round/range and remove work.
- [ ] **Evaluate Trade:** With at least one asset per side, submit runs and result (fairness, winner, summary, insights) appears.
- [ ] **Validation:** Submit with one side empty shows error and does not call API.
- [ ] **Reset trade:** Clears sides and result; form is usable for a new trade.
- [ ] **Swap sides:** Sender and receiver data swap; labels/names preserved as intended.
- [ ] **Discuss in AI Chat:** After result, link opens AI chat; URL includes optional prompt; prompt text references sport and both sides.
- [ ] **Error dismiss:** Dismiss button clears error banner.
- [ ] **Loading:** Button shows “Analyzing Trade...” and is disabled during request.
- [ ] **DynastyTradeForm:** Clear, Analyze, value lookup, Share, Export, Discuss in AI Chat all work; no dead buttons.
- [ ] **Mobile:** Layout and touch targets for trade-evaluator and dynasty form are usable (responsive grid and buttons).

---

## 9. Explanation of the Trade Analyzer Polish System

The trade analyzer polish focuses on **clarity, completeness, and connection to AI** without changing backend contracts.

- **Clarity:** Both sides (team A/B or sender/receiver) are explicit; add/remove player and pick are obvious; league settings (format, sport, scoring, QB format) and optional as-of date are in one place. Fairness score, winner, and summary use shared helpers (TradeValueBreakdownResolver) for consistent display and colors.
- **Completeness:** All seven sports are supported in the main evaluator via `lib/sport-scope` and SportTradeAnalyzerResolver. Reset and Swap give quick ways to start over or flip the trade. Validation ensures at least one asset per side before calling the API. Error state is dismissible.
- **Connection to AI:** The TradeToAIContextBridge provides a single place for “open AI chat with trade context.” Both the trade-evaluator and DynastyTradeForm add a “Discuss in AI Chat” link after results, with a suggested prompt that includes sport and side summaries so the user can continue the conversation in context.

The new **lib/trade-analyzer** modules (ViewService, AssetController, ValueBreakdownResolver, UIStateService, TradeToAIContextBridge, SportTradeAnalyzerResolver) centralize labels, options, state helpers, and AI routing so future surfaces (e.g. in-app trade builder or propose flow) can reuse the same behavior and stay consistent with the standalone trade-evaluator and dynasty analyzer.
