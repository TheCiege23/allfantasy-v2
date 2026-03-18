# PROMPT 334 — Guillotine AI Layer Deliverable

## 1. Design principles

- **Deterministic first:** Elimination math, standings, roster release, tie-breaking, and waiver execution are **never** done by AI. They are computed by the guillotine engine (PROMPT 332).
- **AI role:** Explanation, strategy, and higher-level guidance only. All prompts receive **deterministic context** (standings, danger tiers, chop events, config) and must not invent or override that data.
- **Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball (NCAAB), NCAA Football (NCAAF), Soccer (from `lib/sport-scope.ts`).

---

## 2. AI features implemented

| Feature | Description | Deterministic source | AI output |
|--------|-------------|----------------------|-----------|
| **Live draft** | Guillotine draft strategy | Config, draft slot order | Value stability over hype, survive-now, bye-week clustering warnings, risk-adjusted picks, fragility score concept |
| **Survival** | Chop-risk and “avoid the chop” | Danger tiers, survival standings, chop events | Chop-risk analysis, survival recommendations, start/sit in survival context, bench fragility, injury-risk survival |
| **Waiver aftermath** | Post-chop waiver AI | Released player IDs, chopped this week, standings | Prioritize by survival impact, FAAB strategy (spend vs conserve), drop-candidate guidance |
| **Recap** | Weekly story | Chop events, danger tiers | “Who was chopped,” “living dangerously,” “escaped the blade,” league survival narrative |
| **Orphan** | AI/empty manager in guillotine | Same as survival | Survival-first bias (no dynasty upside); deterministic first, AI explanation second |

---

## 3. Backend files

| Label | Path | Purpose |
|-------|------|--------|
| [NEW] | `lib/guillotine/ai/GuillotineAIContext.ts` | Build deterministic context for prompts (standings, danger, chop events, config, draft slots, released players). No AI. |
| [NEW] | `lib/guillotine/ai/GuillotineAIPrompts.ts` | System + user prompt builders for draft, survival, waiver, recap, orphan. Sport-aware; instruct AI not to invent data. |
| [NEW] | `lib/guillotine/ai/GuillotineAIService.ts` | Call OpenAI with deterministic context; return explanation/strategy only. |
| [NEW] | `lib/guillotine/ai/index.ts` | Re-exports. |
| [UPDATED] | `lib/guillotine/index.ts` | Exports `./ai`. |
| [NEW] | `app/api/leagues/[leagueId]/guillotine/ai/route.ts` | POST body: `{ type, week?, userRosterId? }`. Returns `{ deterministic, explanation, model, type }`. Auth + guillotine check + entitlement gate. |
| [UPDATED] | `lib/subscription/types.ts` | Added `SubscriptionFeatureId`: `'guillotine_ai'`. |

---

## 4. Frontend files

| Label | Path | Purpose |
|-------|------|--------|
| [NEW] | `components/guillotine/GuillotineAIPanel.tsx` | Shows deterministic data first, type selector (draft/survival/waiver/recap/orphan), gated “Get AI strategy” button, displays explanation. Uses `useEntitlement('guillotine_ai')`. |
| [UPDATED] | `components/guillotine/GuillotineHome.tsx` | Replaces static “Guillotine AI” block with `GuillotineAIPanel` and passes summary as `deterministicSummary`. |
| [UPDATED] | `components/guillotine/index.ts` | Exports `GuillotineAIPanel` and types. |
| [UPDATED] | `components/app/tabs/IntelligenceTab.tsx` | Renders `GuillotineAIPanel` at top; panel fetches summary and hides when league is not guillotine. |

---

## 5. Entitlement gate notes

