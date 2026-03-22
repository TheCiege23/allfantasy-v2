# Prompt 39 — AI Commissioner Core Architecture Deliverable

## 1) AI Commissioner architecture

The implementation introduces a dedicated commissioner governance layer under `lib/ai-commissioner` and keeps all existing league/commissioner systems additive and intact.

Core modules delivered:

- `AICommissionerService`
- `LeagueGovernanceAnalyzer`
- `CommissionerAlertGenerator`
- `DisputeContextBuilder`
- `CollusionSignalDetector`
- `CommissionerQueryService`
- `SportCommissionerResolver`

Design principles:

- Commissioner-assist by default (no silent rules override).
- Explainable outputs (structured alerts + AI narrative context).
- Sport-aware behavior across NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
- Preservation of existing league settings, commissioner tools, waivers, trade surfaces, chat, notifications, dashboards, and AI surfaces.

## 2) Schema additions

`prisma/schema.prisma` now includes:

- `AiCommissionerConfig`
  - `configId`, `leagueId`, `sport`
  - `remindersEnabled`
  - `disputeAnalysisEnabled`
  - `collusionMonitoringEnabled`
  - `voteSuggestionEnabled`
  - `inactivityMonitoringEnabled`
  - `commissionerNotificationMode`
  - `updatedAt` (+ `createdAt`)
- `AiCommissionerAlert`
  - `alertId`, `leagueId`, `sport`
  - `alertType`, `severity`
  - `headline`, `summary`
  - `relatedManagerIds`, `relatedTradeId`, `relatedMatchupId`
  - `createdAt`, `resolvedAt`
  - operational status fields for workflow actions (`status`, `snoozedUntil`)
- `AiCommissionerActionLog`
  - `actionId`, `leagueId`, `sport`
  - `actionType`, `source`, `summary`
  - `createdAt` (+ optional `relatedAlertId`)

`League` relations were extended to include these commissioner entities for direct league-scoped querying.

## 3) Backend alerting and governance services

New service responsibilities:

- `SportCommissionerResolver`
  - Normalizes sport via `lib/sport-scope`.
  - Provides sport cadence context (lineup lock reminder windows, playoff timing, scoring-period cadence).
- `LeagueGovernanceAnalyzer`
  - Aggregates pending waiver load, inactive-manager risk, trade imbalance/dispute indicators, basic rule conflicts, and schedule/playoff timing.
- `CollusionSignalDetector`
  - Scores value imbalance and repeated trading concentration patterns into collusion signals.
- `CommissionerAlertGenerator`
  - Converts governance analysis and config toggles into structured alerts:
    - `LINEUP_REMINDER`
    - `TRADE_REVIEW_FLAG`
    - `COLLUSION_SIGNAL`
    - `DISPUTE_CONTEXT`
    - `VOTE_RECOMMENDATION`
    - `INACTIVE_MANAGER_WARNING`
    - `PLAYOFF_DEADLINE_REMINDER`
    - `RULE_CONFLICT_NOTICE`
- `AICommissionerService`
  - Ensures config defaults.
  - Runs governance cycle, deduplicates/upserts alerts, logs actions.
  - Fans out commissioner notifications (`commissioner_alerts`) and optional league chat notices.
- `DisputeContextBuilder`
  - Builds trade/matchup context payloads for explain endpoints.
- `CommissionerQueryService`
  - Returns unified commissioner read-model payload (config + alerts + action logs).

New APIs:

- `GET /api/leagues/[leagueId]/ai-commissioner`
- `GET/PATCH /api/leagues/[leagueId]/ai-commissioner/config`
- `POST /api/leagues/[leagueId]/ai-commissioner/run`
- `PATCH /api/leagues/[leagueId]/ai-commissioner/alerts/[alertId]`
- `POST /api/leagues/[leagueId]/ai-commissioner/explain`

All write paths are commissioner-guarded through `assertCommissioner`.

## 4) UI integration points

Primary UI integration:

