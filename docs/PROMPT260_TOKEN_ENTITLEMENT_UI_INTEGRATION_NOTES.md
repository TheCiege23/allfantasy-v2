# PROMPT 260 — Token + Entitlement UI Integration Notes

## Summary

Implemented in-context monetization UX with a clean, premium presentation and explicit pre-action token visibility.

Core additions:

- shared backend context endpoint for entitlement + token + preview data
- shared in-context monetization card for surface-level visibility
- shared token preflight modal for explicit confirmation and insufficient-balance handling

## Shared Components and Contracts

### Backend

- `app/api/monetization/context/route.ts`
  - Returns:
    - entitlement snapshot
    - optional feature access decision (required plan + upgrade path)
    - token balance snapshot
    - token preview payload(s) by rule code

### Frontend shared

- `hooks/useMonetizationContext.ts`
  - Reads backend context endpoint
  - Supports feature-aware + token-rule-aware context in one request
  - Includes focus-based refetch

- `components/monetization/InContextMonetizationCard.tsx`
  - Shows:
    - current entitlement plan label
    - token balance
    - token cost before action (when applicable)
    - upgrade CTA when locked
    - buy tokens CTA when insufficient
  - Includes refresh control and stable test ids

- `components/monetization/TokenSpendPreflightModal.tsx`
  - Explicit token spend confirmation UI
  - Insufficient-balance branch with buy tokens CTA
  - "No surprise deductions" copy

## Surface Integrations

- Dashboard
  - `components/dashboard/FinalDashboardClient.tsx`
  - Added in-context snapshot card for AI chat entitlement + token visibility.

- Chimmy / AI Chat
  - `components/chimmy/ChimmyChatShell.tsx`
  - Added in-context card for `ai_chat` + `ai_chimmy_chat_message` cost visibility.

- Trade Analyzer
  - `app/trade-evaluator/page.tsx`
  - Added in-context card for `trade_analyzer` + `ai_trade_analyzer_full_review`.

- Waiver AI
  - `components/waiver-wire/WaiverWirePage.tsx`
  - Added in-context card for `ai_waivers` + `ai_waiver_engine_run`.

- Draft Room AI Helper
  - `components/app/draft-room/DraftHelperPanel.tsx`
  - Added in-context card for `draft_strategy_build` + draft helper token costs.

- Commissioner Tools / Storyline / Collusion / Tanking
  - `components/app/commissioner/AICommissionerPanel.tsx`
  - Added in-context card with:
    - cycle run
    - commissioner chat
    - storyline creation
    - collusion scan
    - tanking scan costs
  - Replaced browser token confirm flow with shared preflight modal for run and chat actions.

## QA Checklist (Mandatory Click Audit)

- [ ] Upgrade CTA works from in-context card locked state.
- [ ] Buy tokens CTA works from in-context card insufficient state.
- [ ] Token balance refresh button updates displayed balance.
- [ ] Insufficient balance preflight flow shows buy tokens CTA.
- [ ] Entitled state softens upsell and hides unnecessary CTAs.
- [ ] No dead monetization UI controls/buttons/links across integrated surfaces.

## New E2E Coverage

- Harness page:
  - `app/e2e/monetization-in-context/page.tsx`
  - `app/e2e/monetization-in-context/MonetizationInContextHarnessClient.tsx`

- Click audit spec:
  - `e2e/monetization-in-context-click-audit.spec.ts`
  - Validates:
    - upgrade CTA wiring
    - buy tokens CTA wiring
    - token balance refresh behavior
    - insufficient preflight behavior
    - entitled state no-aggressive-upsell behavior

