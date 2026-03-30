# PROMPT 251 — Phase 1 Execution Tickets

## Purpose

This ticket pack converts `docs/PROMPT251_MONETIZATION_ARCHITECTURE_RESET.md` into implementation-ready work items.

Scope in this document:

- Phase 0 compliance lock
- Phase 1 catalog + Stripe mapping
- Phase 1.5 checkout orchestration endpoints
- Phase 1.75 webhook safety baseline
- QA and release gates for the above

This ticket pack intentionally does **not** include full subscription persistence or token ledger persistence yet (those remain Phase 2/3).

## Non-Negotiable Business Constraints

- No gambling, no DFS, no sportsbook semantics.
- No in-app league dues collection.
- No in-app payout/winnings/prize settlement.
- Paid league money flow is external via FanCred and commissioner-managed.
- League creation and operation remain free.

## Delivery Model

- Prioritize API and copy hardening before UI expansion.
- Ship behind feature flag where needed (`feature_monetization_reset_phase1` suggested).
- Land in small PRs (1-2 tickets per PR) to reduce blast radius.

---

## Epic A — Compliance Lock + Copy Boundary

### Ticket A1 — Introduce central paid-league boundary copy resolver

- **Type:** backend/frontend shared
- **Priority:** P0
- **Depends on:** none
- **Goal:** single source of truth for FanCred external-payment disclosure copy.
- **Create:**
  - `lib/legal/FanCredBoundaryDisclosure.ts`
- **Expose helpers:**
  - `getFanCredBoundaryDisclosureShort()`
  - `getFanCredBoundaryDisclosureLong()`
  - `getFanCredBoundaryChecklist()`
- **Acceptance criteria:**
  - Copy explicitly states: external dues/payout handling via FanCred.
  - Copy explicitly states: AllFantasy is not payment/payout processor.
  - Copy explicitly states: no gambling/prize payouts in-app.

### Ticket A2 — Apply boundary copy to paid league UX surfaces

- **Type:** frontend
- **Priority:** P0
- **Depends on:** A1
- **Target surfaces (minimum):**
  - league creation paid toggle flow
  - league settings paid mode section
  - league discovery card + join paid badge tooltip
- **Acceptance criteria:**
  - Every paid-league decision point shows boundary disclosure.
  - No dead links/buttons for FanCred setup CTA.
  - Mobile + desktop both show disclosure content.

### Ticket A3 — Route guardrail: reject prohibited in-app dues/payout intents

- **Type:** backend
- **Priority:** P0
- **Depends on:** none
- **Goal:** central policy utility that rejects forbidden transaction intents.
- **Create:**
  - `lib/monetization/compliance-guardrails.ts`
- **Add helper:**
  - `assertNoLeagueSettlementIntent(intent: string, metadata?: Record<string, unknown>)`
- **Acceptance criteria:**
  - Any checkout path attempting `dues`, `payout`, `winnings`, `prize_pool` fails with 4xx policy error.
  - Error payload includes deterministic compliance message for UI.

---

## Epic B — Catalog + Stripe Mapping (Phase 1 Core)

### Ticket B1 — Build monetization catalog module (SKU source of truth)

- **Type:** backend/shared config
- **Priority:** P0
- **Depends on:** A3
- **Create:**
  - `lib/monetization/catalog.ts`
- **Define SKU constants:**
  - `af_pro_monthly`, `af_pro_yearly`
  - `af_commissioner_monthly`, `af_commissioner_yearly`
  - `af_war_room_monthly`, `af_war_room_yearly`
  - `af_all_access_monthly`, `af_all_access_yearly`
  - `af_tokens_5`, `af_tokens_10`, `af_tokens_25`
- **Define price metadata:**
  - amount, currency, interval (if recurring), product type
  - environment key -> Stripe price ID mapping
- **Acceptance criteria:**
  - No hardcoded plan prices remain in runtime checkout logic.
  - Catalog retrieval supports deterministic lookup by SKU.

### Ticket B2 — Public-safe catalog endpoint

- **Type:** backend API
- **Priority:** P1
- **Depends on:** B1
- **Create:**
  - `app/api/monetization/catalog/route.ts`
- **Response contract:**
  - plans and token packs display metadata
  - public-safe Stripe references (no secret material)
  - compliance text snippets (from A1)
- **Acceptance criteria:**
  - Endpoint returns stable typed shape.
  - Supports pricing page and upgrade modals without duplicate constants.

### Ticket B3 — Refactor pricing page to catalog-driven rendering

- **Type:** frontend
- **Priority:** P1
- **Depends on:** B2
- **Touch:**
  - `app/pricing/page.tsx`
- **Acceptance criteria:**
  - Pricing cards render from catalog payload (not hardcoded values).
  - Product set matches PROMPT 251 subscription + token offerings.
  - Includes FanCred boundary statement in pricing footer for paid leagues.

---

## Epic C — Checkout Orchestration Endpoints

### Ticket C1 — Subscription checkout endpoint

- **Type:** backend API
- **Priority:** P0
- **Depends on:** A3, B1
- **Create:**
  - `app/api/monetization/checkout/subscription/route.ts`
- **Request:**
  - `sku` (must be subscription SKU)
  - optional `returnPath`
- **Behavior:**
  - resolve Stripe price from catalog
  - create checkout session in subscription mode
  - attach metadata (`purchaseType=subscription`, `sku`, `userId`)
  - reject prohibited intents via compliance guardrail
- **Acceptance criteria:**
  - Valid SKU returns checkout URL.
  - Invalid SKU returns deterministic 400.
  - No dues/payout-related metadata allowed.

