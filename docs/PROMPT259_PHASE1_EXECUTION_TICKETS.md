# PROMPT 259 — Phase 1 Execution Tickets

## Purpose

This ticket pack converts `docs/PROMPT259_SUBSCRIPTION_VS_TOKEN_ACCESS_POLICY.md` into implementation-ready work items for the first delivery wave.

Scope in this document:

- policy-lane enforcement foundation (`unlimited_light`, `quota_then_tokens`, `token_only_heavy`)
- monthly included quota baseline
- lane-aware API and UI behavior
- heavy-action cost protection
- click-audit and regression coverage

This phase should preserve existing monetization contracts while introducing lane-aware behavior incrementally.

## Non-Negotiable Constraints

- All sports-related behavior must remain valid across NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
- No gambling, no DFS, no sportsbook semantics.
- No in-app dues/payout handling; FanCred boundary remains unchanged.
- Deterministic-first AI posture remains unchanged.
- No dead premium buttons, dead gate modals, or unhandled token confirmation states.

## Delivery Model

- Ship behind feature flag (suggested: `feature_subscription_token_policy_v1`).
- Land in small PRs (1-2 tickets per PR) to reduce entitlement regression risk.
- Keep API response contracts backward compatible where currently consumed by existing clients.

---

## Epic A — Canonical Policy Lane Layer

### Ticket A1 — Add lane classification to token pricing policy resolver

- **Type:** backend/shared
- **Priority:** P0
- **Depends on:** none
- **Touch:**
  - `lib/tokens/subscription-policy.ts`
  - `lib/tokens/pricing-matrix.ts`
- **Goal:** classify each spend rule into `unlimited_light`, `quota_then_tokens`, or `token_only_heavy`.
- **Acceptance criteria:**
  - Resolver returns lane in decision payload.
  - Existing decision fields remain compatible.
  - Default lane assignment uses pricing tier unless explicit override is provided.

### Ticket A2 — Add explicit lane override map for feature exceptions

- **Type:** backend/shared config
- **Priority:** P1
- **Depends on:** A1
- **Create/Touch:**
  - `lib/tokens/subscription-policy.ts` (or dedicated policy map module)
- **Goal:** allow product-driven exceptions where lane differs from default tier behavior.
- **Acceptance criteria:**
  - Exception map supports rule-level override without changing pricing matrix costs.
  - Policy unit tests cover default + override behavior.

---

## Epic B — Monthly Included Quota Baseline

### Ticket B1 — Introduce monthly quota ledger model + resolver

- **Type:** backend + schema
- **Priority:** P0
- **Depends on:** A1
- **Touch:**
  - `prisma/schema.prisma`
  - new migration under `prisma/migrations/*`
  - new resolver/service in `lib/tokens/*`
- **Goal:** persist included monthly usage counters by user, plan scope, billing window.
- **Acceptance criteria:**
  - Can read/write quota state by user and scope.
  - Quota window is billing-cycle aligned.
  - No quota rollover behavior in v1.

### Ticket B2 — Quota consumption utility (before token spend)

- **Type:** backend
- **Priority:** P0
- **Depends on:** B1
- **Touch:**
  - `lib/tokens/TokenSpendService.ts`
  - `lib/tokens/subscription-policy.ts`
- **Goal:** consume included quota first for `quota_then_tokens` actions; only token-charge after quota depletion.
- **Acceptance criteria:**
  - Lane B action decrements quota when available.
  - Token spend occurs only after quota reaches zero.
  - Decision payload returns remaining quota and charge path used.

### Ticket B3 — Quota reset and reconciliation job contract

- **Type:** backend ops
- **Priority:** P1
- **Depends on:** B1
- **Create:**
  - reset/reconciliation module in `lib/tokens/*`
- **Goal:** ensure monthly quotas reset safely and are auditable.
- **Acceptance criteria:**
  - Reset logic is idempotent.
  - Reconciliation can rebuild current quota from ledger where needed.

---

## Epic C — Lane-Aware Entitlement and API Enforcement

### Ticket C1 — Extend entitlement middleware for lane-aware responses

