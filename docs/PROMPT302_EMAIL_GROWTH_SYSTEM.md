# PROMPT 302 — Email Growth System

## Objective

Drive engagement via email.

## Send

- **Weekly summaries** — Recap of user activity (league views, bracket views, AI uses) with CTA to dashboard.
- **AI insights** — One-off emails (trade grade, waiver tip, Chimmy insight, etc.) with title, body, and optional CTA.
- **League updates** — Matchup results, trade alerts, waiver processed, draft reminder, or generic league activity with CTA to league.

## Deliverable: Email Flows

### Implementation

| Flow | Description | Entry points |
|------|-------------|--------------|
| **Weekly summary** | HTML email with last 7 days activity summary and "Open dashboard" CTA. | Single: `sendWeeklySummaryEmail(payload)`. Batch: `runWeeklySummaryFlow({ lookbackDays, limit })`. Cron: `POST /api/cron/email-weekly` (x-cron-secret). |
| **AI insight** | HTML email with title, body, optional CTA. | `sendAIInsightEmail(payload)` — call from trade/waiver/Chimmy flows when sending an insight email. |
| **League update** | HTML email with league name, update type, title, body, CTA. | `sendLeagueUpdateEmail(payload)` — call from league event handlers (matchup, trade, waiver, draft). |

### Library: `lib/email-growth/`

- **types.ts** — `WeeklySummaryPayload`, `AIInsightPayload`, `LeagueUpdatePayload`, `LeagueUpdateType`, `EmailFlowSendResult`, `EmailFlowBatchResult`.
- **templates.ts** — `buildWeeklySummaryHtml`, `buildAIInsightHtml`, `buildLeagueUpdateHtml` (responsive HTML).
- **flows/weeklySummaryEmail.ts** — `sendWeeklySummaryEmail`, `getEligibleWeeklySummaryUserIds`, `runWeeklySummaryFlow`. Eligibility: users with engagement in last N days, with app email, and (where applicable) `EmailPreference.weeklyDigest` not false.
- **flows/aiInsightEmail.ts** — `sendAIInsightEmail`.
- **flows/leagueUpdateEmail.ts** — `sendLeagueUpdateEmail` (update types: matchup_result, trade_alert, waiver_processed, draft_reminder, league_activity).
- **index.ts** — Re-exports.

### Preferences

- **Weekly summary**: For app users we resolve email from `AppUser.email`. Legacy opt-out: `EmailPreference.weeklyDigest` (when row exists, send only if `true`). When no preference row exists, send is allowed (growth default).
- **AI insight / League update**: Can be used standalone or in combination with `dispatchNotification` (in-app + email per category). Use `sendAIInsightEmail` / `sendLeagueUpdateEmail` when you want the branded HTML flow; use `dispatchNotification` when you want in-app + email from a single call with category prefs.

### Cron

- **POST /api/cron/email-weekly** — Runs `runWeeklySummaryFlow`. Secured by `x-cron-secret` or `x-admin-secret` (CRON_SECRET, BRACKET_ADMIN_SECRET, ADMIN_PASSWORD). Optional body: `{ limit, lookbackDays }`. Schedule weekly (e.g. Monday 9 AM).

### Integration notes

- **Resend**: All flows use `getResendClient()` from `lib/resend-client` (requires `RESEND_API_KEY`, `RESEND_FROM`).
- **Existing trade alerts**: Trade alerts continue to use `sendTradeAlertEmail`; for a generic “league update” email (e.g. “New trade in League X”) use `sendLeagueUpdateEmail` with `updateType: "trade_alert"`.
- **Existing notification dispatcher**: `dispatchNotification` already sends in-app + email for categories (e.g. ai_alerts). Use email-growth flows when you want the dedicated weekly/AI/league HTML templates and batch weekly job.

## Summary

- **Email flows** implemented: weekly summary (batch + cron), AI insight (single), league update (single).
- **Templates**: Responsive HTML with CTA buttons; base URL from env.
- **Cron**: `POST /api/cron/email-weekly` for weekly summary batch; secure with CRON_SECRET (or admin secret).
