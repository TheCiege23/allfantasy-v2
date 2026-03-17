# Prompt 110 — Platform Retention + Engagement Engine (Deliverable)

## Primary goal

Increase repeat engagement via daily notifications, league reminders, AI insights, and weekly recaps.

## Features

- **Daily notifications** — In-app digest (title, body, optional deep link). Sent via `EngagementNotificationService.sendDailyDigest`. Trigger: cron or POST `/api/engagement/notify/daily`.
- **League reminders** — Reminder tied to a league with deep link to `/app/league/{leagueId}`. Sent via `sendLeagueReminder`. Trigger: cron or POST `/api/engagement/notify/league-reminder`.
- **AI insights** — Notifications for AI-related prompts (e.g. trade tip, waiver suggestion). Sent via `sendAIInsight`. Trigger: server logic or POST `/api/engagement/notify/ai-insight`.
- **Weekly recaps** — Generated from `UserActivityTracker` data; summary of league views, bracket views, AI uses. Sent via `WeeklyRecapGenerator.generateAndSendWeeklyRecap`. Trigger: GET/POST `/api/engagement/weekly-recap` (GET = preview, POST = send).

## Core modules

### EngagementNotificationService (`lib/engagement-engine/EngagementNotificationService.ts`)

- `sendDailyDigest({ userId, title, body?, actionHref?, actionLabel?, leagueId? })` — Creates platform notification type `daily_digest`; meta includes `actionHref` (validated via `getDeepLinkRedirect`), `actionLabel`, `leagueId`.
- `sendLeagueReminder({ userId, leagueId, title, body?, actionLabel? })` — Type `league_reminder`; meta includes `leagueId`, `actionHref` = `/app/league/{leagueId}`.
- `sendAIInsight({ userId, title, body?, actionHref?, actionLabel?, leagueId? })` — Type `ai_insight`; meta includes `actionHref` (default `/af-legacy` or league).
- `sendWeeklyRecap({ userId, title, body, actionHref, actionLabel, meta? })` — Type `weekly_recap`; meta includes `actionHref`, `actionLabel`, and optional stats.

All links are normalized with `getDeepLinkRedirect` so only allowed internal paths are used.

### UserActivityTracker (`lib/engagement-engine/UserActivityTracker.ts`)

- `recordEngagementEvent(userId, eventType, meta?)` — Writes to `EngagementEvent` table. Event types: `league_view`, `bracket_view`, `ai_used`, `trade_analyzer`, `mock_draft`, `waiver_ai`, `chimmy_chat`, `lineup_edit`, `draft_completed`.
- `getActivitySummary(userId, since)` — Returns `{ leagueViews, bracketViews, aiUses, lastActiveAt }` for a time range.
- `getActiveDaysCount(userId, lastDays)` — Count of distinct days with activity.

### WeeklyRecapGenerator (`lib/engagement-engine/WeeklyRecapGenerator.ts`)

- `buildWeeklyRecap(userId)` — Uses `getActivitySummary(userId, since)` for last 7 days; returns `WeeklyRecapPayload` (title, body, actionHref, actionLabel, optional stats).
- `generateAndSendWeeklyRecap(userId)` — Builds recap and calls `sendWeeklyRecap`.

## Schema