- **Type:** backend
- **Priority:** P0
- **Depends on:** A1, B2
- **Touch:**
  - `lib/subscription/entitlement-middleware.ts`
- **Goal:** return lane metadata, remaining quota (if applicable), and effective token cost in gating responses.
- **Acceptance criteria:**
  - 403/409/402 responses include lane context for UI messaging.
  - Token confirmation path remains intact.
  - Refund behavior remains unchanged for post-spend failures.

### Ticket C2 — Apply lane-aware enforcement to key premium APIs

- **Type:** backend API
- **Priority:** P0
- **Depends on:** C1
- **Touch (minimum):**
  - `app/api/ai/chat/route.ts`
  - `app/api/trade-analyzer/ai/route.ts`
  - `app/api/waiver-ai/engine/route.ts`
  - `app/api/draft/recommend/route.ts`
  - `app/api/player-comparison/insight/route.ts`
  - `app/api/commissioner/leagues/[leagueId]/managers/assign-ai/route.ts`
  - `app/api/leagues/[leagueId]/ai-commissioner/run/route.ts`
  - `app/api/leagues/[leagueId]/ai-commissioner/chat/route.ts`
- **Acceptance criteria:**
  - Lane A actions do not token-charge entitled users.
  - Lane B actions use quota then tokens.
  - Lane C actions always require token confirmation and charge.

### Ticket C3 — Subscription status edge handling hardening

- **Type:** backend
- **Priority:** P1
- **Depends on:** C1
- **Touch:**
  - `lib/subscription/SubscriptionStatusResolver.ts`
  - `lib/tokens/subscription-policy.ts`
- **Goal:** guarantee `active/grace` vs `past_due/expired` behavior is deterministic across all gate paths.
- **Acceptance criteria:**
  - `grace` retains plan benefits.
  - `past_due` and `expired` lose included benefits but respect configured token fallback rules.

---

## Epic D — Frontend UX and Copy Integration

### Ticket D1 — Lane-aware locked card and preflight messaging

- **Type:** frontend
- **Priority:** P0
- **Depends on:** C1
- **Touch:**
  - `components/subscription/LockedFeatureCard.tsx`
  - `components/subscription/FeatureGate.tsx`
  - `lib/tokens/client-confirm.ts`
- **Goal:** show policy-aligned wording for lane type, quota remaining, and token confirmation.
- **Acceptance criteria:**
  - UI copy uses standardized labels from PROMPT 259 policy.
  - Upgrade CTA routing remains correct.
  - Token fallback CTA includes rule-context routing.

### Ticket D2 — Lane-aware behavior in draft and commissioner premium surfaces

- **Type:** frontend
- **Priority:** P1
- **Depends on:** D1, C2
- **Touch (minimum):**
  - `components/app/draft-room/DraftRoomPageClient.tsx`
  - `components/app/draft-room/DraftHelperPanel.tsx`
  - `components/app/commissioner/AICommissionerPanel.tsx`
  - `components/app/settings/CommissionerControlsPanel.tsx`
- **Acceptance criteria:**
  - Heavy commissioner/draft runs display explicit token-powered confirmation.
  - Control-plane surfaces without token fallback remain correctly locked.
  - No dead controls in mobile or desktop views.

### Ticket D3 — Token center visibility for policy transparency

- **Type:** frontend
- **Priority:** P1
- **Depends on:** B2
- **Touch:**
  - `app/tokens/*`
  - `components/tokens/*`
- **Goal:** expose included usage, remaining quota, and projected token overage clearly.
- **Acceptance criteria:**
  - User can see included usage vs token usage split.
  - Pricing matrix still renders and filters correctly.

---

## Epic E — Heavy-Action Cost Protection and Abuse Controls

### Ticket E1 — Commissioner heavy-action multiplier hook

- **Type:** backend
- **Priority:** P1
- **Depends on:** A1
- **Touch:**
  - `lib/tokens/pricing-matrix.ts`
  - `lib/tokens/TokenSpendService.ts`
  - commissioner heavy endpoints
- **Goal:** support optional workload multipliers (league size, analysis depth, historical range).
- **Acceptance criteria:**
  - Multiplier logic is deterministic and auditable.
  - Effective token cost is returned preflight before confirmation.

