# PROMPT 261 — Commissioner Monetization UX

## Objective Delivered

Implemented commissioner monetization UX so free commissioner capabilities remain clearly available, while AF Commissioner premium tools are clearly labeled with contextual upgrade routing.

## What Changed

### 1) Commissioner monetization overview (shared UI)

Added a reusable overview card that explicitly separates free vs premium commissioner features and includes paid-league boundary copy.

- File: `components/app/commissioner/CommissionerMonetizationOverview.tsx`
- Includes:
  - Free Commissioner Features list
  - AF Commissioner Premium Features list
  - Contextual upgrade CTA (`/commissioner-upgrade`)
  - Required boundary copy: AllFantasy does not collect/hold/distribute dues or payouts

### 2) Commissioner tab monetization clarity and routing

Updated commissioner tab to include the new overview and route premium actions contextually.

- File: `components/app/tabs/CommissionerTab.tsx`
- Changes:
  - Added `CommissionerMonetizationOverview` near top of the tab
  - Split actions into:
    - Free tools: general settings and manager replacement
    - Premium tools: advanced scoring, advanced playoffs, AI team managers, league rankings, draft rankings
  - Premium action links now resolve contextually:
    - Entitled: route to the target settings/tab action
    - Not entitled: route to feature-specific commissioner upgrade path
  - Existing AI Commissioner panel lock remains in place (`FeatureGate` on `commissioner_automation`)

### 3) Commissioner controls panel: free core controls + premium labeled actions

Removed the blanket premium lock from Commissioner Controls so free operations stay accessible, then added explicit premium routing where appropriate.

- File: `components/app/settings/CommissionerControlsPanel.tsx`
- Changes:
  - Removed top-level `FeatureGate` that previously locked the full panel
  - Added `CommissionerMonetizationOverview` in compact mode
  - Split settings links into:
    - Free settings links (general, members, draft)
    - Premium settings links (advanced scoring, advanced playoffs, AI automation)
  - AI team manager assignment now behaves by entitlement:
    - Entitled: action button remains interactive
    - Not entitled: contextual upgrade CTA shown instead
  - Free manager actions (replace/orphan) remain accessible

## E2E Click Audit Coverage

### Updated existing commissioner control panel click audit

- File: `e2e/commissioner-control-panel-click-audit.spec.ts`
- Added subscription entitlement route mocking to keep premium-aware behaviors deterministic during commissioner panel interactions.

### Updated existing AI commissioner click audit

- File: `e2e/ai-commissioner-click-audit.spec.ts`
- Broadened entitlement route matcher to handle both feature-specific and non-feature entitlement requests after new commissioner monetization context wiring.

### Added new commissioner monetization click audit

- File: `e2e/commissioner-monetization-click-audit.spec.ts`
- Verifies:
  - Locked premium commissioner tools show upgrade routing
  - Free commissioner action remains usable (`Run waiver processing now`)
  - Upgrade links are wired (no dead paywall buttons)
  - Paid-league boundary messaging is present

## QA Checklist

- [x] Free commissioner capabilities remain accessible in commissioner controls.
- [x] Premium commissioner tools are visibly labeled as AF Commissioner premium.
- [x] Locked premium links route to commissioner upgrade paths.
- [x] AI Commissioner lock state still renders a valid upgrade CTA.
- [x] No dead monetization buttons (upgrade CTAs have valid routes).
- [x] Paid league copy clarifies that dues/payout handling is not performed by AllFantasy.