### Ticket C2 — Token pack checkout endpoint

- **Type:** backend API
- **Priority:** P0
- **Depends on:** A3, B1
- **Create:**
  - `app/api/monetization/checkout/tokens/route.ts`
- **Request:**
  - `sku` (must be token pack SKU)
  - optional `returnPath`
- **Behavior:**
  - resolve Stripe price from catalog
  - create payment-mode checkout session
  - attach metadata (`purchaseType=tokens`, `sku`, `tokenAmount`, `userId`)
- **Acceptance criteria:**
  - Returns checkout URL for valid pack.
  - Rejects subscription SKU on token route and vice versa.

### Ticket C3 — UI wiring for checkout launch

- **Type:** frontend
- **Priority:** P1
- **Depends on:** C1, C2, B3
- **Touch:**
  - `app/pricing/page.tsx`
  - relevant upgrade CTA components (e.g. locked feature cards)
- **Acceptance criteria:**
  - Plan CTAs call subscription endpoint.
  - Token CTAs call token endpoint.
  - Failure states show actionable message and never dead-end.

---

## Epic D — Webhook Safety Baseline (without full phase-2 persistence)

### Ticket D1 — Unify webhook event routing by purchase type metadata

- **Type:** backend
- **Priority:** P0
- **Depends on:** C1, C2
- **Touch:**
  - `app/api/stripe/webhook/route.ts`
- **Behavior:**
  - route `checkout.session.completed` by `purchaseType` metadata
  - supported values: `subscription`, `tokens`, legacy bracket/donate transitional values
  - ignore unknown purchaseType with audit log
- **Acceptance criteria:**
  - Webhook handler is idempotent-ready and event-type segmented.
  - No payout/dues logic path exists.

### Ticket D2 — Add processed-event idempotency ledger

- **Type:** backend + schema
- **Priority:** P1
- **Depends on:** D1
- **Create model:**
  - `StripeWebhookEvent` (`eventId` unique, `type`, `processedAt`, `status`, `error`)
- **Acceptance criteria:**
  - Duplicate Stripe events are safe no-ops.
  - Errors are persisted for replay/inspection.

---

## Epic E — API Contract Stabilization for Entitlements/Tokens (Phase 1 bridge)

### Ticket E1 — Upgrade `/api/subscription/entitlements` to resolver-based shape

- **Type:** backend
- **Priority:** P1
- **Depends on:** B1
- **Touch:**
  - `app/api/subscription/entitlements/route.ts`
- **Goal:** keep current shape but move to resolver abstraction, even if DB still transitional.
- **Acceptance criteria:**
  - response shape remains stable for `useEntitlement`.
  - no hardcoded ad hoc feature checks in route body.

### Ticket E2 — Upgrade `/api/tokens/balance` to resolver abstraction

- **Type:** backend
- **Priority:** P1
- **Depends on:** B1
- **Touch:**
  - `app/api/tokens/balance/route.ts`
- **Goal:** keep stable response while introducing `TokenBalanceResolver`.
- **Acceptance criteria:**
  - existing `useTokenBalance` continues working.
  - route is ready to swap in persisted token account later without API break.

---

## Epic F — QA, Click Audit, and Compliance Tests

### Ticket F1 — Monetization checkout click audit spec

- **Type:** e2e
- **Priority:** P0
- **Depends on:** C3
- **Create:**
  - `e2e/monetization-checkout-click-audit.spec.ts`
- **Coverage:**
  - subscription checkout CTA dispatch
  - token pack checkout CTA dispatch
  - error fallback messaging
  - mobile/desktop CTA behavior

### Ticket F2 — FanCred boundary disclosure click audit spec

- **Type:** e2e
- **Priority:** P0
- **Depends on:** A2
- **Create:**
  - `e2e/fancred-boundary-disclosure-click-audit.spec.ts`
- **Coverage:**
  - paid league toggle shows disclosure
  - league settings paid mode shows disclosure
  - discovery/join paid league badges show disclosure
  - no dead FanCred setup actions

### Ticket F3 — Compliance regression tests (API policy)

- **Type:** unit/integration
- **Priority:** P0
- **Depends on:** A3, C1, C2
- **Create tests for:**
  - prohibited intents (`dues`, `payout`, `prize_pool`) rejected
  - allowed intents (`subscription`, `tokens`) accepted
  - webhook unknown purchaseType safe handling

---

## Implementation Order (Recommended)

1. A1 -> A3
2. B1 -> B2 -> B3
3. C1 + C2 -> C3
4. D1 -> D2
5. E1 + E2
6. F1 + F2 + F3

Parallelization:

- A2 can run in parallel with B1 once A1 is done.
- F3 can begin as soon as A3 and C1/C2 contracts are stable.

---

## PR Plan

- **PR-1:** A1, A3, B1
- **PR-2:** B2, B3, A2
- **PR-3:** C1, C2, C3
- **PR-4:** D1, D2, E1, E2
- **PR-5:** F1, F2, F3

Each PR must include:

- click-audit updates for touched interactive surfaces
- legal/compliance wording review where user-facing copy changes
- explicit note confirming no in-app dues/payout behavior introduced

---

## Definition of Done (Phase 1 Pack)

- Catalog-driven plan/token pricing is live.
- Stripe checkout flows exist for subscription and token packs only.
- Paid-league surfaces display FanCred boundary disclosure copy.
- Guardrails reject prohibited in-app dues/payout intents.
- Entitlement/token balance APIs remain stable and resolver-based.
- E2E and compliance tests pass for checkout + disclosure + guardrails.
