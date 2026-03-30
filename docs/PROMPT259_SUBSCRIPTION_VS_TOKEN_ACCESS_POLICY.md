# PROMPT 259 — Subscription vs Token Access Policy

## Objective

Define the final production policy for how subscriptions and tokens coexist across AllFantasy.

This policy applies platform-wide across supported sports:
- NFL
- NHL
- NBA
- MLB
- NCAAB
- NCAAF
- SOCCER

## Final Recommendation

Adopt **Option D (Hybrid model)** with three clear access lanes:

1. **Unlimited Included (light actions)**  
   In-tier subscribers get unlimited use for low-cost premium interactions.
2. **Included Monthly Quota then Tokens (moderate actions)**  
   Subscribers get monthly included usage budget; additional runs consume tokens.
3. **Token-Only Heavy Actions (high-cost actions)**  
   Heavy compute actions always consume tokens (including subscribers), with subscriber discounts.

This preserves premium plan value while protecting high-variance compute costs.

## Why This Fits AllFantasy

- **User clarity:** users can understand a simple model: unlimited everyday actions, metered advanced runs, token-powered heavy jobs.
- **Conversion:** subscription still has strong value through guaranteed access and included monthly usage.
- **Fairness:** casual users are not penalized; high-usage and league-scale operations are usage-priced.
- **Cost control:** expensive multi-model and league-wide analysis remains bounded.
- **Commissioner economics:** large league analyses (collusion, tanking, full recaps) are token-metered by design.
- **Premium plan appeal:** subscribers receive lower effective token rates and included monthly value.

## Policy Contract (Canonical)

### Lane A — Unlimited Included

Rules:
- Requires the plan entitlement for the feature family (Pro, Commissioner, War Room, or All Access).
- No token spend for qualifying low-cost actions.
- No monthly quota decrement for low-cost actions.

Intended actions:
- Lightweight single-response explainers and in-flow assistant interactions.
- Control-plane premium settings that do not trigger high-cost AI generation.

### Lane B — Included Monthly Quota then Tokens

Rules:
- Requires feature entitlement.
- Action consumes from included monthly quota first.
- If quota is exhausted, action can continue with tokens at that user’s effective rate.
- Show preflight status: remaining included runs and token overage cost.

Intended actions:
- Moderate multi-step recommendations and planning workflows.
- Mid-cost AI explanations with richer context.

### Lane C — Token-Only Heavy Actions

Rules:
- Requires feature entitlement.
- Always token spend, no included-run bypass.
- Must show explicit preflight confirmation and cost.
- Must support refund on execution failure.

Intended actions:
- League-scale commissioner scans and automation cycles.
- Long-horizon or multi-step heavy planning runs.

## Plan Matrix (Policy Layer)

| Plan | Lane A (Unlimited Light) | Lane B (Included Monthly Quota) | Lane C (Heavy Token-Only) | Token Discount |
|---|---:|---:|---:|---:|
| AF Pro | Yes | Yes (Pro scope) | No (unless action in Pro scope) | Yes |
| AF Commissioner | Yes | Yes (Commissioner scope) | Yes (Commissioner scope) | Yes |
| AF War Room | Yes | Yes (War Room scope) | Yes (War Room scope) | Yes |
| All Access | Yes | Yes (all scopes) | Yes (all scopes) | Best discount tier |

Notes:
- All Access inherits all feature families and receives the strongest token economics.
- Non-subscribers remain token-eligible only where fallback is explicitly enabled by product policy.

## Feature Family Mapping

### AF Pro family

- **Lane A (Unlimited Light):**
  - `ai_chat` baseline in-thread messages
  - quick single explainers (`matchup_explanations`, `player_comparison_explanations`, single-step player insights)
- **Lane B (Quota then Tokens):**
  - `trade_analyzer` full review
  - `ai_waivers` one-off enriched recommendations
  - `planning_tools` weekly planning sessions
- **Lane C (Token-Only Heavy):**
  - none currently required in Pro family unless a future heavy Pro action is introduced

### AF Commissioner family

- **Lane A (Unlimited Light):**
  - `advanced_scoring` control surfaces
  - `advanced_playoff_setup` control surfaces
  - lightweight commissioner Q&A (if low-cost mode is selected)
- **Lane B (Quota then Tokens):**
  - `league_rankings` AI explanations
  - `storyline_creation` standard narrative runs
  - `ai_team_managers` moderate recommendation actions
- **Lane C (Token-Only Heavy):**
  - `ai_collusion_detection`
  - `ai_tanking_detection`
  - `commissioner_automation` league-wide cycle runs
  - full league/draft recap workloads and large commissioner analyses

### AF War Room family

- **Lane A (Unlimited Light):**
  - lightweight draft prep assists and quick single pick context
- **Lane B (Quota then Tokens):**
  - `draft_strategy_build` standard sessions
  - `draft_prep` enriched pick explanations and rankings context
- **Lane C (Token-Only Heavy):**
  - `future_planning`
  - `multi_year_strategy`
  - `draft_board_intelligence` heavy multi-step planning
  - `roster_construction_planning` heavy multi-step planning
  - `ai_planning_3_5_year`