### Ticket E2 — Idempotent spend + refund hardening for heavy runs

- **Type:** backend reliability
- **Priority:** P0
- **Depends on:** C2
- **Touch:**
  - `lib/tokens/TokenSpendService.ts`
  - heavy API handlers
- **Goal:** prevent duplicate charges and guarantee recoverable refunds on execution failures.
- **Acceptance criteria:**
  - Duplicate retry does not double-charge.
  - Failure after spend issues exactly one refund path.

---

## Epic F — Testing, Click Audit, and QA Gates

### Ticket F1 — Policy lane unit tests

- **Type:** unit
- **Priority:** P0
- **Depends on:** A1, A2, B2
- **Create/Touch:**
  - `__tests__/token-pricing-matrix-policy.test.ts`
  - new policy lane tests under `__tests__/*policy*.test.ts`
- **Coverage:**
  - lane derivation default and overrides
  - quota-first then token spend behavior
  - status transitions and bundle inheritance

### Ticket F2 — API contract tests for lane-aware gating

- **Type:** unit/integration
- **Priority:** P0
- **Depends on:** C2
- **Touch (minimum):**
  - `__tests__/trade-analyzer-ai-route-contract.test.ts`
  - `__tests__/waiver-ai-engine-route-contract.test.ts`
  - `__tests__/player-comparison-insight-route-contract.test.ts`
  - `__tests__/draft-recommend-feature-gate-route-contract.test.ts`
- **Coverage:**
  - Lane A no-token path
  - Lane B quota and overage path
  - Lane C token-required path
  - refund path on execution failure

### Ticket F3 — Click audit expansion for lane UX

- **Type:** e2e
- **Priority:** P0
- **Depends on:** D1, D2, D3
- **Touch (minimum):**
  - `e2e/subscription-entitlement-click-audit.spec.ts`
  - `e2e/token-system-click-audit.spec.ts`
  - `e2e/draft-room-click-audit.spec.ts`
  - `e2e/ai-commissioner-click-audit.spec.ts`
- **Coverage requirements:**
  - locked message visibility and correctness
  - upgrade CTA routing
  - token fallback routing
  - lane B quota decrement and overage prompt
  - lane C heavy confirmation + refund messaging
  - no dead buttons/modals on mobile and desktop

### Ticket F4 — Supported-sports QA matrix

- **Type:** QA
- **Priority:** P1
- **Depends on:** C2, D2
- **Goal:** validate gating and lane behavior across all supported sports.
- **Coverage:**
  - NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER
  - at least one Pro, Commissioner, War Room gated action per sport
  - verify no sport silently falls back to single-sport assumptions

---

## Implementation Order (Recommended)

1. A1 -> A2
2. B1 -> B2 -> B3
3. C1 -> C2 -> C3
4. D1 -> D2 -> D3
5. E1 + E2
6. F1 -> F2 -> F3 -> F4

Parallelization:

- D1 can start once C1 response shape is stable.
- F1 can run in parallel with D1 once A1/B2 behavior contracts are finalized.
- F3 can start as soon as D1 and key lane paths are wired.

---

## PR Plan

- **PR-1:** A1, A2
- **PR-2:** B1, B2
- **PR-3:** C1, C2, C3
- **PR-4:** D1, D2, D3
- **PR-5:** E1, E2
- **PR-6:** F1, F2, F3, F4

Each PR must include:

- lane-specific click-audit updates for touched surfaces
- explicit regression note for subscription + token coexistence behavior
- confirmation that all seven supported sports remain covered for touched logic
- confirmation that no FanCred boundary regressions were introduced

---

## Definition of Done (PROMPT 259 Phase 1)

- Lane policy is canonical and enforceable in resolver + middleware.
- Monthly included quota works for moderate actions before token overage.
- Heavy actions are reliably token-confirmed and refund-safe on failure.
- Frontend copy and CTAs reflect lane policy with no dead interactions.
- Test suite and click audits validate lock, upgrade, token fallback, quota, heavy-confirm, and refund flows.
- Behavior remains consistent across NFL, NHL, NBA, MLB, NCAAB, NCAAF, and SOCCER.