- **Feature ID:** `guillotine_ai` (added to `SubscriptionFeatureId` in `lib/subscription/types.ts`).
- **Frontend:** `GuillotineAIPanel` uses `useEntitlement('guillotine_ai')`. The “Get AI strategy” button is **disabled** when `!hasAccess`. “Upgrade to access Guillotine AI” is shown when the user does not have access.
- **Backend:** `app/api/leagues/[leagueId]/guillotine/ai/route.ts` includes an entitlement check. Currently `ALLOW_WHEN_ENTITLEMENTS_OPEN = true` so the API does not block when subscription is not yet enforced. When subscription/tokens are wired:
  - Set `ALLOW_WHEN_ENTITLEMENTS_OPEN = false`.
  - Implement server-side resolution of entitlement (e.g. DB or Stripe by `userId` and feature `guillotine_ai` or fallback `ai_chat`). The current `hasGuillotineAIAccess(userId)` fetch to the entitlements API does not carry the user session; replace with a direct server-side lookup.
- **Token/subscription:** Respect existing monetization. Do not expose premium Guillotine AI without entitlement checks. Once entitlements return `hasAccess: true` for `guillotine_ai` (or allowed fallback), the button and API allow use.

---

## 6. UI integration points

- **Guillotine league home (Overview):** `GuillotineHome` renders `GuillotineAIPanel` with `deterministicSummary` from the existing summary API. Deterministic data is shown first; then the gated AI button.
- **Intelligence tab:** First section is `GuillotineAIPanel` with no pre-loaded summary; it fetches `GET .../guillotine/summary`. If the league is not guillotine (404), the panel returns `null`. If guillotine, it shows the same deterministic + gated AI flow.
- **No AI for elimination:** All elimination, standings, and tiebreaker logic remain in the guillotine engine. The AI route only receives deterministic context and returns text; it does not compute or persist any elimination or standings.

---

## 7. QA checklist (mandatory click audit)

- [ ] **AI guillotine tools open:** From Guillotine home, “Get AI strategy” section is visible. From Intelligence tab, Guillotine AI panel appears for a guillotine league.
- [ ] **Deterministic before AI:** Survival standings, danger tiers, and chop events are displayed (or summarized) before any “Get AI strategy” click. Response payload includes `deterministic` and `explanation` separately.
- [ ] **Gating:** With current entitlements (e.g. `hasAccess: false`), “Get AI strategy” is disabled and “Upgrade to access Guillotine AI” is shown. No AI request is sent when the button is disabled.
- [ ] **No dead premium buttons:** When entitlement has access, the button is enabled and triggers POST; explanation is shown. No dead or unresponsive buttons.
- [ ] **No hallucinated data:** Prompts explicitly instruct the model to use only provided data. Spot-check: explanation does not assert specific elimination outcomes or invent standings that contradict the `deterministic` payload.
- [ ] **No AI-generated elimination logic:** API and prompts do not ask the model to compute who is chopped, tiebreakers, or roster release. Elimination remains in `GuillotineEliminationEngine` and related services only.
- [ ] **Draft type:** Choose “Draft strategy”; response discusses stability, bye-week, risk-adjusted picks, fragility.
- [ ] **Survival type:** Choose “Survival & chop-risk”; response references Chop Zone/danger and survival advice.
- [ ] **Waiver type:** Choose “Waiver aftermath”; response references released players and FAAB strategy.
- [ ] **Recap type:** Choose “Weekly recap”; response is narrative (who was chopped, who escaped, etc.).
- [ ] **Non-guillotine league:** Intelligence tab does not show Guillotine AI panel (or panel hides after 404 on summary).

---

## 8. File manifest (full list)

| Label | Relative path |
|-------|----------------|
| [NEW] | lib/guillotine/ai/GuillotineAIContext.ts |
| [NEW] | lib/guillotine/ai/GuillotineAIPrompts.ts |
| [NEW] | lib/guillotine/ai/GuillotineAIService.ts |
| [NEW] | lib/guillotine/ai/index.ts |
| [UPDATED] | lib/guillotine/index.ts |
| [NEW] | app/api/leagues/[leagueId]/guillotine/ai/route.ts |
| [UPDATED] | lib/subscription/types.ts |
| [NEW] | components/guillotine/GuillotineAIPanel.tsx |
| [UPDATED] | components/guillotine/GuillotineHome.tsx |
| [UPDATED] | components/guillotine/index.ts |
| [UPDATED] | components/app/tabs/IntelligenceTab.tsx |
| [NEW] | docs/PROMPT334_GUILLOTINE_AI_DELIVERABLE.md |
