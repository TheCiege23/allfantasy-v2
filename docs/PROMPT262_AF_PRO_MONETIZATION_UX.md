# PROMPT 262 — AF Pro Monetization UX

## Objective Delivered

Implemented AF Pro monetization UX as the player-specific AI tier with clearer tier differentiation, in-context upgrade routes, and token-aware surfaces.

## Frontend Changes

### AF Pro plan UI

- Added `components/monetization/AFProPlanSpotlight.tsx`
  - Explicit AF Pro feature list:
    - trade analyzer
    - AI chat
    - AI waivers
    - player-specific planning
    - matchup/player-specific AI recommendations
    - player-focused AI insights
  - Clear tier differentiation blocks for:
    - AF Pro
    - AF Commissioner
    - AF War Room
  - Wired CTAs:
    - `/upgrade?plan=pro`
    - `/tokens`

- Updated `components/monetization/MonetizationPurchaseSurface.tsx`
  - Renders AF Pro spotlight when `focusPlanFamily === "af_pro"` (e.g., `/pro`, and `/upgrade?plan=pro`).

### Feature-gate wiring on AF Pro surfaces

- Updated `components/player-comparison-lab/PlayerComparisonPage.tsx`
  - Added in-context monetization card for `player_ai_recommendations`.
  - Token previews include player recommendation and quick comparison explanation rules.

- Updated `components/simulation/MatchupSimulationPage.tsx`
  - Added in-context monetization card for `matchup_explanations`.
  - Upgrade and token CTA now visible directly on the matchup simulation surface.

- Updated `app/af-legacy/components/tabs/LegacyStrategyTab.tsx`
  - Added in-context monetization card for `planning_tools`.
  - Wrapped strategy planner in `FeatureGate` for `planning_tools` so locked users get upgrade/token fallback paths.

## Backend Changes

- Updated `app/api/simulation/matchup/route.ts`
  - Enforced AF Pro feature gate for AI matchup overlays (`includeInsights`) using `matchup_explanations`.
  - Added token fallback support via `requireFeatureEntitlement(... allowTokenFallback: true ...)` with rule:
    - `ai_matchup_explanation_single`
  - Supports confirmation-aware token spend (`confirmTokenSpend`) and returns token fallback spend metadata when used.

## E2E Click Audit

- Added `app/e2e/af-pro-monetization/AfProMonetizationHarnessClient.tsx`
- Added `app/e2e/af-pro-monetization/page.tsx`
- Added `e2e/af-pro-monetization-click-audit.spec.ts`

Coverage verifies:
- AF Pro spotlight is visible and differentiated from Commissioner and War Room.
- AF Pro upgrade CTA is wired.
- Token CTA is wired.
- Locked in-context AF Pro surfaces show upgrade CTA.
- Locked in-context AF Pro surfaces show buy tokens CTA.
- No dead upgrade or token buttons in AF Pro harnessed surfaces.

## QA Checklist

- [x] AF Pro value proposition is explicit and player-focused.
- [x] AF Pro is clearly differentiated from AF Commissioner and AF War Room.
- [x] Locked AF Pro features expose contextual upgrade CTAs from in-context UI surfaces.
- [x] Token pathways are visible where policy allows (with rule-aware token CTAs).
- [x] Matchup AI overlay backend path is entitlement-enforced with token fallback support.
- [x] Click audit confirms no dead AF Pro upgrade/token buttons in audited surfaces.

