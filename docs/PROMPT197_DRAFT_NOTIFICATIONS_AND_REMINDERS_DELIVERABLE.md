# PROMPT 197 — Draft Notifications and Reminders Deliverable

## Overview

Draft notifications are **deterministic and event-driven**. No AI required for content; optional AI only for premium rewriting/summarizing. All events use rules-based title/body and in-app delivery; optional email/SMS/push can be wired to the same events.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## 1. Notification Events

| Event | Trigger | Recipient |
|-------|---------|-----------|
| **draft_on_the_clock** | After any pick is submitted | Next manager (roster owner) |
| **draft_approaching_timeout** | Via POST /draft/notify with rosterId | That roster's owner |
| **draft_auto_pick_fired** | Auto-pick or commissioner force autopick | Roster owner who was auto-picked |
| **draft_queue_player_unavailable** | (Reserved; trigger when fallback BPA used from queue) | Roster owner |
| **draft_paused** | Commissioner pauses draft | All league members |
| **draft_resumed** | Commissioner resumes draft | All league members |
| **draft_trade_offer_received** | Draft pick trade proposal created | Receiver roster owner |
| **draft_ai_trade_review_available** | (Reserved; when AI review ready) | Relevant user |
| **draft_orphan_ai_assigned** | Via POST /draft/notify | All league members (or commissioners) |
| **draft_auction_outbid** | Via POST /draft/notify with rosterId + previousBid | That roster's owner |
| **draft_slow_reminder** | Via POST /draft/notify (cron/client) | All league members |
| **draft_starting_soon** | Via POST /draft/notify (e.g. when draft starts) | All league members |

---

## 2. Event Trigger Wiring

| Location | Event | Action |
|----------|--------|--------|
| `POST /api/leagues/[leagueId]/draft/pick` | draft_on_the_clock | After successful submitPick, call `notifyOnTheClockAfterPick(leagueId)`. |
| `POST /api/leagues/[leagueId]/draft/controls` (pause) | draft_paused | After pauseDraftSession, call `notifyDraftPaused(leagueId)`. |
| `POST /api/leagues/[leagueId]/draft/controls` (resume) | draft_resumed | After resumeDraftSession, call `notifyDraftResumed(leagueId)`. |
| `POST /api/leagues/[leagueId]/draft/controls` (force_autopick) | draft_auto_pick_fired + draft_on_the_clock | Notify roster owner then next on clock. |
| `POST /api/leagues/[leagueId]/draft/autopick-expired` | draft_auto_pick_fired + draft_on_the_clock | Notify roster owner then next on clock. |
| `POST /api/leagues/[leagueId]/draft/trade-proposals` | draft_trade_offer_received | After create proposal, notify receiver via `getAppUserIdForRoster(receiverRosterId)` + `createDraftNotification`. |
| `POST /api/leagues/[leagueId]/draft/notify` | All others | Body: `{ eventType, payload? }`. Commissioner or cron can call for approaching_timeout, slow_reminder, starting_soon, orphan_ai_assigned, auction_outbid. |

---

## 3. Backend: Draft Notification Service

| File | Purpose |
|------|---------|
| `lib/draft-notifications/types.ts` | `DRAFT_NOTIFICATION_EVENT_TYPES`, `DraftNotificationEventType`, `DraftNotificationPayload`. |
| `lib/draft-notifications/DraftNotificationService.ts` | `getAppUserIdForRoster`, `getLeagueMemberAppUserIds`, `getTitleAndBody` (deterministic), `createDraftNotification`, `createDraftNotificationForUsers`, `notifyOnTheClockAfterPick`, `notifyDraftPaused`, `notifyDraftResumed`, `notifyAutoPickFired`, `notifyQueuePlayerUnavailable`. |
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
| POST | `/api/leagues/[leagueId]/draft/notify` | canAccessLeagueDraft | Emit a draft notification. Body: `{ eventType, payload? }`. eventType: draft_approaching_timeout, draft_slow_reminder, draft_starting_soon, draft_orphan_ai_assigned, draft_auction_outbid. For approaching_timeout/auction_outbid, payload.rosterId (and optional previousBid) used. For slow_reminder, payload.minutesRemaining optional. |

---

## 6. Enforcement and Channels

- **Deterministic:** Title and body for each event type are computed in `getTitleAndBody` from payload (league name, pick label, player name, etc.). No LLM calls.
- **Channel-safe:** Only in-app notifications are created. No dead actions for email/SMS/push in the UI; if those are added later, they can call the same service or subscribe to the same events.
- **AI optional:** For premium “rewrite” or “summarize” notifications, a separate layer can post-process the title/body before sending; not required for correctness.

---

## 7. Mandatory Click Audit (QA Checklist)

- [ ] **Notification opens correct destination:** Create a draft notification (e.g. submit a pick so next manager gets on-the-clock). Open notification center; click the notification. Destination is draft room for that league.
- [ ] **Read/unread state works:** Notification appears unread; click "Mark read" or click through; state updates and badge count decreases.
- [ ] **Disabled channels do not show dead actions:** In-app only; no email/SMS/push buttons in the panel. No broken links for draft types.
- [ ] **No broken reminder actions:** Call POST /draft/notify with eventType draft_slow_reminder; notification appears; "Open draft" works.

---

## 8. Files Touched

- **New:** `lib/draft-notifications/types.ts`, `lib/draft-notifications/DraftNotificationService.ts`, `lib/draft-notifications/index.ts`, `app/api/leagues/[leagueId]/draft/notify/route.ts`.
- **Modified:** `app/api/leagues/[leagueId]/draft/pick/route.ts` (notifyOnTheClockAfterPick after submit), `app/api/leagues/[leagueId]/draft/controls/route.ts` (notifyDraftPaused, notifyDraftResumed, notifyAutoPickFired + notifyOnTheClockAfterPick for force_autopick), `app/api/leagues/[leagueId]/draft/autopick-expired/route.ts` (notifyAutoPickFired, notifyOnTheClockAfterPick), `app/api/leagues/[leagueId]/draft/trade-proposals/route.ts` (notify receiver on create), `lib/notification-center/NotificationRouteResolver.ts` (draft_ type → /app/league/[id]/draft), `components/notifications/NotificationPanel.tsx` (TYPE_ICONS for draft_*).
- **Docs:** `docs/PROMPT197_DRAFT_NOTIFICATIONS_AND_REMINDERS_DELIVERABLE.md`.
