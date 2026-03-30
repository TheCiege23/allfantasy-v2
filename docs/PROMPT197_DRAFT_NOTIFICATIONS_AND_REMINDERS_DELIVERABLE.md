# PROMPT 197 — Draft Notifications and Reminders Deliverable

## Overview

Draft notifications are **deterministic and event-driven**. No AI required for content; optional AI only for premium rewriting/summarizing. All events use rules-based title/body and in-app delivery; optional email/SMS/push can be wired to the same events.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## 1. Notification Events

| Event | Trigger | Recipient |
|-------|---------|-----------|
| **draft_on_the_clock** | After any pick is submitted | Next manager (roster owner) |
| **draft_approaching_timeout** | Slow/runtime timer threshold (deterministic) or POST /draft/notify with rosterId | That roster's owner |
| **draft_auto_pick_fired** | Auto-pick or commissioner force autopick | Roster owner who was auto-picked |
| **draft_queue_player_unavailable** | Queue contains drafted/unavailable players during auto-pick fallback | Roster owner |
| **draft_paused** | Commissioner pauses draft | All league members |
| **draft_resumed** | Commissioner resumes draft | All league members |
| **draft_trade_offer_received** | Draft pick trade proposal created | Receiver roster owner |
| **draft_ai_trade_review_available** | Draft trade proposal creates private AI review | Receiver roster owner |
| **draft_orphan_ai_assigned** | Commissioner changes orphan manager settings | All league members |
| **draft_auction_outbid** | New bid replaces previous high bidder in auction route | Previous high bidder |
| **draft_slow_reminder** | Via POST /draft/notify (cron/client) | All league members |
| **draft_starting_soon** | Draft session `start` action | All league members |

---

## 2. Event Trigger Wiring

| Location | Event | Action |
|----------|--------|--------|
| `POST /api/leagues/[leagueId]/draft/pick` | draft_on_the_clock | After successful submitPick, call `notifyOnTheClockAfterPick(leagueId)`. |
| `POST /api/leagues/[leagueId]/draft/controls` (pause) | draft_paused | After pauseDraftSession, call `notifyDraftPaused(leagueId)`. |
| `POST /api/leagues/[leagueId]/draft/controls` (resume) | draft_resumed | After resumeDraftSession, call `notifyDraftResumed(leagueId)`. |
| `POST /api/leagues/[leagueId]/draft/controls` (force_autopick) | draft_auto_pick_fired + draft_on_the_clock | Notify roster owner then next on clock. |
| `POST /api/leagues/[leagueId]/draft/autopick-expired` | draft_auto_pick_fired + draft_on_the_clock | Notify roster owner then next on clock. |
| `POST /api/leagues/[leagueId]/draft/trade-proposals` | draft_trade_offer_received + draft_ai_trade_review_available | After create proposal and private AI review payload build, notify receiver with both deterministic events. |
| `POST /api/leagues/[leagueId]/draft/auction/bid` | draft_auction_outbid | If previous high bidder exists and a new bidder overtakes, notify previous bidder. |
| `POST /api/leagues/[leagueId]/draft/session` (`start`) | draft_starting_soon | On successful start action, notify all league members. |
| `PATCH /api/leagues/[leagueId]/draft/settings` | draft_orphan_ai_assigned | If orphan manager enable/mode changes, notify league members. |
| `POST /api/leagues/[leagueId]/draft/notify` | All others | Body: `{ eventType, payload? }`. Commissioner or cron can call for approaching_timeout, slow_reminder, starting_soon, orphan_ai_assigned, auction_outbid. |

---

## 3. Backend: Draft Notification Service

| File | Purpose |
|------|---------|
| `lib/draft-notifications/types.ts` | `DRAFT_NOTIFICATION_EVENT_TYPES`, `DraftNotificationEventType`, `DraftNotificationPayload`. |
| `lib/draft-notifications/DraftNotificationService.ts` | `getAppUserIdForRoster`, `getLeagueMemberAppUserIds`, `getTitleAndBody` (deterministic), `createDraftNotification`, `createDraftNotificationForUsers`, `notifyOnTheClockAfterPick`, `notifyDraftPaused`, `notifyDraftResumed`, `notifyAutoPickFired`, `notifyQueuePlayerUnavailable`, `notifyApproachingTimeout`, `notifyDraftStartingSoon`, `notifyOrphanAiManagerAssigned`, `notifyAuctionOutbid`, `notifyDraftAiTradeReviewAvailable`. |
| `lib/draft-notifications/index.ts` | Re-exports. |

