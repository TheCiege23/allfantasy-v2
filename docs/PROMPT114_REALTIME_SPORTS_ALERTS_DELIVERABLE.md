# Prompt 114 — Real-Time Sports Alerts (Deliverable)

## Primary goal

Notify users of important events:

- **Player injuries** — injury_alert type; link to player or league context.
- **Starting lineup changes** — lineup_alert type.
- **Trade rumors / major performances** — performance_alert type (and injury for health).

## Alert types

- **injury_alert** — Player injury; severity high; meta includes actionHref, playerId, leagueId, playerName, sport.
- **performance_alert** — Game performance; severity medium.
- **lineup_alert** — Lineup change; severity medium.

## Core modules

### SportsAlertService (`lib/sports-alerts/SportsAlertService.ts`)

- **createSportsAlert(userId, payload)** — Creates a PlatformNotification with type, title, body, meta (actionHref, actionLabel, leagueId, playerId, playerName, sport). actionHref is normalized via getDeepLinkRedirect so alerts route to allowed player or league pages.
- **buildInjuryAlert(params)**, **buildPerformanceAlert(params)**, **buildLineupAlert(params)** — Helpers that return SportsAlertPayload for the dispatcher.

### AlertDispatcher (`lib/sports-alerts/AlertDispatcher.ts`)

- **dispatchSportsAlert(payload, userIds)** — For each userId, loads UserAlertPreferences; if the corresponding toggle (injuryAlerts, performanceAlerts, lineupAlerts) is on, calls createSportsAlert. Returns { sent, skipped }.
- **isSportsAlertType(type)** — Type guard for notification types.

### UserAlertPreferences (`lib/sports-alerts/UserAlertPreferences.ts`)

- **getAlertPreferences(userId)** — Reads injury_alerts, performance_alerts, lineup_alerts from UserProfile.notificationPreferences (via getSettingsProfile); returns { injuryAlerts, performanceAlerts, lineupAlerts } (inApp).
- **setAlertPreferences(userId, preferences)** — Merges into notificationPreferences.categories and calls updateUserProfile.

## API

- **GET /api/alerts/preferences** — Returns { injuryAlerts, performanceAlerts, lineupAlerts } (auth required).
- **PATCH /api/alerts/preferences** — Body: { injuryAlerts?, performanceAlerts?, lineupAlerts? }. Saves to profile (auth required).
- **POST /api/alerts/dispatch** — Body: { type, title, body, actionHref, actionLabel?, leagueId?, playerId?, playerName?, sport? }. Dispatches one alert to the current user (for QA); respects their preferences (auth required).

## UI

- **Notification center** — Sports alerts appear in the existing bell dropdown (PlatformNotification). Types injury_alert, performance_alert, lineup_alert use AlertCircle/Bell/MessageSquare icons. **Alert notification click** — Each row uses getNotificationDestination(n); meta.actionHref is set by SportsAlertService, so the click goes to the correct player or league page (e.g. /app/league/xxx, /af-legacy, /leagues/xxx).
- **Alert settings page** — **/alerts/settings**: Toggles for “Player injury alerts”, “Game performance alerts”, “Starting lineup alerts”. Loads from GET /api/alerts/preferences; save via PATCH. Link to “All notification settings” (Settings > Notifications). The same three categories appear under Settings > Notifications (injury_alerts, performance_alerts, lineup_alerts) via NOTIFICATION_CATEGORY_IDS.
- **Alert dismissal** — Alerts are platform notifications; **dismissal** = “Mark as read” (existing markPlatformNotificationRead / markAllPlatformNotificationsRead). Notification panel marks single or all read; no separate “dismiss” beyond read state.

## Mandatory UI click audit

| Element | Location | Behavior |
|--------|----------|----------|
| **Alert notification click** | Notification panel (bell) | Each notification row is a Link to getNotificationDestination(n).href. Sports alerts have meta.actionHref set by SportsAlertService → normalized to allowed path → user goes to correct player or league page. |
| **Alert settings page** | /alerts/settings | Toggles for injury, performance, lineup; Save calls PATCH /api/alerts/preferences. “All notification settings” links to /settings?tab=notifications. |
| **Alert dismissal** | Notification panel | “Mark all read” / per-item read state uses existing markAsRead; alerts are PlatformNotifications so readAt is set; no extra dismiss flow. |

**Verify alerts route to correct player or league page:** When creating an alert, caller sets actionHref (e.g. /app/league/{leagueId}, /af-legacy?player=xxx). SportsAlertService passes it through getDeepLinkRedirect; NotificationRouteResolver returns meta.actionHref as href when present. So the click destination is the supplied actionHref when it is an allowed path.

## QA — Alert delivery timing

1. **Preferences** — GET /api/alerts/preferences returns booleans; PATCH updates them; /alerts/settings UI reflects and saves.
2. **Dispatch** — POST /api/alerts/dispatch with type injury_alert, title, actionHref; user with injuryAlerts on receives one new notification; user with injuryAlerts off does not (dispatcher skips).
3. **Timing** — Alert “delivery” is creation of the PlatformNotification (createSportsAlert). createdAt on that row is the delivery time; no separate queue. For real-time pipelines, call dispatchSportsAlert when an event occurs; QA can assert notification.createdAt is near the request time.
4. **Click** — After dispatch, open notification center; click the alert; confirm navigation to actionHref (e.g. league page).

## Files touched

- `lib/notification-settings/types.ts` — Added injury_alerts, performance_alerts, lineup_alerts to NotificationCategoryId and labels.
- `lib/sports-alerts/types.ts` — SportsAlertType, SportsAlertPayload, UserAlertPreferences.
- `lib/sports-alerts/UserAlertPreferences.ts` — get/set from profile notificationPreferences.
- `lib/sports-alerts/SportsAlertService.ts` — createSportsAlert, build*Alert helpers.
- `lib/sports-alerts/AlertDispatcher.ts` — dispatchSportsAlert, isSportsAlertType.
- `lib/sports-alerts/index.ts` — Exports.
- `lib/routing/DeepLinkHandler.ts` — Allowed /alerts, /feed.
- `app/api/alerts/preferences/route.ts` — GET/PATCH.
- `app/api/alerts/dispatch/route.ts` — POST (single-user dispatch for QA).
- `app/alerts/settings/page.tsx` — Alert settings page.
- `app/alerts/settings/AlertSettingsClient.tsx` — Toggles and save.
- `components/notifications/NotificationPanel.tsx` — Icons for injury_alert, performance_alert, lineup_alert.
- `docs/PROMPT114_REALTIME_SPORTS_ALERTS_DELIVERABLE.md` — This deliverable.
