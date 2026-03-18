# PROMPT 304 — Push Notifications

## Objective

Add **push notifications** (browser web push).

## Send

- **AI alerts** — Notifications for AI insights (category: `ai_alerts`).
- **Chat mentions** — When the user is @mentioned (category: `chat_mentions`).
- **League updates** — Matchup results, lineup reminders, league drama, commissioner alerts (categories: `matchup_results`, `lineup_reminders`, `league_drama`, `commissioner_alerts`).

## Deliverable: Push System

### Implementation

When a notification is dispatched for one of the push-enabled categories, the **NotificationDispatcher** creates the in-app notification (and email/SMS per prefs) and also calls **sendPushToUser** for each recipient. Users receive a browser push only if they have **subscribed** via the push subscription API (opt-in).

### Library: `lib/push-notifications/`

| File | Purpose |
|------|--------|
| **types.ts** | `PushPayload`, `PushSubscriptionRecord`, `PushSubscriptionInput`, `SendPushResult`. |
| **push-service.ts** | `savePushSubscription(userId, input)`, `removePushSubscription(userId, endpoint)`, `getPushSubscriptions(userId)`, `sendPushToUser(userId, payload)`. Uses **web-push** (VAPID) to send; removes expired subscriptions (410/404). |
| **index.ts** | Re-exports; `PUSH_NOTIFICATION_CATEGORIES`, `isPushCategory(category)`. |

### Categories that trigger push

- `ai_alerts`
- `chat_mentions`
- `matchup_results`
- `lineup_reminders`
- `league_drama`
- `commissioner_alerts`

### API

- **POST /api/push/subscribe** (auth) — Body: `{ endpoint, keys: { p256dh, auth }, userAgent? }`. Saves or updates subscription for the current user.
- **POST /api/push/unsubscribe** (auth) — Body: `{ endpoint }`. Removes subscription.
- **GET /api/push/vapid-public-key** — Returns `{ publicKey }` (no auth). Used by the client to subscribe.

### Client

- **Service worker**: `public/sw-push.js` — Listens for `push` and shows `Notification`; `notificationclick` opens `payload.href` (or existing app window).
- **Hook**: `hooks/usePushSubscription.ts` — `requestAndSubscribe()` requests permission, registers SW, subscribes with VAPID key, POSTs to `/api/push/subscribe`. `unsubscribe()` removes subscription. Use in Settings or a “Enable push” button.

### Database

- **WebPushSubscription** — `userId`, `endpoint` (unique), `p256dh`, `auth`, `userAgent?`, `createdAt`. Relation to `AppUser`. Run `prisma migrate dev` (or `db:push`) after adding the model.

### Dependencies

- **web-push** (npm) — Sends push messages using VAPID keys.
- **Env**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (generate with `npx web-push generate-vapid-keys`). Optional: `VAPID_MAILTO` (e.g. `mailto:noreply@allfantasy.ai`).

### Flow

1. User clicks “Enable push” (or similar) → hook calls `Notification.requestPermission()`, registers `sw-push.js`, subscribes with VAPID public key, POSTs subscription to `/api/push/subscribe`.
2. When the app dispatches a notification for an AI alert, chat mention, or league update, it calls `sendPushToUser(userId, { title, body, href, tag })`.
3. Backend loads all `WebPushSubscription` rows for that user and sends each with **web-push**; payload includes `href` so the service worker can open the app on click.

## Summary

- **Push system** adds browser web push for AI alerts, chat mentions, and league updates.
- **Opt-in**: Users must subscribe via the push API; then any notification in the push categories is also sent as a push.
- **Stack**: web-push (VAPID), Prisma `WebPushSubscription`, dispatcher integration, `/api/push/*`, `sw-push.js`, `usePushSubscription` hook.
