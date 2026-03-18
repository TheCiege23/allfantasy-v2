# PROMPT 287 — Monetization QA Deliverable

**Objective:** Ensure monetization works.  
**Verified:** Subscriptions, tokens, gating, Stripe links.  
**Date:** 2025-03-17

---

## Stripe links summary (verified)

| Link / flow | Route / API | Notes |
|-------------|-------------|--------|
| **Donate / Lab Pass** | `/donate` → `POST /api/stripe/create-checkout-session` → Stripe Checkout → `/donate/success?mode=donate\|lab` | Requires **active bracket tournament** in DB (`getActiveTournament()`); otherwise 400. |
| **Bracket league payment** | `POST /api/bracket/stripe/checkout` | Body: `leagueId`, `paymentType` (first_bracket_fee / unlimited_unlock). |
| **Bracket donate** | `POST /api/bracket/donate` | Amount in cents. |
| **Pricing page** | `/pricing` | Plans (Free, Pro, Commissioner, Supreme) are **informational**. Stripe buy-button script is loaded but **no checkout buttons or Price IDs** are wired; subscription checkout not yet implemented. |
| **Customer portal** | — | Not implemented; no billing management link. |

---

## 1. Stripe

### Configuration (`lib/stripe-client.ts`)

- **Required env:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Exports:** `getStripeClient()`, `getStripePublishableKey()`, `getStripeWebhookSecret()`

### Checkout & links

| Route | Method | Purpose |
|-------|--------|--------|
| `/api/stripe/create-checkout-session` | POST | Donate or Bracket Lab Pass; body: `{ mode: "donate" \| "lab", amount, currency: "usd" }`. Used by `/donate`. |
| `/api/bracket/stripe/checkout` | POST | Bracket league payments; body: `{ leagueId, paymentType: "first_bracket_fee" \| "unlimited_unlock" }`. Requires league member + paid league. |
| `/api/bracket/donate` | POST | Bracket donations; amount in cents. |
| `/api/bracket/stripe/publishable-key` | GET | Returns Stripe publishable key for client. |

### Webhooks

- **`/api/stripe/webhook`** — Main Stripe webhook; verifies signature; handles `checkout.session.completed` / `payment_intent.succeeded` (currently logs only; no entitlement/token updates).
- **`/api/bracket/stripe/webhook`** — Bracket Stripe webhook; same verification; handles same events (log only).

**QA:** In Stripe Dashboard, ensure webhook URLs point to these routes and required env is set. After a test payment, confirm events are received and no 4xx/5xx.

### Pricing & donate UI

- **`/pricing`** — Free / Pro / Commissioner / Supreme plans; loads Stripe buy-button script. **No subscription checkout wired:** no buy buttons or Stripe Price IDs on the page; plans are informational. ImproveTradeModal and LockedFeatureCard link to `/pricing` for “Upgrade” / “View plans”.
- **`/donate`** — Donate vs Lab Pass; calls `POST /api/stripe/create-checkout-session` then redirects to Stripe Checkout. **Requires active bracket tournament** (e.g. ncaam); otherwise API returns 400.
- **`/wallet/deposit`** — Redirects to `/donate`.

---

## 2. Subscriptions

### Types (`lib/subscription/types.ts`)

- **Plans:** `pro`, `commissioner`, `war_room`, `all_access` (`SubscriptionPlanId`)
- **Statuses:** `active`, `grace`, `past_due`, `expired`, `none` (`EntitlementStatus`)
- **Feature IDs:** `SubscriptionFeatureId` — e.g. `trade_analyzer`, `ai_chat`, `ai_waivers`, `draft_strategy_build`; mapped in `useEntitlement.hasAccess()` to plans (Pro, Commissioner, War Room, All Access).

### Entitlement API

- **`GET /api/subscription/entitlements`** — Returns current user’s entitlement for gating (auth required).
  - Optional: `?feature=<id>` for `hasAccess` for that feature.
  - Response: `{ entitlement: { plans, status, currentPeriodEnd, gracePeriodEnd }, hasAccess, message }`
- **Implementation:** Route added; currently returns `status: "none"`, `plans: []`, `hasAccess: false`. When subscription/Stripe persistence exists, this route should resolve from DB/Stripe.

### Frontend

