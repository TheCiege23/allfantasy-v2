# PROMPT 348 — Survivor League AI Layer Deliverable

## Principle: Deterministic logic first

AI **never** decides or asserts:

- Who is eliminated
- Whether a vote counted or is valid
- Whether an idol transfer or play is valid
- Who earned immunity
- Whether someone returned from Exile

Those are **rules-driven** (Survivor engine: vote engine, council service, idol registry, exile/return engine). AI only **narrates**, **explains**, and **suggests** (including official command wording). All prompts include the same determinism rules block.

---

## Backend (AI routes / services)

### New files

| Path | Description |
|------|-------------|
| `lib/survivor/ai/SurvivorAIContext.ts` | Builds deterministic context (tribes, council, challenges, jury, exile tokens, voted-out history, merge, config, roster names, myRosterId, myIdols). No outcome logic. |
| `lib/survivor/ai/SurvivorAIPrompts.ts` | Prompt builders for each type. All include DETERMINISM_RULES. Host: intro, challenge, merge, council, scroll, jury. Helper: tribe_help, idol_help, tribal_help, exile_help, bestball_help. |
| `lib/survivor/ai/SurvivorAIService.ts` | `generateSurvivorAI(ctx, type)` → `{ narrative, model }`. Calls OpenAI with system/user from prompts. |
| `lib/survivor/ai/survivorContextForChimmy.ts` | `buildSurvivorContextForChimmy(leagueId, userId)` → short text summary for Chimmy when user is in a Survivor league. Injected into Chimmy’s user context; Chimmy still never decides outcomes. |

### API route

| Route | Method | Description |
|-------|--------|-------------|
| `app/api/leagues/[leagueId]/survivor/ai` | POST | Body: `{ type: SurvivorAIType, week?: number }`. Returns `{ deterministic, narrative, model, type }`. 404 if not survivor league. 403 if entitlement enforced and user lacks access. |

**Types:** `host_intro` | `host_challenge` | `host_merge` | `host_council` | `host_scroll` | `host_jury` | `tribe_help` | `idol_help` | `tribal_help` | `exile_help` | `bestball_help`

### Chimmy integration

- **File:** `app/api/chat/chimmy/route.ts`
- **Change:** Accept optional `leagueId` in formData. If `leagueId` and `userId`, call `buildSurvivorContextForChimmy(leagueId, userId)` in parallel with other context fetches; append result to `userContextStr`. Add `survivor_league` to `dataSources` when used.
- **Effect:** When the frontend sends `leagueId` (e.g. from league chat), Chimmy receives Survivor league state for grounding. Chimmy still only suggests command wording; the engine processes votes/idols.

---

## Frontend (UI integration)

- **`components/survivor/SurvivorAIPanel.tsx`**
  - Type selector: Host (intro, challenge, merge, council, scroll, jury) and Helper (tribe, idol, tribal, exile, bestball).
  - “Generate” button calls `POST /api/leagues/[leagueId]/survivor/ai` with selected type and current week.
  - Displays `narrative` in a result box. On 403, shows upgrade message (no dead premium button).
  - Links to Chat (with note to pass league for Survivor context) and to Intelligence tab.

- **Chat:** When opening league chat for a Survivor league, the client can send `leagueId` with the Chimmy request so Chimmy gets Survivor context (optional; document for implementers).

---

## Monetization gate notes

- **Feature ID:** `survivor_ai` (added to `SubscriptionFeatureId` in `lib/subscription/types.ts`).
- **Route:** `POST /api/leagues/[leagueId]/survivor/ai` checks entitlement via `hasSurvivorAIAccess(userId)` (tries `survivor_ai`, then `ai_chat`). When `ALLOW_WHEN_ENTITLEMENTS_OPEN === true`, the route does **not** block (same as guillotine); when set to `false`, 403 and message “Upgrade to access Survivor AI.”
- **Frontend:** `useEntitlement('survivor_ai')` used in SurvivorAIPanel. `survivor_ai` is included in the “pro” plan list in `useEntitlement` so when subscription is enforced, pro (or all_access) grants access.
- **Chimmy with leagueId:** Chimmy context injection is **not** gated by Survivor AI entitlement; it only adds context when the user is in a Survivor league. Gating could be added later if Chimmy Survivor-aware answers are premium.

---

## QA checklist

- [ ] **AI host posts** — Generate Host: Intro / Challenge / Merge / Council / Scroll / Jury; narrative renders and does not state who is eliminated or any legal outcome.
- [ ] **AI helper** — Generate Helper: Tribe / Idol / Tribal / Exile / Bestball; narrative renders and does not assert vote counts, elimination, idol validity, immunity, or exile return.
- [ ] **Official command suggestions** — Prompts and Chimmy context state that commands are processed by the engine; AI only suggests wording (e.g. “@Chimmy vote [manager]”). Verify no code path lets AI submit votes or override deterministic validation.
- [ ] **No dead premium buttons** — “Generate” is enabled; on 403 the panel shows upgrade message. No button that does nothing when gated.
- [ ] **No hallucinated legal outcomes** — All prompts include the determinism rules; no prompt asks the model to decide elimination, vote validity, idol validity, immunity, or exile return.
- [ ] **No AI-generated vote overrides** — Vote and idol processing remain in `SurvivorVoteEngine` / `SurvivorTribalCouncilService` / `SurvivorIdolRegistry`; AI route and Chimmy do not call them.
- [ ] **Chimmy with leagueId** — When formData includes `leagueId` for a Survivor league, Chimmy response is grounded in tribe/council/jury/exile context; dataSources includes `survivor_league`.
- [ ] **Supported sports** — Context and prompts use sport from league; no sport-specific outcome logic (NFL, NBA, MLB, NHL, NCAAB, NCAAF, Soccer).

---

## Component / route summary

- **New:** `lib/survivor/ai/SurvivorAIContext.ts`, `SurvivorAIPrompts.ts`, `SurvivorAIService.ts`, `survivorContextForChimmy.ts`
- **New:** `app/api/leagues/[leagueId]/survivor/ai/route.ts`
- **Updated:** `app/api/chat/chimmy/route.ts` (leagueId, Survivor context injection)
- **Updated:** `lib/subscription/types.ts` (survivor_ai), `hooks/useEntitlement.ts` (survivor_ai in pro list)
- **Updated:** `components/survivor/SurvivorAIPanel.tsx` (type selector, Generate, narrative display, 403 handling)
