# PROMPT 251 — AllFantasy Monetization Architecture Reset

## Objective

Redesign AllFantasy monetization around:

1. subscriptions
2. token packages
3. feature entitlements
4. Stripe checkout links
5. FanCred external payment boundary disclosures

This reset is binding to platform business rules:

- AllFantasy does not support gambling or DFS.
- AllFantasy does not process league dues.
- AllFantasy does not control payouts or winnings.
- AllFantasy does not create prize pools or reward pools.
- League creation/management/operation remain free.
- If a league is "paid", commissioner handles dues/payouts externally via FanCred.

## Compliance-First Rules

### Product and legal non-negotiables

- No in-app league dues collection.
- No in-app payout distribution.
- No app-managed prize handling.
- No wallet behaviors that imply cash custody for league settlements.
- No UI copy implying "winnings managed by AllFantasy."

### Mandatory user disclosure principles

Every paid-league-related surface must communicate:

- dues are external (FanCred)
- commissioner is responsible for FanCred setup
- AllFantasy is not payment processor for league prizes
- no gambling or prize payout occurs in-app

## Architecture Blueprint

## 1) Monetization Domain Structure

### A. Catalog Domain (single source of truth)

Purpose:

- define purchasable products/prices
- map internal SKU to Stripe price IDs
- support monthly/yearly plan variants

Entities:

- `MonetizationProduct` (sku, type, display)
- `MonetizationPrice` (interval, amount, currency, stripePriceId, active, env)

### B. Checkout Orchestration Domain

Purpose:

- issue checkout links/sessions for:
  - subscriptions
  - token pack purchases

Rules:

- no checkout path for league dues/payout
- no checkout metadata that implies app payout settlement

### C. Subscription Domain

Purpose:

- persist user subscription lifecycle
- sync webhook events to user state
- expose normalized entitlement-ready state

Entities:

- `UserSubscription`
  - `userId`
  - `planSku`
  - `stripeCustomerId`
  - `stripeSubscriptionId`
  - `status` (`active`, `grace`, `past_due`, `expired`, `none`)
  - `currentPeriodEnd`
  - `gracePeriodEnd`

### D. Entitlement Domain

Purpose:

- compute feature access from active plans
- provide stable API for UI/server gating

Entities:

- `UserEntitlementSnapshot`
  - `userId`
  - `plans[]`
  - `status`
  - `featureFlags` (derived)
  - `updatedAt`

### E. Token Domain (non-cash consumable credit)

Purpose:

- track token balance and immutable token ledger
- grant tokens on pack purchase
- consume tokens on metered AI actions

Entities:

- `UserTokenAccount` (`userId`, `balanceTokens`, `updatedAt`)
- `UserTokenLedger`
  - `idempotencyKey`
  - `userId`
  - `deltaTokens` (+purchase, -spend, +refund, +/-adjustment)
  - `reason` (`purchase`, `spend`, `refund`, `adjustment`)
  - `referenceId`
  - `metadata`
  - `createdAt`

### F. FanCred Boundary Domain

Purpose:

- enforce external payment boundary for paid leagues
- ensure legal UX copy and auditability

Entities:

- `FanCredDisclosureAcceptance`
  - `userId`
  - `leagueId`
  - `copyVersion`
  - `acceptedAt`

## 2) Product Catalog Definition

## Subscriptions

- `af_pro_monthly` — $9.99/mo
- `af_pro_yearly` — $99.99/yr
- `af_commissioner_monthly` — $4.99/mo
- `af_commissioner_yearly` — $49.99/yr
- `af_war_room_monthly` — $9.99/mo
- `af_war_room_yearly` — $99.99/yr
- `af_all_access_monthly` — $19.99/mo
- `af_all_access_yearly` — $199.99/yr

## Token packs

- `af_tokens_5` — $4.99
- `af_tokens_10` — $8.99
- `af_tokens_25` — $19.99

## 3) Entitlement Matrix

Applies platform-wide across supported sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.

