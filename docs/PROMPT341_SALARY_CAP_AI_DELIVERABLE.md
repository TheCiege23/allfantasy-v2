# PROMPT 341 — Salary Cap League AI Layer Deliverable

## Policy

- **Deterministic first:** Cap legality, contract expiration, bid legality, lottery execution, and best ball scoring are never computed by AI. They are computed by the salary-cap engine only.
- **AI role:** Explanation, strategic guidance, and scenario planning only. All prompts receive deterministic context and are instructed not to invent cap/contract data.

---

## File summary

| Label    | Relative path |
|----------|----------------|
| [UPDATED]| `lib/subscription/types.ts` — added `salary_cap_ai` to `SubscriptionFeatureId` |
| [NEW]    | `lib/salary-cap/ai/SalaryCapAIContext.ts` |
| [NEW]    | `lib/salary-cap/ai/SalaryCapAIPrompts.ts` |
| [NEW]    | `lib/salary-cap/ai/SalaryCapAIService.ts` |
| [NEW]    | `lib/salary-cap/ai/index.ts` |
| [NEW]    | `app/api/leagues/[leagueId]/salary-cap/ai/route.ts` |
| [UPDATED]| `lib/salary-cap/index.ts` — export `./ai` |
| [UPDATED]| `components/salary-cap/SalaryCapAIPanel.tsx` — type selector, deterministic block, gated button, result display |

---

## AI routes / services

- **POST /api/leagues/[leagueId]/salary-cap/ai**  
  Body: `{ type: SalaryCapAIContextType }`.  
  Builds deterministic context via `buildSalaryCapAIContext({ leagueId, userId, type })`, then calls `generateSalaryCapAI(ctx, type)`.  
  Returns: `{ deterministic, explanation, model, type }`.  
  **Entitlement:** `salary_cap_ai` or fallback `ai_chat`. When `ALLOW_WHEN_ENTITLEMENTS_OPEN` is true, the route does not block when the entitlements API returns no access (for development). When subscription is enforced, set `ALLOW_WHEN_ENTITLEMENTS_OPEN = false` and ensure paying users have `salary_cap_ai` or `ai_chat` in the entitlements API.

- **Context (deterministic only):** Config, ledger, future projection, contracts, expiring/extension/tag counts, dead money, recent events, lottery if enabled. No LLM in context building.

- **Prompt types:** `startup_auction` (cap allocation, nomination, bidding discipline, stars-and-scrubs vs balanced, contract length), `cap_health` (cap health review, priorities), `extension_tag` (extension/tag recommendations, cut consequences), `trade_cap` (trade cap impact, contender vs rebuilder), `bestball` (roster construction, spike/floor, fragility, future cap risk), `offseason_planning` (2–5 year, title window, rookie planning, lottery, conserve vs push), `orphan_takeover` (takeover plan, cap cleanup, staged rebuild).

---

## UI integration

- **SalaryCapAIPanel** (inside Salary Cap Overview → AI Tools view):
  - Shows **deterministic data first** (cap space, committed, dead money, contract counts, expiring, extension candidates, future years) from the existing summary prop.
  - **Type selector:** Seven buttons for the AI types above.
  - **“Get AI advice: [type]”** button: **gated** by `useEntitlement('salary_cap_ai')`; disabled when `!hasAccess('salary_cap_ai')`.
  - On success: displays AI explanation in a separate block. Response includes server-returned deterministic summary; the UI does not send or display hallucinated cap/contract numbers.
  - Link to “More AI tools (Intelligence tab)” for other AI features.

---

## Monetization gate notes

- **Feature ID:** `salary_cap_ai` (in `lib/subscription/types.ts`).
- **Server:** `app/api/leagues/[leagueId]/salary-cap/ai/route.ts` checks `hasSalaryCapAIAccess(userId)` when `ALLOW_WHEN_ENTITLEMENTS_OPEN` is false. Today the entitlements API returns `hasAccess: false` for all; the route uses `ALLOW_WHEN_ENTITLEMENTS_OPEN = true` so the POST succeeds for development. When going live, set `ALLOW_WHEN_ENTITLEMENTS_OPEN = false` and have the entitlements API return `hasAccess: true` for users with a plan that includes `salary_cap_ai` (or `ai_chat` as fallback).
- **Client:** `SalaryCapAIPanel` uses `useEntitlement('salary_cap_ai')` and disables the “Get AI advice” button when `!hasAccess('salary_cap_ai')`. No AI request is sent when the button is disabled. When the backend allows requests (e.g. during dev), the button can be enabled by returning `hasAccess: true` for `salary_cap_ai` from the entitlements API.
- **Token usage:** Each successful POST consumes LLM tokens (e.g. gpt-4o, max_tokens 600). Rate limiting and subscription checks should be applied per your existing monetization and token logic.

---

## QA checklist (mandatory)

- [ ] **AI salary-cap tools open correctly** — From Salary Cap league Overview → AI Tools view, the panel loads with deterministic block, type selector, and “Get AI advice” button.
- [ ] **Deterministic cap data is shown before AI** — The “Deterministic data (from league engine)” block is always visible with cap space, committed, dead money, contract counts; AI explanation appears only after a successful request.
- [ ] **No AI button works without correct gating** — When entitlements API returns `hasAccess: false` for `salary_cap_ai`, the “Get AI advice” button is disabled and the “Upgrade to access Salary Cap AI” message is shown; no POST is sent when disabled.
- [ ] **No hallucinated contract/cap data** — Prompts instruct the model to use only provided context; the API returns the same deterministic snapshot that was used for the prompt; the UI never displays cap/contract numbers from the AI text as authoritative (only the engine data is authoritative).
- [ ] **AI does not override deterministic rules** — No prompt asks the model to compute cap legality, expiration, bid validity, lottery order, or best ball lineup; the route and context builder do not use AI output for any state or validation.

---

*End of PROMPT 341 deliverable.*