- **EngagementEvent** — `id`, `userId` (FK to AppUser), `eventType`, `meta` (Json), `createdAt`. Indexes: `(userId, createdAt)`, `(userId, eventType)`, `(eventType)`.
- Migration: `prisma/migrations/20260336000000_add_engagement_events/migration.sql`.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/engagement/activity` | Session | Body: `{ eventType, meta? }`. Records engagement event. |
| GET | `/api/engagement/weekly-recap` | Session | Returns preview recap (no send). |
| POST | `/api/engagement/weekly-recap` | Session | Generates and sends weekly recap notification. |
| POST | `/api/engagement/notify/daily` | Session | Body: `{ title?, body?, actionHref?, actionLabel?, leagueId? }`. Sends daily digest. |
| POST | `/api/engagement/notify/league-reminder` | Session | Body: `{ leagueId, title?, body?, actionLabel? }`. Sends league reminder. |
| POST | `/api/engagement/notify/ai-insight` | Session | Body: `{ title, body?, actionHref?, actionLabel?, leagueId? }`. Sends AI insight. |

## Mandatory UI click audit — notification links and deep linking

- **Notification center** — Notifications are listed in the shared notification panel (bell). Each row uses `getNotificationDestination(n)` from `NotificationRouteResolver` for the click target.
- **Deep link resolution** — `NotificationRouteResolver.getNotificationDestination(n)` was extended to check `meta.actionHref` first (and `meta.actionLabel`). If `meta.actionHref` is a string starting with `/`, it is returned as `href` (label from `meta.actionLabel` or "Open"). This covers all engagement notification types (`daily_digest`, `league_reminder`, `ai_insight`, `weekly_recap`).
- **Allowed paths** — Engagement links are normalized with `getDeepLinkRedirect(path, default)` in `EngagementNotificationService`; only paths allowed by `DeepLinkHandler.ALLOWED_DEEP_LINK_PREFIXES` are used (e.g. `/dashboard`, `/app`, `/leagues`, `/brackets`, `/af-legacy`, etc.).
- **Per-type behavior:**
  - **daily_digest** — meta may include `actionHref`, `actionLabel`, `leagueId`. Click → `actionHref` or `/app/league/{leagueId}` or `/dashboard`.
  - **league_reminder** — meta includes `leagueId`, `actionHref` = `/app/league/{leagueId}`, `actionLabel` = "Open league". Click → league page.
  - **ai_insight** — meta includes `actionHref` (default `/af-legacy` or league), `actionLabel`. Click → AI product or league.
  - **weekly_recap** — meta includes `actionHref`, `actionLabel`. Click → dashboard or custom path.
- **Notification panel** — Notification row is a `Link` to `getNotificationDestination(n).href` when present; clicking navigates and closes the panel. Icons for `daily_digest`, `league_reminder`, `ai_insight`, `weekly_recap` use Bell (added in `NotificationPanel` TYPE_ICONS).

## QA — Verify notification routing

1. **Activity recording** — POST `/api/engagement/activity` with `{ "eventType": "league_view", "meta": { "leagueId": "L1" } }` as logged-in user; then GET `/api/engagement/weekly-recap` and confirm recap reflects activity (or at least no error).
2. **Weekly recap** — POST `/api/engagement/weekly-recap`; open notification center and confirm a "Your weekly recap" (or similar) notification appears; click it and confirm navigation to dashboard (or configured actionHref).
3. **Daily digest** — POST `/api/engagement/notify/daily` with `{ "title": "Test digest", "actionHref": "/af-legacy" }`; in notification center, click the notification and confirm navigation to `/af-legacy`.
4. **League reminder** — POST `/api/engagement/notify/league-reminder` with `{ "leagueId": "<valid-league-id>", "title": "Reminder" }`; click notification and confirm navigation to `/app/league/<leagueId>`.
5. **AI insight** — POST `/api/engagement/notify/ai-insight` with `{ "title": "AI tip", "actionHref": "/chimmy" }`; click and confirm navigation to `/chimmy`.
6. **Invalid deep link** — Ensure `actionHref` like `https://evil.com` or `//evil.com` is rejected (service uses `getDeepLinkRedirect`, which falls back to default path).

## Files touched

- `prisma/schema.prisma` — Added `EngagementEvent` model; `AppUser` relation `engagementEvents`.
- `prisma/migrations/20260336000000_add_engagement_events/migration.sql` — New.
- `lib/engagement-engine/` — types, UserActivityTracker, EngagementNotificationService, WeeklyRecapGenerator, index.
- `lib/notification-center/NotificationRouteResolver.ts` — Prefer `meta.actionHref` / `meta.actionLabel` for destination.
- `components/notifications/NotificationPanel.tsx` — TYPE_ICONS for daily_digest, league_reminder, ai_insight, weekly_recap.
- `app/api/engagement/activity/route.ts` — POST record event.
- `app/api/engagement/weekly-recap/route.ts` — GET preview, POST send.
- `app/api/engagement/notify/daily/route.ts` — POST send daily digest.
- `app/api/engagement/notify/league-reminder/route.ts` — POST send league reminder.
- `app/api/engagement/notify/ai-insight/route.ts` — POST send AI insight.