| Feature Capability | AF Pro | AF Commissioner | AF War Room | All-Access |
|---|---:|---:|---:|---:|
| Player AI tools (trade/waiver/matchup/player comparison) | ✅ | ❌ | ❌ | ✅ |
| AI Chat Chimmy (player workflows) | ✅ | ❌ | ✅ (planning context) | ✅ |
| Commissioner AI controls (collusion/tanking/review tooling) | ❌ | ✅ | ❌ | ✅ |
| Draft strategy builder / long-term planning | ❌ | ❌ | ✅ | ✅ |
| War room planning workflows | ❌ | ❌ | ✅ | ✅ |
| Commissioner automation controls | ❌ | ✅ | ❌ | ✅ |
| Unified feature access across products | ✅ (Pro scope) | ✅ (Comm scope) | ✅ (War scope) | ✅ (all scopes) |

Notes:

- League creation and baseline operation remain free.
- Token usage may provide one-time access where product policy allows.

## 4) Token Architecture

## Token semantics

- Tokens are non-cash AI usage credits.
- Tokens cannot be withdrawn or transferred to payout systems.
- Tokens do not represent league dues, contest entry, or winnings.

## Spend lifecycle

1. Preflight authorization:
   - check entitlement
   - if no subscription access, check token balance
2. Reserve/consume strategy:
   - prefer atomic consume-on-success
   - or reserve then settle/refund if async
3. Record ledger entry with idempotency key
4. Return updated balance

## Spend policy shape

- `ai_chat_light`: 1 token
- `ai_multi_model_deep`: 2-3 tokens
- `advanced_simulation`: 2 tokens

Exact costs can be configured in `TokenCostPolicy`.

## 5) Stripe Mapping Plan

## Stripe objects

- Product: one per SKU family or per SKU (implementation choice)
- Price: one per purchase option (monthly/yearly/pack)
- Customer: one per AllFantasy user (if billing active)
- Subscription: Stripe source of truth mirrored to DB

## Checkout contracts

### Subscription checkout request

- input:
  - `planSku`
  - `interval` (`monthly` | `yearly`)
  - optional `returnPath`
- output:
  - `checkoutUrl`
  - `sessionId`

### Token checkout request

- input:
  - `tokenPackSku`
  - optional `returnPath`
- output:
  - `checkoutUrl`
  - `sessionId`

## Webhook events to process

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Idempotency

- store processed Stripe `event.id`
- ignore duplicate events safely

## 6) FanCred External Payment Boundary Plan

## Boundary contract for paid leagues

- `paymentMode`:
  - `free`
  - `external_fancred`
- optional fields:
  - `fancredLeagueUrl`
  - `fancredReferenceId`

No internal fields for:

- payout distribution rules
- wallet routing for prizes
- winnings disbursement

## Required disclosure copy (baseline)

- "Paid league dues and payouts are handled externally via FanCred."
- "Commissioners are responsible for FanCred setup and payout operations."
- "AllFantasy is not the payment processor for league dues or league prizes."
- "No gambling, betting, or in-app prize payouts are provided by AllFantasy."

## Disclosure placement requirements

- league creation paid toggle
- league settings payment section
- commissioner controls where paid mode is configured
- league discovery cards with paid indicator
- join flow for paid league entries
- terms/disclaimer references

## 7) Compliance Guardrails

## Technical guardrails

- block creation of checkout sessions for:
  - league dues
  - entry fee collection for app custody
  - payout distribution
- block ledger event types in monetization module that imply cash payout custody
- add policy assertions in API layer:
  - if route intent is dues/payout -> reject with compliance error

## UX guardrails

- ban ambiguous CTA labels:
  - "Collect dues in app"
  - "Payout winners"
  - "Distribute prize pool"
- enforce approved language set in shared disclosure resolver

## 8) Endpoint Contracts (Target)

## Public/user endpoints

- `GET /api/monetization/catalog`
  - returns plans, token packs, display metadata, Stripe price identifiers (public-safe subset)

- `POST /api/monetization/checkout/subscription`
  - creates Stripe checkout for subscription SKU

- `POST /api/monetization/checkout/tokens`
  - creates Stripe checkout for token pack

- `GET /api/subscription/entitlements`
  - returns stable entitlement shape used by client + server gating

- `GET /api/tokens/balance`
  - returns token balance snapshot

- `POST /api/tokens/consume`
  - consumes tokens for eligible metered action (server-side only)

