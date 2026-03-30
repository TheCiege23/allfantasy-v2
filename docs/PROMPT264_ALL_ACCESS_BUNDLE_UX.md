# PROMPT 264 — AllFantasy All-Access Bundle UX

## Objective Delivered

Implemented AF All-Access as the simplest premium bundle for users who want everything, with clearer value messaging, explicit inheritance behavior, clean upgrade paths from individual plans, and token-clarity handling to reduce confusion.

## Frontend Changes

### Bundle pricing and value UI

- Added `components/monetization/AFAllAccessBundleSpotlight.tsx`
  - Clearly positions AF All-Access as:
    - AF Pro + AF Commissioner + AF War Room
  - Explicit bundle price chips:
    - `$19.99 monthly`
    - `$199.99 yearly`
  - Includes:
    - simple value bullets
    - inheritance breakdown cards (Pro, Commissioner, War Room)
    - token-clarity copy for included vs token-metered actions
  - Wired CTAs:
    - `/upgrade?plan=all_access`
    - `/pricing`
    - switch links from individual plans:
      - `/upgrade?plan=all_access&from=pro`
      - `/upgrade?plan=all_access&from=commissioner`
      - `/upgrade?plan=all_access&from=war_room`

- Updated `components/monetization/MonetizationPurchaseSurface.tsx`
  - Renders All-Access spotlight when `focusPlanFamily === "af_all_access"`.
  - Adds cross-upgrade CTA on focused individual plan cards:
    - “Prefer one bundle? Get AF All-Access” -> `/all-access`

- Updated `app/all-access/page.tsx`
  - Refined subtitle to emphasize simplicity and bundle value.

### In-context token clarity and bundle upgrade path

- Updated `components/monetization/InContextMonetizationCard.tsx`
  - Prevents token confusion for included features:
    - token cost chips/details are hidden when feature is already included by plan
    - buy-token CTA is hidden when feature is included
    - added explicit clarity note: included features do not require tokens
  - Adds All-Access path from locked individual-plan cards:
    - new CTA: `/all-access`
  - Improves entitlement label for bundle users:
    - “Included with AF All-Access bundle inheritance”

## Backend Changes

### Entitlement inheritance wiring

- Updated `lib/subscription/feature-access.ts`
  - Added canonical `ALL_ACCESS_INCLUDED_PLAN_IDS` for bundle inheritance mapping.
  - Added `resolveBundleInheritance(plans)` helper that returns:
    - `hasAllAccess`
    - `inheritedPlanIds`
    - `effectivePlanIds`

- Updated `app/api/subscription/entitlements/route.ts`
  - Adds `bundleInheritance` payload in response for explicit inheritance introspection.

- Updated `app/api/monetization/context/route.ts`
  - Adds `bundleInheritance` payload in response so in-context monetization surfaces can reason about effective access.

- Updated `hooks/useEntitlement.ts` and `hooks/useMonetizationContext.ts`
  - Plumbs optional `bundleInheritance` into client hook state.

## E2E Click Audit

- Added `app/e2e/all-access-bundle/AllAccessBundleHarnessClient.tsx`
- Added `app/e2e/all-access-bundle/page.tsx`
- Added `e2e/all-access-bundle-click-audit.spec.ts`

Coverage verifies:
- All-Access spotlight is visible and price chips show the required monthly/yearly values.
- Bundle inclusion messaging (Pro, Commissioner, War Room) is visible.
- All spotlight upgrade/switch CTAs are wired.
- Locked feature cards still provide standard upgrade and token routes, plus All-Access bundle path.
- Bundle-entitled state suppresses confusing token CTAs for included features.
- No dead upgrade CTAs in audited bundle surfaces.

## QA Checklist

- [x] AF All-Access is presented as the simplest premium option.
- [x] Bundle pricing is explicit: `$19.99 monthly` and `$199.99 yearly`.
- [x] Bundle inheritance logic is explicit in backend payloads and reflected in UI.
- [x] Clean upgrade path exists from individual plans to All-Access.
- [x] Included-vs-token behavior is clarified to avoid confusion.
- [x] Upgrade CTAs are wired and non-dead in audited surfaces.
