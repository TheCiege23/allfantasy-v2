# PROMPT 263 — AF War Room Monetization UX

## Objective Delivered

Implemented AF War Room monetization UX as the premium strategy + drafting tier for individual users, with clearer tier differentiation, in-context upgrade flows, token-aware fallback paths, and click-audit coverage.

## Frontend Changes

### AF War Room pricing and upgrade UI

- Added `components/monetization/AFWarRoomPlanSpotlight.tsx`
  - Explicit AF War Room feature list:
    - draft build strategy
    - draft prep
    - future game planning
    - 3-5 year strategy planning
    - draft intelligence and roster construction support
  - Clear differentiation blocks for:
    - AF War Room
    - AF Pro
    - AF Commissioner
  - Wired CTAs:
    - `/upgrade?plan=war_room`
    - `/tokens?ruleCode=ai_war_room_multi_step_planning`

- Updated `components/monetization/MonetizationPurchaseSurface.tsx`
  - Renders AF War Room spotlight when `focusPlanFamily === "af_war_room"` (e.g. `/war-room`, `/upgrade?plan=war_room`).

- Updated `app/war-room/page.tsx`
  - Refined subtitle to emphasize draft prep, future game planning, and 3-5 year roster construction value.

### In-context monetization wiring (draft + strategy tools)

- Updated `components/app/draft-room/DraftHelperPanel.tsx`
  - Added in-context card for `draft_prep` using token rule `ai_draft_pick_explanation`.
  - Kept and clarified in-context card for `draft_strategy_build` using token rule `ai_draft_helper_session_recommendation`.
  - Existing War Room `FeatureGate` remains wired to prevent dead premium interactions.

- Updated `app/af-legacy/components/tabs/LegacyStrategyTab.tsx`
  - Added in-context card for `future_planning` with token rules:
    - `ai_strategy_3_5_year_planning`
    - `ai_war_room_multi_step_planning`
  - Added explicit `FeatureGate` block for `future_planning`, with unlocked path CTA to `/war-room`.

## Backend Changes

- Updated `app/api/draft/recommend/route.ts`
  - Switched AI explanation entitlement gate from `draft_strategy_build` to `draft_prep` to align with War Room draft prep policy.
  - Kept token fallback support via `requireFeatureEntitlement(... allowTokenFallback: true ...)` with `ai_draft_pick_explanation`.
  - Updated token source metadata text to draft-prep-specific naming.

## E2E Click Audit

- Added `app/e2e/af-war-room-monetization/AfWarRoomMonetizationHarnessClient.tsx`
- Added `app/e2e/af-war-room-monetization/page.tsx`
- Added `e2e/af-war-room-monetization-click-audit.spec.ts`

Coverage verifies:
- AF War Room spotlight renders and differentiates from AF Pro + AF Commissioner.
- War Room upgrade and token spotlight links are wired.
- Draft-tool in-context cards expose upgrade + token CTAs when locked.
- Strategy-tool in-context cards expose upgrade + token CTAs when locked.
- Feature-gated future planning surface exposes a valid upgrade path.
- No dead upgrade buttons in audited AF War Room surfaces.

## QA Checklist

- [x] AF War Room value proposition is explicit and strategy/draft focused.
- [x] AF War Room is clearly differentiated from AF Pro and AF Commissioner.
- [x] Draft room surfaces provide in-context War Room upgrade/token routes.
- [x] Strategy tool surfaces provide in-context War Room upgrade/token routes.
- [x] Token pathways are visible where policy allows with rule-aware CTAs.
- [x] Backend draft prep AI explanation path is entitlement-enforced with token fallback.
- [x] Click audit confirms upgrade/token routes are wired (no dead monetization buttons in audited surfaces).