- Notifications are created via existing `createPlatformNotification` (PlatformNotification table). Each notification has `meta.actionHref` = `/app/league/[leagueId]/draft` and `meta.actionLabel` = "Open draft".
- Orphan rosters (platformUserId starting with `orphan-`) are skipped for per-roster notifications.

---

## 4. Notification UI

- **NotificationRouteResolver** (`lib/notification-center/NotificationRouteResolver.ts`): If `meta.leagueId` and `n.type` starts with `draft_`, destination is `/app/league/[leagueId]/draft` with label "Open draft". Draft notifications also set `meta.actionHref` so the generic actionHref branch is used first.
- **NotificationPanel** (`components/notifications/NotificationPanel.tsx`): Added `TYPE_ICONS` for all `draft_*` types (Clock, Bell, AlertCircle, Pause, Play, Handshake). Read/unread and "Mark read" unchanged. Clicking a notification uses `getNotificationDestination` so draft notifications open the draft room.
- **Channels:** In-app only is wired. No fake UI for email/SMS/push; when those channels are configured, they can subscribe to the same events (optional integration).

---

## 5. API

| Method | Route | Auth | Purpose |
|--------|--------|------|---------|
| POST | `/api/leagues/[leagueId]/draft/notify` | canAccessLeagueDraft | Emit a draft notification. Body: `{ eventType, payload? }`. eventType: draft_approaching_timeout, draft_queue_player_unavailable, draft_ai_trade_review_available, draft_slow_reminder, draft_starting_soon, draft_orphan_ai_assigned, draft_auction_outbid. Roster-targeted events use `payload.rosterId`. |

---

## 6. Enforcement and Channels

- **Deterministic:** Title and body for each event type are computed in `getTitleAndBody` from payload (league name, pick label, player name, etc.). No LLM calls.
- **Channel-safe:** Only in-app notifications are created. No dead actions for email/SMS/push in the UI; if those are added later, they can call the same service or subscribe to the same events.
- **AI optional:** For premium “rewrite” or “summarize” notifications, a separate layer can post-process the title/body before sending; not required for correctness.

---

## 7. Mandatory Click Audit (QA Checklist)

- [x] **Notification opens correct destination:** Draft notification links route to `/app/league/[leagueId]/draft` through notification route resolver and actionHref meta.
- [x] **Read/unread state works:** Mark-read and mark-all-read update optimistic UI and backend read state endpoints.
- [x] **Disabled channels do not show dead actions:** Notification channel renderer hides unavailable email/SMS toggles; no dead controls for unconfigured channels.
- [x] **No broken reminder actions:** `draft_slow_reminder` is emitted and opens draft destination via notification panel links.

---

## 8. Files Touched

- **New:** `lib/draft-notifications/types.ts`, `lib/draft-notifications/DraftNotificationService.ts`, `lib/draft-notifications/index.ts`, `app/api/leagues/[leagueId]/draft/notify/route.ts`.
- **Modified:** `app/api/leagues/[leagueId]/draft/pick/route.ts` (notifyOnTheClockAfterPick after submit), `app/api/leagues/[leagueId]/draft/controls/route.ts` (notifyDraftPaused, notifyDraftResumed, notifyAutoPickFired + notifyOnTheClockAfterPick + queue-unavailable during force autopick), `app/api/leagues/[leagueId]/draft/autopick-expired/route.ts` (notifyAutoPickFired, notifyOnTheClockAfterPick, queue-unavailable), `app/api/leagues/[leagueId]/draft/trade-proposals/route.ts` (trade_offer + ai_trade_review notifications), `app/api/leagues/[leagueId]/draft/auction/bid/route.ts` (outbid notification), `app/api/leagues/[leagueId]/draft/session/route.ts` (starting-soon notification), `app/api/leagues/[leagueId]/draft/settings/route.ts` (orphan manager assignment notification), `lib/live-draft-engine/slow-draft/SlowDraftRuntimeService.ts` (approaching-timeout + slow reminder trigger wiring), `lib/notification-center/NotificationRouteResolver.ts` (draft_ type → /app/league/[id]/draft), `components/notifications/NotificationPanel.tsx` (TYPE_ICONS for draft_*), `components/notification-settings/NotificationCategoryRenderer.tsx` (hide unavailable channel toggles).
- **QA:** `e2e/draft-notifications-click-audit.spec.ts` (destination routing, read/unread behavior, disabled channel controls, reminder action integrity).
- **Docs:** `docs/PROMPT197_DRAFT_NOTIFICATIONS_AND_REMINDERS_DELIVERABLE.md`.