## Per-Rule Behavior Table (Execution Contract)

| Rule Type | Entitlement Required | Included Quota Eligible | Token Required | Confirmation Required | Refund on Failure |
|---|---:|---:|---:|---:|---:|
| Light (`tier: low`, `complexity: simple`) | Yes | No | No (in-tier) / fallback only | No | N/A |
| Moderate (`tier: mid`, `complexity: moderate`) | Yes | Yes | Yes after quota | Yes (when token spend) | Yes |
| Heavy (`tier: high`, `complexity: heavy`) | Yes | No | Yes always | Yes | Yes |

Implementation note:
- Existing `tokenFallbackRuleCode` mappings remain source-of-truth for fallback-capable actions.
- Pricing matrix tiers (`low`, `mid`, `high`) should drive default lane assignment unless explicitly overridden.

## Edge-Case Rules

1. **Subscription status transitions**
   - `active` and `grace` receive subscription benefits.
   - `past_due` and `expired` lose included/quota benefits; token fallback only where enabled.

2. **Bundle inheritance**
   - `all_access` inherits Pro + Commissioner + War Room gates and receives best discount profile.

3. **Non-subscriber behavior**
   - May use token fallback only on actions that explicitly support token unlock.
   - No token bypass for persistent control-plane settings (for example, advanced scoring configuration).

4. **Token charge safety**
   - No double-charge on retries (idempotency key required).
   - Automatic refund on downstream execution failure.

5. **Commissioner scale protection**
   - Heavy league-scale actions can apply dynamic token multipliers using league size/workload bands.
   - UI must show estimated cost before execution.

6. **Quota reset**
   - Included monthly quota resets on billing-cycle boundaries.
   - No rollover in v1 policy for simplicity.

## UX Wording Standards

Use these labels consistently in locked cards, modals, tooltips, and confirmation dialogs.

- **Lane A label:** `Included with your plan`
- **Lane B label:** `Included monthly quota, then tokens`
- **Lane C label:** `Token-powered heavy analysis`

### Locked-state copy

- `This feature is part of AF {PlanName}. Upgrade to unlock, or use tokens where available.`

### Quota copy

- `You have {remaining} included runs left this month.`
- `After included runs are used, this action costs {tokenCost} token(s).`

### Heavy action confirmation copy

- `This is a high-compute league-wide analysis.`
- `Run now for {tokenCost} token(s)?`

### Post-run result copy

- Success: `Analysis complete. {tokenCost} token(s) used.`
- Failure with refund: `Run failed. Your token spend was automatically refunded.`

## Rollout Plan (Execution Tickets)

### Ticket 1 — Policy resolver upgrade

- Add policy lane classification (`unlimited_light`, `quota_then_tokens`, `token_only_heavy`) to token charge decision.
- Preserve existing feature gate matrix and pricing matrix compatibility.

### Ticket 2 — Monthly quota ledger

- Add usage counters per user, plan scope, and billing cycle.
- Consume quota before token spend for Lane B actions.

### Ticket 3 — Lane-aware gating middleware

- Extend entitlement middleware response with:
  - lane
  - remaining quota (if applicable)
  - effective token cost
- Keep existing token confirmation and refund semantics.

### Ticket 4 — UX policy language integration

- Normalize copy in:
  - `LockedFeatureCard`
  - token preflight confirmation
  - success/error/refund toasts
- Ensure no dead CTAs and accurate destination routing.

### Ticket 5 — Commissioner heavy-action guardrails

- Add optional league-size/workload cost multiplier hooks for heavy commissioner actions.
- Require explicit confirmation modal for heavy workloads.

### Ticket 6 — Analytics and instrumentation

- Track:
  - lock impressions
  - upgrade CTA clicks
  - token fallback opens
  - confirmation accept/cancel
  - refund events

### Ticket 7 — Documentation and support content

- Publish billing FAQ:
  - included vs token-powered
  - quota reset behavior
  - refunds on failed runs

## QA Acceptance Criteria

1. **Entitled users**
   - Users with valid plan entitlement can access in-scope features without false locks.

2. **Lane A**
   - Unlimited light actions do not consume tokens or quota for in-tier subscribers.

3. **Lane B**
   - Included quota decrements correctly.
   - After depletion, token confirmation appears and spends correct token amount.

4. **Lane C**
   - Heavy actions always require token confirmation.
   - Successful run consumes tokens; failed run refunds tokens.

5. **Status handling**
   - Grace period maintains benefits; expired/past_due correctly transitions to locked/fallback state.

6. **Routing and CTA wiring**
   - Upgrade CTAs route to correct plan surfaces.
   - Token fallback CTAs route to token center with correct rule context.

7. **Bundle behavior**
   - All Access receives all family entitlements and best token economics.

8. **No dead interactions**
   - All premium lock cards/modals/buttons have active handlers across mobile and desktop.

## Final Definition of Done

Done when:
- all premium AI actions are assigned to one of the three policy lanes,
- lane behavior is enforced consistently on frontend and backend,
- user-visible copy matches policy language across all gated surfaces,
- click-audit coverage verifies lock, upgrade, token fallback, entitlement pass-through, and failure-refund flows.

