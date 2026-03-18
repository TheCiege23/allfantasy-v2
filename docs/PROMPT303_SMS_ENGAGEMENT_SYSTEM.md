# PROMPT 303 — SMS Engagement System

## Objective

Send **critical alerts** via SMS.

## Send

- **Draft alerts** — On the clock, timer warning, draft starting soon, auto-pick, queue player taken, trade offer, paused/resumed.
- **Trade alerts** — New proposal, trade accepted, trade declined.
- **Matchup reminders** — Lineup lock soon, lineup locked, matchup result, matchup reminder.

## Deliverable: SMS System

### Implementation

SMS is delivered via **Twilio** (`lib/twilio-client`: `sendSms(toPhone, body)`). Delivery is gated by:

- User has **verified phone** (Settings / notification delivery).
- User has **SMS enabled** for the relevant notification category (Settings > Notifications).
- **NotificationDispatcher** sends in-app + email + SMS per category; SMS is sent when `category.sms` is true and phone is verified.

### Library: `lib/sms-engagement/`

| File | Purpose |
|------|--------|
| **types.ts** | `DraftAlertPayload`, `TradeAlertPayload`, `MatchupReminderPayload`; alert types; `SmsSendResult`. |
| **messages.ts** | SMS-optimized copy: `buildDraftAlertMessage`, `buildTradeAlertMessage`, `buildMatchupReminderMessage` (return `{ title, body }`); `buildDraftAlertSmsText`, `buildTradeAlertSmsText`, `buildMatchupReminderSmsText` (single string for SMS-only). |
| **sendAlerts.ts** | `sendDraftAlert(userIds, payload, options)` — dispatcher with `draft_alerts`. `sendTradeAlert(userIds, payload, options)` — dispatcher with `trade_proposals` or `trade_accept_reject`. `sendMatchupReminder(userIds, payload, options)` — dispatcher with `lineup_reminders` or `matchup_results`. All use SMS-friendly title/body and optional `actionHref` for deep link. |
| **sendCriticalSms.ts** | `sendCriticalSms(userId, category, message)` — SMS only (no in-app/email). Checks phone + category SMS pref, then `sendSms`. `sendCriticalSmsToUsers(userIds, category, message)` — batch. Use for cron (e.g. “Lineup locks in 15 min”) when only SMS is desired. |
| **index.ts** | Re-exports. |

### Categories (notification preferences)

- **Draft alerts** → `draft_alerts`
- **Trade alerts** → `trade_proposals` (new proposal), `trade_accept_reject` (accepted/rejected)
- **Matchup reminders** → `lineup_reminders` (lock soon, locked, reminder), `matchup_results` (result)

Users enable/disable and set in-app / email / SMS per category in Settings > Notifications. SMS is only sent when the user has a verified phone and has turned on SMS for that category.

### Usage

1. **Full notification (in-app + email + SMS)**  
   Use `sendDraftAlert`, `sendTradeAlert`, or `sendMatchupReminder`. They build title/body from `messages.ts` and call `dispatchNotification`, so SMS is sent when enabled.

2. **SMS only (e.g. cron)**  
   Build message with `buildMatchupReminderSmsText` (or equivalent), then `sendCriticalSms(userId, "lineup_reminders", message)`.

3. **Existing draft/trade flows**  
   - Draft: `DraftNotificationService.createDraftNotification` already uses `dispatchNotification(draft_alerts)` — SMS is sent when enabled.  
   - Trade: `app/api/trade/propose/route.ts` already uses `dispatchNotification(trade_proposals)`.  
   For consistent SMS copy, callers can switch to `sendDraftAlert` / `sendTradeAlert` from this module; otherwise existing flows already trigger SMS via the dispatcher.

### Dependencies

- `lib/twilio-client` — `sendSms` (requires `TWILIO_ACCOUNT_SID`, `TWILIO_PHONE_NUMBER`, and `TWILIO_AUTH_TOKEN` or API key).
- `lib/notifications/NotificationDispatcher` — in-app + email + SMS by category.
- `lib/notification-settings` — categories and preference resolution.
- `lib/user-settings` — profile (phone, phoneVerifiedAt, notificationPreferences).

## Summary

- **SMS system** provides draft alerts, trade alerts, and matchup reminders via Twilio, respecting notification categories and verified phone.
- **Message builders** keep SMS copy short and consistent; **sendAlerts** uses the dispatcher for full-channel delivery; **sendCriticalSms** supports SMS-only (e.g. cron).
