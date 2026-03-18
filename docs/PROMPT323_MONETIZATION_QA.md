# PROMPT 323 — Monetization QA

## Objective

Ensure monetization is stable: subscriptions unlock features, tokens deduct correctly, Stripe links work, and upgrade flows behave correctly.

---

## Areas verified

### 1. Subscriptions unlock features

- **Client:** `useEntitlement(featureId)` calls `GET /api/subscription/entitlements?feature=<id>` and exposes `hasAccess(featureId)`, `isActiveOrGrace`, and `entitlement` (plans, status, currentPeriodEnd, gracePeriodEnd).
- **API:** `GET /api/subscription/entitlements` requires auth and returns a stable shape: `{ entitlement, hasAccess, message }`. **Current state:** Entitlement is stubbed (plans: [], status: "none", hasAccess: false) until UserSubscription/Stripe is persisted. **Fix applied:** Response guarantees `hasAccess` is boolean and `message` is string so the gating UI never receives undefined.
- **Feature mapping:** `lib/subscription/types.ts` defines `SubscriptionFeatureId` and plan mapping; `useEntitlement` maps pro/commissioner/war_room/all_access to feature access when entitlement is active.

### 2. Tokens deduct correctly

- **Client:** `useTokenBalance()` calls `GET /api/tokens/balance` and exposes `balance`, `updatedAt`, `refetch`. Refetches on window focus (throttled) and after purchase (usePostPurchaseSync).
- **API:** `GET /api/tokens/balance` requires auth and returns `{ balance, updatedAt }`. **Current state:** Balance is stubbed (0) until a platform token/balance table exists. **Fix applied:** Response guarantees `balance` is number and `updatedAt` is string for a stable shape.
- **Deduction:** When token spend is implemented, deduct in a single transactional update and return updated balance; callers should use the returned balance or refetch to avoid race conditions.

### 3. Stripe links work

- **Main app (donate/lab):** `POST /api/stripe/create-checkout-session` body: `{ mode: "donate" | "lab", amount, currency }`. Validates amount (lab = $9.99, donation = $1–$500), creates Stripe Checkout Session, returns `{ url }`. Success/cancel URLs: `/donate/success?mode=...`, `/donate?mode=...`. Requires auth and active tournament for lab.
- **Bracket:** `POST /api/bracket/stripe/checkout` body: `{ leagueId, paymentType }` (paymentType: first_bracket_fee | unlimited_unlock). Validates league member and paid league; creates or reuses pending BracketPayment; creates Stripe Checkout; success/cancel point to `brackets/leagues/{leagueId}?payment=success|cancelled&type=...`.
- **Webhooks:** Both main and bracket webhooks verify `stripe-signature` and construct event with `STRIPE_WEBHOOK_SECRET`. **Fix applied:** Bracket webhook now marks `BracketPayment` completed on `checkout.session.completed` (update by stripeSessionId, status → "completed", completedAt set). Main app webhook leaves donate/lab as Stripe-only until a persistence path exists (documented in code).

### 4. Upgrade flows

- **Post-purchase sync:** `usePostPurchaseSync()` on pricing/tokens/donate success pages: on URL params (e.g. checkout=success, tokens=purchased), refetches entitlement + token balance, optional toasts, clears params. `useIsPurchaseSuccess()` exposes whether URL has success params.
- **Donate success page:** `/donate/success` uses `?mode=lab|donate`, refetches entitlement and tokens once, shows confirmation and links (Lab, Back to Brackets).
- **Bracket payment success:** Redirect to `brackets/leagues/{leagueId}?payment=success&type=...`; payment status is read from BracketPayment (now correctly set to completed by webhook).
- **Pricing page:** Renders plans and Stripe buy-button script; upgrade links and CTA point to pricing or Stripe as configured. LockedFeatureCard and similar components use `hasAccess()` to gate features and link to `/pricing`.

---

## Fixes applied (summary)

| Area | File(s) | Change |
|------|--------|--------|
| **Bracket Stripe webhook** | `app/api/bracket/stripe/webhook/route.ts` | On `checkout.session.completed`, update `BracketPayment` where `stripeSessionId` matches and status is pending: set `status: "completed"`, `completedAt: new Date()`. Ensures bracket league payments are marked completed after Stripe success. |
| **Entitlements API** | `app/api/subscription/entitlements/route.ts` | Return `hasAccess: Boolean(hasAccess)` and `message: String(message ?? "...")` so clients always get a consistent shape. |
| **Tokens balance API** | `app/api/tokens/balance/route.ts` | Return `balance: Number(balance)` and `updatedAt: String(updatedAt)` for a stable response shape. |
| **Main Stripe webhook** | `app/api/stripe/webhook/route.ts` | Document donate/lab persistence gap in comment; read session metadata for future use; remove unused prisma import. |

---

## Current limitations (for follow-up)

- **Subscription entitlement:** No DB or Stripe-backed subscription yet; entitlement API returns "none". When adding, resolve from UserSubscription or Stripe Customer/Subscription and map to plans (pro/commissioner/war_room/all_access) and feature access.
- **Token balance:** No platform token/balance table; balance is always 0. When adding, persist balance and deduct atomically on spend.
- **Main app donate/lab:** Checkout succeeds and user is redirected to success, but no app-side record is created (BracketPayment requires leagueId). To grant lab/donation entitlement, add a separate payment or donation table or extend schema and persist in main webhook on checkout.session.completed.

---

## Reference

- **Entitlement hook:** `hooks/useEntitlement.ts`
- **Token balance hook:** `hooks/useTokenBalance.ts`
- **Post-purchase sync:** `hooks/usePostPurchaseSync.ts`
- **Entitlements API:** `app/api/subscription/entitlements/route.ts`
- **Tokens API:** `app/api/tokens/balance/route.ts`
- **Stripe:** `lib/stripe-client.ts`, `app/api/stripe/create-checkout-session/route.ts`, `app/api/stripe/webhook/route.ts`
- **Bracket Stripe:** `app/api/bracket/stripe/checkout/route.ts`, `app/api/bracket/stripe/webhook/route.ts`
- **Subscription types:** `lib/subscription/types.ts`
- **Bracket entitlement (lab/supporter):** `lib/entitlements-db.ts` (getEntitlementsForUser)