## Webhook endpoint

- `POST /api/stripe/webhook`
  - subscription/token events only
  - no league payout settlement logic

## Paid-league boundary endpoints

- `POST /api/leagues/:leagueId/payment-mode`
  - set `free` or `external_fancred`
  - requires commissioner auth
  - requires disclosure acknowledgment on `external_fancred`

- `GET /api/leagues/:leagueId/payment-boundary`
  - returns disclosure + fancred metadata for UI

## 9) Migration Checklist Against Current Repo

## A. Keep and evolve

- `app/api/subscription/entitlements/route.ts`
  - currently stubbed; evolve to DB-backed resolver.

- `app/api/tokens/balance/route.ts`
  - currently stable response stub; evolve to token account + ledger read.

- `hooks/useEntitlement.ts`
  - keep as client contract, remove hardcoded plan map into shared resolver.

- `hooks/useTokenBalance.ts`
  - keep contract, drive from persisted balance.

- `lib/stripe-client.ts`
  - keep as Stripe client factory.

## B. Replace/introduce for reset

- Introduce `lib/monetization/catalog.ts` (SKU + price source of truth).
- Introduce checkout routes under `/api/monetization/checkout/*`.
- Introduce token consume API with idempotent ledger semantics.
- Introduce server-side `EntitlementResolver`.

## C. Quarantine/retire cash-like wallet semantics

Current repository contains wallet/payout-like models/services:

- `PlatformWalletAccount` / `WalletLedgerEntry` in `prisma/schema.prisma`
- `lib/platform/wallet-service.ts`

Action:

- do not extend these for league dues/payouts.
- gate any usage behind "legacy/internal-only" until fully replaced by non-cash token architecture for AI credits.

## D. Bracket-specific payment routes

Current routes include:

- `app/api/bracket/stripe/checkout/route.ts`
- `app/api/bracket/donate/route.ts`
- `app/api/bracket/stripe/webhook/route.ts`

Action:

- restrict to product billing use cases only.
- remove/replace any flow that can be interpreted as in-app dues or payout handling.
- ensure naming/copy reflects support/subscription/token purchase, not prize/dues settlement.

## E. Legal/disclosure alignment

Current legal surfaces:

- `app/disclaimer/page.tsx`
- `app/terms/page.tsx`

Action:

- add explicit FanCred external-boundary language where paid league is discussed.
- ensure all paid league UIs reference same disclosure source-of-truth copy.

## 10) Implementation Phases

### Phase 0 — Compliance lock

- freeze wallet/payout-expanding work
- add temporary copy hardening in paid league surfaces

### Phase 1 — Catalog + Stripe mapping

- ship `MonetizationCatalog`
- map all plan/token SKUs to Stripe price IDs by env

### Phase 2 — Subscription persistence

- create `UserSubscription`
- process subscription webhook lifecycle
- back `/api/subscription/entitlements` with resolver

### Phase 3 — Token account + ledger

- create token tables and idempotent consume path
- back `/api/tokens/balance` with persisted account

### Phase 4 — Unified feature gating

- centralize feature-to-plan mapping in shared resolver
- remove drift between client and server gating logic

### Phase 5 — FanCred boundary enforcement

- add `paymentMode: external_fancred`
- enforce disclosure acknowledgment for paid leagues
- reject prohibited in-app dues/payout actions

### Phase 6 — QA and click audit

- monetization flow click audit (checkout, success, entitlement refresh)
- paid-league disclosure click audit
- compliance regression tests for prohibited workflows

## 11) QA Acceptance Criteria

- Subscription purchase updates entitlement state via webhook + API.
- Token purchase updates balance via webhook + API.
- Feature gating reflects entitlement/token state across mobile + desktop.
- Every paid-league flow shows FanCred boundary disclosure.
- No route allows in-app dues or payout settlement.
- No UI copy implies gambling or app-managed prize distribution.

## 12) Final Definition of Done

Done when:

- monetization is fully SKU-driven (plans + token packs),
- entitlement and token systems are persisted and idempotent,
- Stripe mapping is environment-safe and auditable,
- FanCred external boundary is explicit in all paid-league workflows,
- compliance guardrails prevent in-app dues/payout behavior.

