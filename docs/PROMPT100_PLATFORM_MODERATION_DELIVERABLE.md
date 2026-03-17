# Prompt 100 — Platform Moderation System + Full UI Click Audit

## Deliverable summary

- **Moderation architecture**: Report queue (messages + users), user actions (warning, mute, suspend, ban), content filtering (profanity, spam, AI bridge).
- **Backend**: New `PlatformModerationAction` model, `ModerationQueueService`, `UserModerationService`, `ChatModerationService`, `AIContentModerationBridge`; admin-only APIs for report status updates and user actions (ban/mute apply and remove).
- **UI**: Admin Moderation panel with per-row actions: Resolve/Dismiss reports, Ban/Mute reported users, View conversation / View user; Banned users and Muted users sections with Unban/Unmute.
- **Click audit**: All listed buttons wired to handlers that call the correct APIs and refresh data; no dead actions.

---

## 1. Moderation architecture

### 1.1 Scope

- **Users**: Platform-level actions (warning, mute, suspend, ban) stored in `PlatformModerationAction`; user-to-user blocks in `PlatformBlockedUser`.
- **Chat**: Reported messages (`PlatformMessageReport`) and reported users (`PlatformUserReport`); status workflow: pending → reviewed / resolved / dismissed.
- **Content filtering**: Profanity (pattern-based, extensible), spam (e.g. many URLs, long repeated chars), optional AI via `AIContentModerationBridge.moderateWithAI`.

### 1.2 Core modules

| Module | Role |
|--------|------|
| **ModerationQueueService** | `getMessageReportQueue`, `getUserReportQueue` with optional status/limit/offset; `REPORT_STATUSES` (pending, reviewed, resolved, dismissed). |
| **UserModerationService** | `applyModerationAction` (create action), `removeBan`, `removeMute`, `isUserBanned`, `isUserMuted`, `getActiveActionsForUser`; action types: warning, mute, suspend, ban. |
| **ChatModerationService** | `updateMessageReportStatus`, `updateUserReportStatus`, `getMessageReportById`, `getUserReportById`. |
| **AIContentModerationBridge** | `checkProfanity`, `checkSpam`, `moderateText`, `moderateWithAI` (stub for future AI). |

### 1.3 Report queue

- **Message reports**: List from `PlatformMessageReport`; admin can set status to resolved or dismissed.
- **User reports**: List from `PlatformUserReport` with reported user email/username; admin can resolve/dismiss report and/or apply Ban/Mute on the reported user.

### 1.4 Actions

- **Warning**: Record-only (stored in `PlatformModerationAction`).
- **Temporary mute**: Stored with optional `expiresAt`; `removeMute` clears active mute.
- **Temporary suspension**: Same model as mute (actionType `suspend`); can add dedicated remove if needed.
- **Permanent ban**: Stored with no (or null) `expiresAt`; `removeBan` deletes ban actions (unban).

---

## 2. Backend updates

### 2.1 Schema and migration

- **Model**: `PlatformModerationAction` — `id`, `userId`, `actionType` (warning | mute | suspend | ban), `reason?`, `expiresAt?`, `createdByUserId?`, `createdAt`; indexes on `userId`, `(userId, actionType)`, `expiresAt`.
- **Migration**: `prisma/migrations/20260332000000_add_platform_moderation_actions/migration.sql`.

### 2.2 Lib modules (`lib/moderation/`)

- **ModerationQueueService.ts**: Queue getters and `REPORT_STATUSES`.
- **UserModerationService.ts**: Apply/remove ban and mute; checks for banned/muted and active actions.
- **ChatModerationService.ts**: Update report status; get report by id.
- **AIContentModerationBridge.ts**: Profanity/spam patterns and `moderateText` / `moderateWithAI`.
- **index.ts**: Re-exports for queue, user moderation, chat moderation, AI bridge, block, report submission, safety visibility.

### 2.3 Admin API routes (all protected by `requireAdmin()`)

| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/api/admin/moderation/reports/message/[reportId]` | Body `{ status }` → update message report status. |
| PATCH | `/api/admin/moderation/reports/user/[reportId]` | Body `{ status }` → update user report status. |
| POST | `/api/admin/moderation/users/[userId]/action` | Body `{ actionType, reason?, expiresAt? }` → create PlatformModerationAction. |
| DELETE | `/api/admin/moderation/users/[userId]/ban` | Remove ban for user (unban). |
| DELETE | `/api/admin/moderation/users/[userId]/mute` | Remove active mute for user. |
| GET | `/api/admin/moderation/users/banned` | List banned users (from PlatformModerationAction). |
| GET | `/api/admin/moderation/users/muted` | List currently muted users (active mute actions). |

---

## 3. UI updates

### 3.1 Admin Moderation panel (`app/admin/components/AdminModerationPanel.tsx`)

- **Reported content** (message reports):
  - Columns: Thread/Message (link), Reason, Status, Date, **Actions**.
  - Actions: **Resolve** (set status to `resolved`), **Dismiss** (set status to `dismissed`) — only when status is `pending`; **View conversation** (link to `/messages?thread={threadId}`).

- **Reported users**:
  - Columns: Reported user, Reason, Status, **Actions**.
  - Actions: **Resolve** / **Dismiss** (when pending), **Ban**, **Mute**, **View user** (link to `/admin?tab=users`).

- **Banned users** (new section):
  - Loaded from `GET /api/admin/moderation/users/banned`.
  - Columns: User, Banned at, **Actions** → **Unban** (calls DELETE ban API).

- **Muted users** (new section):
  - Loaded from `GET /api/admin/moderation/users/muted`.
  - Columns: User, Muted at, **Actions** → **Unmute** (calls DELETE mute API).

- **Blocked users**: Existing list (user-to-user blocks); label clarified as "Blocked users (user-to-user)".

- **Behavior**: Single `actioning` state key for loading per button; toasts on success/error; full list refresh after each action.

---

## 4. UI click audit

| Button / control | Handler | API | Result |
|------------------|---------|-----|--------|
| **Report review** (row in Reported content) | — | — | Row shows Resolve / Dismiss / View conversation. |
| **Resolve** (message report) | `updateReportStatus("message", id, "resolved")` | PATCH `/api/admin/moderation/reports/message/[reportId]` body `{ status: "resolved" }` | Report status updated; list refreshed; toast. |
| **Dismiss** (message report) | `updateReportStatus("message", id, "dismissed")` | PATCH same, `status: "dismissed"` | Report status updated; list refreshed; toast. |
| **View conversation** | Link | — | Navigate to `/messages?thread={threadId}`. |
| **Resolve** (user report) | `updateReportStatus("user", id, "resolved")` | PATCH `/api/admin/moderation/reports/user/[reportId]` body `{ status: "resolved" }` | User report status updated; list refreshed. |
| **Dismiss** (user report) | `updateReportStatus("user", id, "dismissed")` | PATCH same, `status: "dismissed"` | User report status updated; list refreshed. |
| **Ban user** (reported user row) | `applyUserAction(reportedUserId, "ban")` | POST `/api/admin/moderation/users/[userId]/action` body `{ actionType: "ban", reason }` | PlatformModerationAction created; list refreshed; user appears in Banned users. |
| **Mute user** (reported user row) | `applyUserAction(reportedUserId, "mute")` | POST same, `actionType: "mute"` | Mute action created; list refreshed; user appears in Muted users. |
| **View user** | Link | — | Navigate to `/admin?tab=users`. |
| **Unban user** (banned section) | `unbanUser(userId)` | DELETE `/api/admin/moderation/users/[userId]/ban` | Ban action(s) removed; banned list refreshed. |
| **Unmute user** (muted section) | `unmuteUser(userId)` | DELETE `/api/admin/moderation/users/[userId]/mute` | Active mute removed; muted list refreshed. |
| **Refresh** | `load()` | GET dashboard moderation + banned + muted | All sections refreshed. |

All of the above actions are wired; there are no dead moderation actions.

---

## 5. QA requirements and findings

### 5.1 Test checklist (end-to-end)

- [ ] **Report message** (from chat) → appears in Reported content; status pending.
- [ ] **Resolve** message report → status becomes resolved; row no longer shows Resolve/Dismiss.
- [ ] **Dismiss** message report → status becomes dismissed.
- [ ] **View conversation** → opens messages page with correct thread.
- [ ] **Report user** → appears in Reported users with reported user info.
- [ ] **Resolve** user report → status resolved.
- [ ] **Dismiss** user report → status dismissed.
- [ ] **Ban user** from reported row → user appears in Banned users; Unban works and removes from banned list.
- [ ] **Mute user** from reported row → user appears in Muted users; Unmute works and removes from muted list.
- [ ] **Unban** / **Unmute** → correct DELETE called; list refreshes; toasts on success/error.
- [ ] **Refresh** → all four data sources (reported content, reported users, banned, muted) reload.

### 5.2 Notes

- Run `npx prisma generate` after pulling; run `npx prisma migrate deploy` if the new migration is not yet applied.
- Admin routes require valid admin session (`requireAdmin()`).
- Content filtering (profanity/spam) is available in lib for use in chat/message pipelines; AI moderation is a stub for future integration.
- League names, avatars, and uploaded images are in scope for future moderation (e.g. report types or separate queues); current implementation focuses on chat reports and user-level actions.

---

## 6. File reference

- **Schema**: `prisma/schema.prisma` (PlatformModerationAction).
- **Migration**: `prisma/migrations/20260332000000_add_platform_moderation_actions/`.
- **Lib**: `lib/moderation/ModerationQueueService.ts`, `UserModerationService.ts`, `ChatModerationService.ts`, `AIContentModerationBridge.ts`, `index.ts`.
- **Admin APIs**: `app/api/admin/moderation/reports/message/[reportId]/route.ts`, `reports/user/[reportId]/route.ts`, `users/[userId]/action/route.ts`, `users/[userId]/ban/route.ts`, `users/[userId]/mute/route.ts`, `users/banned/route.ts`, `users/muted/route.ts`.
- **UI**: `app/admin/components/AdminModerationPanel.tsx`.
- **Dashboard data**: `app/api/admin/dashboard/moderation/route.ts` (unchanged; used for reported content/users and blocked users).
