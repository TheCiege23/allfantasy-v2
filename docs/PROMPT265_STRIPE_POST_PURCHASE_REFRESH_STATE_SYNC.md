# PROMPT 265 — Stripe Post-Purchase Refresh and State Sync

## Objective

Ensure that after users return from Stripe checkout (subscription or token pack), AllFantasy refreshes entitlement and token balance state, handles cancel/failure cleanly, and avoids stale lock/token UI.

## Backend changes

- Added `GET /api/monetization/post-purchase-sync` in `app/api/monetization/post-purchase-sync/route.ts`.
  - Auth required.
  - Idempotent/read-only sync check by optional `session_id`.
  - Resolves latest entitlement + token balance snapshots.
  - Detects whether Stripe webhook effects are persisted for the current user:
    - subscription evidence via `userSubscription.stripeCheckoutSessionId`
    - token evidence via `tokenLedger` (`sourceType=stripe_checkout`, `sourceId=session_id`)
  - Returns:
    - `syncStatus` (`synced | pending | no_session`)
    - `syncEvidence` (`subscription`, `tokens`)
    - `entitlement`, `bundleInheritance`, `tokenBalance`
    - `syncMessage`, `resolvedAt`

## Frontend changes

- Refactored `hooks/usePostPurchaseSync.ts`:
  - Handles purchase return intents:
    - success (`checkout=success`, related success params, and `session_id` presence)
    - cancelled (`checkout=cancelled/canceled/cancel`)
    - failed (`checkout=failed/failure/error`, `status=failed`, or `error=...`)
  - Performs idempotent post-purchase sync through `/api/monetization/post-purchase-sync`.
  - Retries pending session sync automatically (bounded attempts) for webhook lag.
  - Refetches entitlement + token balance each sync attempt.
  - Clears return query params after handling.
  - Exposes structured state + retry action to render success/cancel/failure UI.

- Added global post-purchase sync event in `lib/state-consistency/post-purchase-sync-events.ts`.
  - Event: `af:post-purchase-sync`.
  - Dispatches after success/pending/failure/cancel processing.

- Subscribed user state hooks to post-purchase event:
  - `hooks/useEntitlement.ts`
  - `hooks/useTokenBalance.ts`
  - `hooks/useMonetizationContext.ts`
  - Result: open screens refresh and stale premium lock/token states are reduced.

- Added post-purchase status UI + retry CTA wiring:
  - `components/monetization/MonetizationPurchaseSurface.tsx`
    - banner state for success/pending/cancelled/failed
    - retry button for pending/failed sync
  - `app/tokens/page.tsx`
    - banner state for success/pending/cancelled/failed
    - retry button for pending/failed sync
    - successful return triggers token history reload via `onSuccess`

## E2E click-audit coverage

- Added dedicated harness:
  - `app/e2e/post-purchase-sync/PostPurchaseSyncHarnessClient.tsx`
  - `app/e2e/post-purchase-sync/page.tsx`

- Added click-audit spec:
  - `e2e/post-purchase-sync-click-audit.spec.ts`
  - Verifies:
    1. returning from checkout updates plan state correctly
    2. token purchases update balance correctly
    3. cancelled purchase state is handled cleanly
    4. stale premium lock states clear after sync
    5. no dead post-purchase retry button

## QA checklist

- [ ] Subscription checkout return with `session_id` shows success banner and unlocked premium state.
- [ ] Token pack return with `session_id` shows token success copy and updated balance.
- [ ] Cancel return shows cancelled message without unlocking features.
- [ ] Failure return shows error state and retry button works.
- [ ] Retry from pending/failure transitions to synced state when backend persistence appears.
- [ ] Query params used for return handling are removed after processing (no duplicate toasts).
- [ ] Entitlement/token/monetization-context hooks refresh after post-purchase event.
