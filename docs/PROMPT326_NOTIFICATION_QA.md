# PROMPT 326 — Notification QA

## Objective

Ensure notifications work across all channels: **email**, **SMS**, **in-app**, and **push**.

---

## Verification Summary

### Email

- **Provider:** Resend (`lib/resend-client.ts`). Used for:
  - Early access signup confirmations, admin signup alerts
  - Auth: verify-email, password reset, admin magic link
  - League sync completion, feedback confirmation, trade alerts
  - **Unified notification channel:** `sendNotificationEmail()` used by `NotificationDispatcher` for draft, chat mention, commissioner, and other in-preference notifications
- **Config:** `RESEND_API_KEY`, optional `RESEND_FROM`. `getResendClient()` throws if `RESEND_API_KEY` is missing.
- **Fixes applied:**
  - Admin email broadcast and admin send-reminders now catch Resend init errors and return **503** with message `"Email service not configured. Set RESEND_API_KEY."` instead of 500, so the UI can show a clear error.

### SMS

- **Provider:** Twilio (`lib/twilio-client.ts`). Used for:
  - Phone verification: `POST /api/verify/phone/start` (verification code)
  - **Unified notification channel:** `sendSms()` in `NotificationDispatcher` when user has SMS enabled for a category and verified phone
- **Config:** `TWILIO_ACCOUNT_SID`, `TWILIO_PHONE_NUMBER`, and either `TWILIO_AUTH_TOKEN` or `TWILIO_API_KEY` + `TWILIO_API_SECRET`. For verify: `TWILIO_VERIFY_SERVICE_SID`.
- **Behavior:** `sendSms()` returns `false` when Twilio env vars are missing or send fails; it does not throw. Dispatcher continues without crashing.

### In-app

- **Storage:** `PlatformNotification` table (unified); fallback from `BracketFeedEvent` and `TradeNotification` when unified table is empty.
- **API:**
  - `GET /api/shared/notifications?limit=40` — returns `{ status: 'ok', notifications: [] }` (empty when unauthenticated).
  - `PATCH /api/shared/notifications/read-all` — mark all read (401 when unauthenticated).
  - `PATCH /api/shared/notifications/[notificationId]/read` — mark one read.
- **UI:** `NotificationBell`, `NotificationPanel`, `useNotifications` hook; badge count and mark-as-read/mark-all-as-read.
- **Fixes applied:**
  - **Mark-as-read correctness:** `markPlatformNotificationRead()` now returns `true` only when at least one row was updated (`updateMany` count > 0). For fallback IDs (e.g. `bracket_feed_*`, `trade_alert_*`) there is no row in `PlatformNotification`, so the API returns 500 and the client reverts the optimistic read, keeping UI state consistent after refresh.

### Push

- **Provider:** Web Push (VAPID) via `lib/push-notifications` (`web-push`). Used by `NotificationDispatcher` when category is push-enabled (`isPushCategory`).
- **Config:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, optional `VAPID_MAILTO`. Subscriptions stored in `WebPushSubscription`.
- **Behavior:** `sendPushToUser()` catches VAPID init errors and returns per-subscription `{ ok: false, error: "VAPID not configured" }` without throwing. Dispatcher already wraps in `.catch()`.

---

## Fixes Delivered

| Area | Fix |
|------|-----|
| **Email** | Admin broadcast and send-reminders return 503 with clear message when Resend is not configured (no 500 from missing `RESEND_API_KEY`). |
| **In-app** | Mark single notification as read returns 500 only when no row was updated (e.g. fallback IDs); client reverts optimistic read so list and badge stay correct. |

---

## Already Robust (No Code Change)

- **Email (dispatcher):** `sendNotificationEmail()` catches errors and returns `{ ok: false, error }`; no throw.
- **SMS:** `sendSms()` returns `false` when Twilio is not configured or send fails.
- **Push:** `sendPushToUser()` handles missing VAPID and returns error results per subscription.
- **In-app GET:** Unauthenticated users get empty list; limit is capped (e.g. 100) in `getPlatformNotifications`.

---

## Recommendations

1. **Env checklist:** Ensure `RESEND_API_KEY` (and optional `RESEND_FROM`) for email; Twilio vars for SMS and phone verify; VAPID keys for push.
2. **Manual test:** Trigger a draft notification (or other dispatcher event) with email/SMS/in-app/push enabled in preferences and confirm each channel when config is present.
3. **Fallback notifications:** Items from bracket feed or trade alerts use synthetic IDs; “mark as read” does not persist for those. Consider migrating them into `PlatformNotification` or persisting read state elsewhere if persistent read is required.

---

## Deliverable Summary

- **Email:** Admin notification routes no longer 500 when Resend is unconfigured; they return 503 and a clear error message.
- **In-app:** Mark-as-read API and service now reflect whether a row was updated so the client can keep read state and badge count correct (including after refresh for fallback items).
- **SMS and push:** Verified existing behavior (no throw when unconfigured; dispatcher safe).
- **Doc:** This file records what was verified and what was fixed for PROMPT 326.
