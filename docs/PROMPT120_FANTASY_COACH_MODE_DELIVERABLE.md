# Prompt 120 — Fantasy Coach Mode (Deliverable)

## Goal

Provide **strategic advice** to users for lineup, trade, and waiver decisions.

---

## Features

- **Lineup advice**: Start/sit and flex guidance (projections, matchups, floor/ceiling).
- **Trade advice**: Sell high / buy low, need-based targeting, fair value.
- **Waiver advice**: Prioritization, FAAB strategy, handcuffs and stashes.

---

## Core modules

- **StrategyRecommendationEngine** (`lib/fantasy-coach/StrategyRecommendationEngine.ts`)
  - `getStrategyRecommendation(type, context)`: Returns structured `StrategyRecommendation` (summary, bullets, actions, contextSummary) for `lineup`, `trade`, or `waiver`. Context can include leagueId, leagueName, week, teamName.
- **FantasyCoachAI** (`lib/fantasy-coach/FantasyCoachAI.ts`)
  - `getCoachAdvice(type, context)`: Calls the engine, then uses OpenAI to turn the recommendation into natural-language advice. Returns `CoachAdviceResult`: summary, bullets, challenge, tone. Falls back to engine output if AI is unavailable.

---

## API

| Method | Route | Description |
|--------|--------|-------------|
| POST | `/api/coach/advice` | Body: `{ type: 'lineup' | 'trade' | 'waiver', leagueId?, leagueName?, week?, teamName? }`. Returns `CoachAdviceResult`: type, summary, bullets, challenge, tone. |

---

## UI

- **Route**: `/app/coach` (Coach Mode page).
- **Entry**: "Coach Mode" link on app home (`/app`).
- **Coach mode button** (`data-audit="coach-mode-button"`): "Get coach advice" — selects current strategy type and POSTs to `/api/coach/advice`, then shows the result in the strategy panel.
- **Strategy type**: Three options — Lineup advice, Trade advice, Waiver advice (toggle before clicking Get coach advice).
- **Strategy explanation panel** (`data-audit="strategy-explanation-panel"`): After advice is loaded, shows summary, bullet list, and "Your challenge" section.

---

## Mandatory UI click audit

| Element | Expected behavior | Verification |
|--------|-------------------|--------------|
| **Coach mode button** | Clicking "Get coach advice" requests advice for the selected type and displays the result in the strategy explanation panel. | Select a type (e.g. Waiver) → click "Get coach advice" → panel appears with summary, bullets, and challenge. |
| **Strategy explanation panel** | Panel shows the coach response: summary, bullets, and challenge. | After getting advice, panel is visible and content matches the API response (summary, bullets, challenge). |

---

## QA — Verify strategy responses

1. **Lineup**: Select "Lineup advice" → Get coach advice → response mentions starting lineup, projections, matchups, or flex logic.
2. **Trade**: Select "Trade advice" → Get coach advice → response mentions buying/selling, value, or needs-based trading.
3. **Waiver**: Select "Waiver advice" → Get coach advice → response mentions waivers, FAAB, adds/drops, or handcuffs.
4. **Fallback**: With OpenAI disabled or failing, response still shows engine-generated summary and bullets (no blank panel).
5. **Panel visibility**: Strategy explanation panel only appears after a successful advice request; it does not show stale data from a previous type without a new request.

---

## Files added

- `lib/fantasy-coach/types.ts`
- `lib/fantasy-coach/StrategyRecommendationEngine.ts`
- `lib/fantasy-coach/FantasyCoachAI.ts`
- `lib/fantasy-coach/index.ts`
- `app/api/coach/advice/route.ts`
- `app/app/coach/page.tsx`
- `app/app/home/page.tsx` — added "Coach Mode" link.
- `docs/PROMPT120_FANTASY_COACH_MODE_DELIVERABLE.md`