- New panel: `components/app/commissioner/AICommissionerPanel.tsx`
  - Sport/season controls
  - Refresh and run-cycle actions
  - Commissioner behavior toggles and notification mode
  - Alert center cards with:
    - approve
    - dismiss
    - snooze
    - resolve/reopen
    - send notice
    - AI explain
  - Trade/matchup drill-down links
  - Action log surface
  - Loading and error states
- Integrated into `components/app/tabs/CommissionerTab.tsx`
  - Adds AI Commissioner as a first-class commissioner dashboard block.
- `components/app/settings/CommissionerControlsPanel.tsx`
  - Added AI Commissioner quick entry link.
  - Quick-jump links now carry `settingsTab` query.
- `components/app/tabs/LeagueSettingsTab.tsx`
  - Added `settingsTab` query parsing to open the intended settings subpanel directly.
- `components/app/tabs/CommissionerTab.tsx`
  - Updated quick links to route to correct settings sub-tabs (`Reputation`, `General`, `Member Settings`, `Draft Settings`), fixing navigation mismatch.

## 5) Full UI click audit findings

See: `docs/PROMPT39_AI_COMMISSIONER_CLICK_AUDIT_MATRIX.md`

Audit coverage includes commissioner dashboard entry points, AI Commissioner widget controls, reminder/rule/dispute/collusion/vote-related actions, alert center actions, settings links, chat notice actions, back/refresh paths, and loading/error states.

Outcome summary:

- 30 commissioner-related interaction paths audited.
- `PASS`: 24
- `FIXED`: 6

Fixes focused on:

- settings quick-jump accuracy
- settings sub-tab deep-link handling
- commissioner quick-link target correctness

## 6) QA findings

Key QA outcomes:

- Commissioner settings save and reload correctly through config API.
- Alert generation cycle executes and repopulates alert center from persisted data.
- Lineup reminder outputs are sport-aware via `SportCommissionerResolver`.
- Dispute and collusion alert cards load and mutate status correctly.
- Commissioner notice action wires to chat notice flow.
- AI explanation button uses current alert + dispute context.
- Existing commissioner lineup flow remains functional after integration.

Automated verification executed:

- `npm run -s typecheck`
- `e2e/ai-commissioner-click-audit.spec.ts`
- `e2e/commissioner-lineup-click-audit.spec.ts`

Final status: passed.

## 7) Issues fixed

- Added missing AI Commissioner core data model + service architecture (config/alerts/action logs).
- Added commissioner-safe backend orchestration and explain path for governance alerts.
- Fixed commissioner settings quick-jump misrouting by introducing `settingsTab` query resolution.
- Fixed commissioner quick links that previously landed on generic settings without target context.
- Added explicit commissioner alert action workflow (`approve`, `dismiss`, `snooze`, `resolve`, `reopen`, `send_notice`).
- Added sport-aware governance cadence logic to avoid single-sport assumptions.

## 8) Final QA checklist

- [x] Commissioner settings save correctly.
- [x] Alert generation runs and persists.
- [x] Lineup reminder intelligence is sport-aware.
- [x] Dispute analysis cards render and mutate correctly.
- [x] Collusion signal cards render and mutate correctly.
- [x] Commissioner notice action works from alert cards.
- [x] AI explanation uses current alert context.
- [x] Commissioner-related click paths audited with handler/state/API/persist verification.
- [x] Existing commissioner lineup workflow remains operational.

## 9) Explanation of the AI Commissioner system

The AI Commissioner system is a governance co-pilot for commissioners. It continuously converts league operations signals (waivers, activity, trades, schedule windows, rule settings) into structured, auditable alerts, then gives commissioners explicit controls over each recommendation.

It is intentionally safe:

- It recommends and explains; it does not silently override league rules.
- Every alert action is explicit and logged.
- Notification and chat output are configurable per league.

It is also extensible:

- The new query and action model is prepared for future vote systems, moderation tooling, deeper collusion heuristics, and expanded commissioner automation while preserving current league architecture.