- **`hooks/useEntitlement.ts`** — Calls `/api/subscription/entitlements`; exposes `entitlement`, `hasAccess(featureId)`, `isActiveOrGrace`, `refetch`; refetches on window focus (throttled).

**QA:** Log in, open a page that uses `useEntitlement` (e.g. dashboard); confirm no 404 and entitlement state is consistent (e.g. “none” when not subscribed).

---

## 3. Tokens

### Token balance API

- **`GET /api/tokens/balance`** — Returns current user’s token balance (auth required).
  - Response: `{ balance, updatedAt }`
- **Implementation:** Route added; currently returns `balance: 0`, `updatedAt: ISO string`. When platform token balance is persisted, this route should resolve from DB.

### Frontend

- **`hooks/useTokenBalance.ts`** — Calls `/api/tokens/balance`; exposes `balance`, `updatedAt`, `loading`, `error`, `refetch`; refetches on window focus (throttled).
- **Usage:** e.g. dashboard token display, `/wallet`; `usePostPurchaseSync` may depend on balance.

**QA:** Log in, open dashboard or wallet; confirm no 404 and balance shows (e.g. 0) without error.

---

## 4. Gating

- **Client-side:** `useEntitlement().hasAccess(featureId)` and `isActiveOrGrace` gate by subscription.
- **Feature IDs:** Defined in `lib/subscription/types.ts`; mapped in `useEntitlement.hasAccess()` to plans (Pro, Commissioner, War Room, All Access). **LockedFeatureCard** links to `/pricing` or optional `onUpgradeClick`; optional “Or use N tokens” links to `/tokens`.
- **Server-side:** No subscription checks were added in this QA; any server enforcement should call the same entitlement/subscription source used by `GET /api/subscription/entitlements`.

**QA:** With entitlement `status: "none"`, gated UI should show upgrade prompts; when entitlement is later set to active (e.g. after wiring Stripe subscription), gated features should unlock.

---

## Client → monetization mapping

| Surface | What’s used | Link / API |
|--------|--------------|------------|
| App dashboard (`FinalDashboardClient`) | Token balance, entitlement | `useTokenBalance`, `useEntitlement`; tokens → `/tokens` (or wallet), plan → `/pricing` |
| Donate / Lab | Checkout | `/donate` → `POST /api/stripe/create-checkout-session` → Stripe → `/donate/success` |
| Post-purchase sync | Refetch entitlement + tokens | `usePostPurchaseSync` on `/donate/success` (refetches so UI updates) |
| Locked feature | Upgrade / tokens | `LockedFeatureCard`: “View plans” → `/pricing`, “Or use N tokens” → `/tokens` |
| Improve trade modal | Upgrade | `window.open('/pricing')` |

---

## 5. QA checklist

- [ ] **Env:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` set in env.
- [ ] **Donate:** Open `/donate`, choose amount, submit; redirects to Stripe Checkout; complete test payment; return to site.
- [ ] **Bracket checkout:** In a paid bracket league, trigger first_bracket_fee or unlimited_unlock; confirm redirect to Stripe and no 403/404.
- [ ] **Webhooks:** Stripe Dashboard → Webhooks; confirm endpoints and recent events succeed (no 4xx/5xx).
- [ ] **Pricing:** Load `/pricing`; confirm plans render and Stripe script loads; if buy buttons exist, confirm they open Stripe.
- [ ] **Entitlements:** Log in; confirm `GET /api/subscription/entitlements` returns 200 and valid JSON (e.g. `status: "none"`).
- [ ] **Tokens:** Log in; confirm `GET /api/tokens/balance` returns 200 and `{ balance, updatedAt }`.
- [ ] **Gating:** Visit a gated feature; confirm upgrade message when not subscribed.

---

## 6. Optional follow-ups

- **Webhooks:** Implement entitlement and/or token updates in Stripe webhook handlers when payment succeeds (e.g. grant subscription or tokens).
- **Subscription persistence:** Store Stripe subscription state (e.g. in DB) and resolve `GET /api/subscription/entitlements` from it.
- **Token persistence:** Store platform token balance and resolve `GET /api/tokens/balance` from it; update on purchase/spend.
- **Pricing:** Wire Pro/Commissioner/Supreme buy actions to Stripe Checkout or Stripe Price IDs (pricing page currently has no checkout).
- **Donate without tournament:** Consider allowing donate mode when no active tournament (e.g. skip tournamentId in metadata or use a generic product).
