# PROMPT 355 — Zombie League AI Layer Deliverable

## Summary

AI layer for AllFantasy Zombie leagues: **deterministic logic first**; AI is used only for strategy guidance, narration, and explanation. No AI decides infection, serum/weapon/ambush legality, promotion/relegation, trade legality, or dangerous-drop enforcement.

---

## Determinism Rules (Binding)

The following are **rules-driven only**; AI must never decide or override:

- Infection outcomes
- Serum legality / timing (rules)
- Weapon legality / timing (rules)
- Ambush legality (rules)
- Promotion / relegation (movement engine)
- Trade legality / zombie trade blocks (rules)
- Dangerous drop enforcement (deterministic flags)

AI only **explains**, **narrates**, and **suggests** strategy. All prompts include a DETERMINISM_RULES block enforcing this.

---

## AI Routes and Types

### League AI

- **Route:** `POST /api/leagues/[leagueId]/zombie/ai`
- **Body:** `{ type: ZombieAIType, week?: number }`
- **Auth:** Session required; user must have draft access to the league; league must be a zombie league.
- **Entitlement:** `zombie_ai` (fallback `ai_chat`). When `ALLOW_WHEN_ENTITLEMENTS_OPEN === true` (default), the route does not block on entitlement for dev; when enforced, returns 403 "Premium feature" if no access.
- **Response:** `{ deterministic, narrative, model, type }`. `deterministic` is a safe subset of context (whisperer, survivors, zombies, movement watch, my resources, chompin block, collusion/dangerous drop flags) for the client to show **before** the AI narrative.

**Valid types (ZombieAIType):**

| Type | Description |
|------|-------------|
| `survival_strategy` | Survivor strategy guidance |
| `zombie_strategy` | Zombie strategy guidance |
| `whisperer_strategy` | Whisperer strategy guidance |
| `serum_timing_advice` | Serum timing advice |
| `weapon_timing_advice` | Weapon timing advice |
| `ambush_planning_advice` | Ambush planning advice |
| `stay_alive_framing` | "Stay alive vs risk zombie" framing |
| `lineup_zombie_context` | Lineup advice with zombie context |
| `weekly_zombie_recap` | Weekly zombie recap |
| `most_at_risk` | Who is most at risk |
| `chompin_block_explanation` | "On the Chompin' Block" explanation |
| `serum_weapon_holders_commentary` | Top serum/weapon holders commentary |
| `whisperer_pressure_summary` | Whisperer pressure summary |
| `commissioner_review_summary` | Summarize deterministic red flags; commissioner review priority (collusion + dangerous drop flags) |

### Universe AI

- **Route:** `POST /api/zombie-universe/[universeId]/ai`
- **Body:** `{ type: ZombieUniverseAIType }`
- **Auth:** Session required; universe must exist.
- **Entitlement:** Same as league (`zombie_ai` / `ai_chat`); `ALLOW_WHEN_ENTITLEMENTS_OPEN` applies.
- **Response:** `{ deterministic, narrative, model, type }`. `deterministic` includes universeId, sport, standings sample, movement projections, roster display names.

**Valid types (ZombieUniverseAIType):**

| Type | Description |
|------|-------------|
| `promotion_relegation_outlook` | Promotion/relegation outlook (narrative only) |
| `level_storylines` | Alpha/Beta/Gamma storylines |
| `top_survivor_runs` | Top survivor runs |
| `fastest_spread_analysis` | Fastest spread analysis |
| `league_health_summary` | League health summary |
| `commissioner_anomaly_summary` | Commissioner anomaly summary |

---

## Backend Files

| Path | Purpose |
|------|---------|
| `lib/subscription/types.ts` | `zombie_ai` in `SubscriptionFeatureId` |
| `lib/zombie/ai/ZombieAIContext.ts` | League + universe deterministic context builders; types `ZombieAIType`, `ZombieUniverseAIType` |
| `lib/zombie/ai/ZombieAIPrompts.ts` | Prompt builders with DETERMINISM_RULES; league and universe prompts |
| `lib/zombie/ai/ZombieAIService.ts` | `generateZombieAI`, `generateZombieUniverseAI` (OpenAI gpt-4o-mini) |
| `app/api/leagues/[leagueId]/zombie/ai/route.ts` | League Zombie AI POST handler; entitlement + context + generate |
| `app/api/zombie-universe/[universeId]/ai/route.ts` | Universe Zombie AI POST handler |

---

## Frontend Integration

| Location | What |
|----------|------|
| **League Zombie UI** | `components/zombie/ZombieAIPanel.tsx` — Topic dropdown aligned with full `ZombieAIType` list; **deterministic summary** (whisperer, survivors, zombies, my resources, Chompin' Block, movement watch, collusion/dangerous drop flag counts) shown **before** the AI narrative block; Generate button only when `useEntitlement('zombie_ai')` has access. |
| **Universe home** | `app/app/zombie-universe/[universeId]/page.tsx` — New **AI** tab; `ZombieUniverseAIPanel` with type selector and Generate; deterministic summary (standings sample, movement count) shown before AI narrative; same entitlement gating. |
| **Universe AI component** | `components/zombie/ZombieUniverseAIPanel.tsx` — Calls `POST /api/zombie-universe/[universeId]/ai`; shows deterministic data then narrative. |

---

## Monetization Gates

- **Feature id:** `zombie_ai` in subscription types and in `useEntitlement('zombie_ai')`.
- **Server:** League and universe AI routes call `hasZombieAIAccess(userId)` when `ALLOW_WHEN_ENTITLEMENTS_OPEN === false`; otherwise 403 "Premium feature".
- **Client:** Both panels check `hasAccess` from `useEntitlement('zombie_ai')`; topic selector and Generate are only rendered when `hasAccess` is true. No premium button is shown without gating; upsell message shown when no access.
- **Fallback:** Server-side entitlement check can fall back to `ai_chat` if `zombie_ai` is not yet wired in Stripe.

---

## QA Checklist

- [ ] **AI zombie tools open correctly** — League: Zombie AI panel opens in league zombie view. Universe: AI tab opens on universe home.
- [ ] **Deterministic data before AI** — After Generate, "Deterministic data (rules-driven)" block appears above "AI narrative" in both league and universe panels.
- [ ] **No AI without gating** — Generate (and topic dropdown) are hidden when user does not have `zombie_ai` (or fallback) access; upsell message visible.
- [ ] **No hallucinated legal outcomes** — AI responses never state who "will be" infected, or that a serum/weapon/ambush use "is legal/illegal," or that a roster "will be promoted/relegated"; only strategy and interpretation of provided data.
- [ ] **No AI-generated result overrides** — No part of the AI response is passed into infection, serum, weapon, ambush, movement, or trade engines; narrative is display-only.
- [ ] **No dead premium buttons** — When user has access, Generate works and returns narrative; when user does not, no Generate button is shown (no dead click).
- [ ] **Commissioner review summary** — League type `commissioner_review_summary` returns narrative that only summarizes deterministic collusion and dangerous drop flags and suggests review order; no AI-decided outcomes.
- [ ] **Universe AI** — All six universe types return narrative; deterministic payload (standings sample, movement) is returned and displayed.

---

## Optional Follow-ups

- **Chimmy / chat:** If Zombie league chat should support "@Chimmy zombie strategy," inject Zombie deterministic context into the Chimmy route and return only narrative (no engine actions).
- **Token deduction:** If Zombie AI should consume tokens, add balance check and deduct in league and universe AI routes after entitlement, reusing existing token/balance patterns.
