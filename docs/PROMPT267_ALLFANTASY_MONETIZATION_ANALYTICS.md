# PROMPT 267 — AllFantasy Monetization Analytics

## Objective

Track monetization funnel performance with clean, non-invasive analytics across pricing, upgrades, locked states, token flows, and post-purchase outcomes.

## Event taxonomy (implemented)

All events are emitted through `lib/monetization-analytics.ts` using the `monetization_` prefix.

1. `monetization_page_visited`
   - Fired on monetization page entry.
   - Params: `surface`, `page_path`, `focus_plan_tier`.

2. `monetization_plan_checkout_clicked`
   - Fired when user clicks subscription checkout CTA.
   - Params: `sku`, `plan_tier`, `billing_interval`, `surface`, `page_path`.

3. `monetization_token_purchase_clicked`
   - Fired when user clicks token purchase CTA/entry.
   - Params: `sku`, `rule_code`, `surface`, `page_path`, `plan_tier=tokens`.

4. `monetization_upgrade_entry_clicked`
   - Fired when user clicks upgrade entry links (plan spotlights, cross-upgrade links, locked conversion CTAs).
   - Params: `target_plan_tier`, `source_plan_tier`, `surface`, `page_path`.

5. `monetization_purchase_return_success`
   - Fired when app detects successful checkout return.
   - Params: `returnPath`.

6. `monetization_subscription_purchase_success`
   - Fired after post-purchase sync confirms subscription persistence.
   - Params: `return_path`, `session_id`, `plan_tiers`, `primary_plan_tier`.

7. `monetization_token_purchase_success`
   - Fired after post-purchase sync confirms token purchase persistence.
   - Params: `return_path`, `session_id`, `balance_after`, `plan_tier=tokens`.

8. `monetization_upgrade_prompt_opened`
   - Fired when a locked upgrade prompt surface becomes visible.
   - Params: `surface`, `feature_id`, `required_plan`, `required_plan_tier`, `entitlement_status`.

9. `monetization_locked_feature_viewed`
   - Fired when a locked feature state is presented.
   - Params: `surface`, `feature_id`, `required_plan`, `required_plan_tier`, `entitlement_status`.

10. `monetization_locked_feature_conversion_click`
    - Fired when user clicks upgrade/tokens/all-access CTA from a locked surface.
    - Params: `surface`, `cta_type`, `feature_id`, `required_plan`, `required_plan_tier`, `rule_code`.

11. `monetization_insufficient_token_flow_viewed`
    - Fired when insufficient token state is shown.
    - Params: `surface`, `feature_id`, `rule_code`, `token_cost`, `current_balance`.

12. `monetization_insufficient_token_buy_click`
    - Fired when user clicks buy tokens from insufficient-token flow.
    - Params: `surface`, `feature_id`, `rule_code`.

13. `monetization_subscription_state_viewed`
    - Fired for churn lifecycle visibility (`past_due`, `expired`).
    - Params: `status`, `surface`, `feature_id`.

## Plan/tier distinction

Analytics normalization supports:
- `pro`
- `commissioner`
- `war_room`
- `all_access`
- `tokens`
- `unknown`

Mapped by `resolvePlanTierFromSku()` in `lib/monetization-analytics.ts`.

## Hook placement (implemented)

### Page-level
- `components/monetization/MonetizationPurchaseSurface.tsx`
  - page visit
  - plan checkout clicks
  - token checkout clicks
  - cross-upgrade entry clicks
- `app/tokens/page.tsx`
  - tokens page visit
  - token checkout clicks
  - insufficient token simulator views

### Spotlight / entry links
- `components/monetization/AFProPlanSpotlight.tsx`
- `components/monetization/AFWarRoomPlanSpotlight.tsx`
- `components/monetization/AFAllAccessBundleSpotlight.tsx`
  - upgrade entry clicks
  - token purchase entry clicks (where applicable)

### Locked + in-context conversion surfaces
- `components/subscription/LockedFeatureCard.tsx`
  - upgrade prompt opened
  - locked feature viewed
  - upgrade/tokens conversion clicks
- `components/subscription/FeatureGate.tsx`
  - passes `featureId` and `entitlementStatus` into locked card analytics
- `components/monetization/InContextMonetizationCard.tsx`
  - locked view/prompt events
  - insufficient token visibility
  - upgrade/tokens/all-access conversion clicks

### Token insufficiency modal
- `components/monetization/TokenSpendPreflightModal.tsx`
  - insufficient token flow viewed
  - insufficient token buy click

### Post-purchase success funnel
- `hooks/usePostPurchaseSync.ts`
  - checkout return success
  - confirmed subscription purchase success
  - confirmed token purchase success

### Churn lifecycle visibility
- `hooks/useEntitlement.ts`
  - tracks `past_due` / `expired` state views with per-page/per-feature dedupe

## QA checklist

- [ ] `monetization_page_visited` fires on `/pricing`, plan-specific upgrade pages, and `/tokens`.
- [ ] Subscription checkout CTA click emits `monetization_plan_checkout_clicked` with correct `plan_tier`.
- [ ] Token purchase clicks emit `monetization_token_purchase_clicked` from pricing, tokens page, and spotlight links.
- [ ] Successful post-checkout subscription sync emits `monetization_subscription_purchase_success`.
- [ ] Successful post-checkout token sync emits `monetization_token_purchase_success`.
- [ ] Locked surfaces emit `monetization_upgrade_prompt_opened` and `monetization_locked_feature_viewed`.
- [ ] Locked conversion CTA clicks emit `monetization_locked_feature_conversion_click` with correct `cta_type`.
- [ ] Insufficient token states emit `monetization_insufficient_token_flow_viewed`.
- [ ] Buy-tokens from insufficient flow emits `monetization_insufficient_token_buy_click`.
- [ ] `past_due` and `expired` entitlement states emit `monetization_subscription_state_viewed`.
- [ ] No runtime errors when analytics provider is absent (safe fallback via `gtagEvent`).
