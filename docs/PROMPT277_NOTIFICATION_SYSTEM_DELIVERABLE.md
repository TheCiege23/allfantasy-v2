# PROMPT 277 — Notification System Deliverable

## Objective

Keep users engaged with a unified notification system supporting **in-app**, **email (Resend)**, and **SMS (Twilio)**.

## Alert Types Supported

- **Draft alerts** — on the clock, timer, trade offers, paused/resumed, auto-pick, queue player unavailable, starting soon, etc. (category: `draft_alerts`)
- **Trade alerts** — use categories `trade_proposals` and `trade_accept_reject` (existing; wire call sites to `dispatchNotification` where applicable)
- **Waiver alerts** — waiver run completed; all league members notified (category: `waiver_processing`)
- **AI alerts** — AI insights (category: `ai_alerts`)
- **Chat mentions** — @username in league/shared chat (category: `chat_mentions`)
- **@everyone commissioner alerts** — commissioner broadcast to league (category: `commissioner_alerts`)

## Channels

| Channel | When used |
|--------|------------|
| **In-app** | Always available; stored in `PlatformNotification`. |
| **Email** | When user has email and category preference has email enabled; sent via Resend (`sendNotificationEmail`). |
| **SMS** | When user has verified phone and category preference has SMS enabled; sent via Twilio (`sendSms`). |

## Flow

1. **Event** (e.g. draft on the clock, waiver run, mention, commissioner broadcast, AI insight) triggers a call to **`dispatchNotification`** in `lib/notifications/NotificationDispatcher.ts`.
2. For each target user, the dispatcher:
   - Loads profile (email, phone, `phoneVerifiedAt`, `notificationPreferences`) via `getSettingsProfile`.
   - Resolves preferences with `resolveNotificationPreferences` and checks `getDeliveryMethodAvailability`.
   - If category is enabled and **in-app** is on → creates in-app notification via `createPlatformNotification`.
   - If category is enabled and **email** is on and user has email → sends email via `sendNotificationEmail` (Resend).
   - If category is enabled and **SMS** is on and user has verified phone → sends SMS via `sendSms` (Twilio).

## Key Files

- **Dispatcher:** `lib/notifications/NotificationDispatcher.ts` — `dispatchNotification({ userIds, category, type, title, body?, actionHref?, actionLabel?, meta?, severity? })`
- **Categories & prefs:** `lib/notification-settings/types.ts` — `NotificationCategoryId`, `NOTIFICATION_CATEGORY_IDS`, `NOTIFICATION_CATEGORY_LABELS`; includes `draft_alerts` (in array so it appears in Settings > Notifications)
- **Email:** `lib/resend-client.ts` — `sendNotificationEmail(to, subject, bodyHtml, actionHref?, actionLabel?)`
- **SMS:** `lib/twilio-client.ts` — `sendSms(toPhone, body)` (no throw if Twilio not configured)
- **Wiring:**
  - Draft: `lib/draft-notifications/DraftNotificationService.ts` — all draft notifications go through dispatcher with `draft_alerts`
  - Trade: `app/api/trade/propose/route.ts` — after creating proposal, dispatcher with `trade_proposals` to recipient (roster owner)
  - Chat mentions: `app/api/shared/chat/mentions/route.ts` — dispatcher with `chat_mentions`
  - Commissioner @everyone: `app/api/commissioner/broadcast/route.ts` — after posting to chat, dispatcher with `commissioner_alerts` to all league members
  - Waiver: `lib/waiver-wire/run-hooks.ts` — after waiver run, dispatcher with `waiver_processing` to all league members
  - AI: `lib/engagement-engine/EngagementNotificationService.ts` — `sendAIInsight` uses dispatcher with `ai_alerts`

## Settings

- **Settings > Notifications** (and profile `notificationPreferences`) list all categories from `NOTIFICATION_CATEGORY_IDS`, including **Draft alerts**. Per-category toggles: enabled, in-app, email, SMS (SMS only when phone is verified).

## Environment

- **Resend:** `RESEND_API_KEY`, optional `RESEND_FROM`
- **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_PHONE_NUMBER`, and either `TWILIO_AUTH_TOKEN` or `TWILIO_API_KEY` + `TWILIO_API_SECRET`. If not set, SMS is skipped without failing.
