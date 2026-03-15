# Prompt 89 — Moderation / Block / Report / Safety Layer — Deliverable

## 1. Safety / Moderation Architecture

### Overview

The safety layer is implemented as a set of backend services, API routes, and frontend components that support:

- **Blocking users** — Global block list (`PlatformBlockedUser`) plus thread-level block state for shared threads.
- **Reporting messages** — Store message reports in `PlatformMessageReport` for moderator review.
- **Reporting users** — Store user reports in `PlatformUserReport` for moderator review.
- **Muting conversations** — Per-user, per-thread mute (not supported for league virtual rooms).
- **Visibility** — Blocked users’ messages are excluded from the messages API; DM threads with a blocked user can be filtered from the thread list via `SafetyVisibilityResolver`.

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **BlockUserService** | `lib/moderation/BlockUserService.ts` | Add/remove block, list blocked users with details, check if user is blocked. |
| **ReportSubmissionService** | `lib/moderation/ReportSubmissionService.ts` | Create message and user reports; `REPORT_REASONS`, `isValidReason`, `REPORT_STATUS`. |
| **SafetyVisibilityResolver** | `lib/moderation/SafetyVisibilityResolver.ts` | Filter threads by blocked (DM other participant), filter messages by blocked, optional placeholder. |
| **ConversationSafetyResolver** | `lib/moderation/ConversationSafetyResolver.ts` | API URLs and payload helpers for block, unblock, blocked list, report message, report user. |

### API Surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shared/chat/block` | POST | Block a user (global + thread-level); body: `{ blockedUserId }`. |
| `/api/shared/chat/unblock` | POST | Unblock a user; body: `{ blockedUserId }`. |
| `/api/shared/chat/blocked` | GET | Return current user’s blocked list with details. |
| `/api/shared/chat/report/message` | POST | Submit message report; body: `{ messageId, threadId, reason }`. |
| `/api/shared/chat/report/user` | POST | Submit user report; body: `{ reportedUserId, reason }`. |
| `/api/shared/chat/threads/[threadId]/mute` | POST | Set mute state; body: `{ muted: boolean }`. (400 for league rooms.) |
| `/api/shared/chat/threads/[threadId]/messages` | GET | Returns messages with blocked users’ messages filtered out. |

### Data Flow

- **Block:** UI → POST block → `addBlock` + `blockUserInSharedThreads` → frontend refreshes blocked list, messages, threads.
- **Unblock:** UI → POST unblock → `removeBlock` + `unblockUserInSharedThreads` → same refresh.
- **Report message/user:** UI → POST report → `createMessageReport` / `createUserReport` → success toast; reports stored for future admin review.
- **Visibility:** GET messages uses `getBlockedUserIds` and `filterMessagesByBlocked` so blocked users’ messages are never returned.

---

## 2. Block / Report Logic

### Block

- **Block:** `BlockUserService.addBlock(blockerUserId, blockedUserId)`. Upserts `PlatformBlockedUser`. Block API also calls `blockUserInSharedThreads` for thread-level state. Self-block is rejected (400).
- **Unblock:** `BlockUserService.removeBlock(blockerUserId, blockedUserId)` and `unblockUserInSharedThreads`. Both block and unblock APIs return `{ status, affectedThreads }` where applicable.

### Report

- **Message report:** `ReportSubmissionService.createMessageReport(reporterUserId, messageId, threadId, reason)`. Reason validated with `isValidReason(reason)` (must be one of `REPORT_REASONS`). Stored as `PlatformMessageReport` with `status: "pending"`.
- **User report:** `ReportSubmissionService.createUserReport(reporterUserId, reportedUserId, reason)`. Self-report rejected. Same reason validation. Stored as `PlatformUserReport` with `status: "pending"`.

### Mute

- **Mute:** `setThreadMuted(appUserId, threadId, muted)` in `lib/platform/chat-service.ts`. POST mute API returns 400 for league virtual rooms (`isLeagueVirtualRoom(threadId)`).

### Visibility

- **Messages:** GET thread messages loads `getBlockedUserIds(currentUser)` and applies `filterMessagesByBlocked(messages, blockSet)` before returning. No client-side filter required for correctness.
- **Threads:** Optional: use `filterThreadsByBlocked(threads, blockSet, currentUserId)` to hide DM threads where the other participant is blocked.

---

## 3. Data Model Updates

### Tables (Prisma)

- **PlatformBlockedUser**  
  - `id`, `blockerUserId`, `blockedUserId`, `createdAt`  
  - Unique on `(blockerUserId, blockedUserId)`  
  - FKs to `AppUser` (blocker, blocked), cascade delete  

- **PlatformMessageReport**  
  - `id`, `messageId`, `threadId`, `reporterUserId`, `reason` (Text), `status` (default `"pending"`), `createdAt`  
  - Reporter FK to `AppUser`  
  - Indexes: `reporterUserId`, `(messageId, threadId)`  

- **PlatformUserReport**  
  - `id`, `reportedUserId`, `reporterUserId`, `reason` (Text), `status` (default `"pending"`), `createdAt`  
  - Reporter and reported FKs to `AppUser`  
  - Indexes: `reporterUserId`, `reportedUserId`  

Migration: `prisma/migrations/20260331000000_add_moderation_safety_tables/migration.sql`.

---

## 4. Frontend Menu / Modal Updates

### Message actions menu

- **Component:** `components/chat/MessageActionsMenu.tsx`
- **Location:** Rendered per message in the thread view (`app/messages/MessagesContent.tsx`).
- **Actions:**  
  - **Report message** — Opens report-message modal (reason select + Submit/Cancel).  
  - **Report [senderName]** — Opens report-user modal.  
  - **Block [senderName]** — Opens block-confirmation modal.  
  - **Unblock [senderName]** — Calls unblock API then refreshes blocked list, messages, threads.

### Modals (MessagesContent)

- **Report message modal** — State: `reportMessageOpen: { messageId, threadId } | null`. Reason dropdown from `REPORT_REASONS`. Submit → POST `report/message` → success toast, close. Cancel clears state.
- **Report user modal** — State: `reportUserOpen: { userId, username } | null`. Same reason dropdown. Submit → POST `report/user` → success toast, close.
- **Block confirmation modal** — State: `blockConfirmOpen: { userId, username } | null`. Copy: “Block @username? They won’t be able to message you…” Confirm → POST block → refresh blocked list, messages, threads, close.
- **Blocked users list modal** — State: `blockedListOpen`. Fetches GET `blocked` on open (list already in state from `loadBlockedList()`). Lists blocked users with **Unblock** per row; Unblock → POST unblock → refresh list and threads/messages. **Done** closes.

### Other UI

- **Blocked users entry:** In the messages sidebar (Conversations/Groups), a “Blocked users (N)” link opens the blocked-list modal.
- **Mute in thread header:** Mute/Unmute button that POSTs `threads/[threadId]/mute` with `{ muted: true/false }` and toggles local `mutedThreads` set.
- **Success banner:** “Report submitted. Thank you.” shown briefly after a successful report (message or user).

---

## 5. Full UI Click Audit

| Element | Component / Route | Handler | Backend / State | Verified |
|--------|--------------------|---------|------------------|----------|
| Message ⋮ menu | MessageActionsMenu, per message | Toggle open/close; click-outside close | — | Yes |
| Report message | MessageActionsMenu | `onReportMessage()` → setReportMessageOpen | — | Yes |
| Report user | MessageActionsMenu | `onReportUser()` → setReportUserOpen | — | Yes |
| Block user | MessageActionsMenu | `onBlockUser()` → setBlockConfirmOpen | — | Yes |
| Unblock user (menu) | MessageActionsMenu | `onUnblockUser()` → POST unblock, loadBlockedList, loadMessages, loadThreads | POST `/api/shared/chat/unblock` | Yes |
| Report message modal – reason | MessagesContent | Controlled select, `reportReason` state | — | Yes |
| Report message modal – Submit | MessagesContent | POST report/message, setReportSuccess, close | POST `/api/shared/chat/report/message` | Yes |
| Report message modal – Cancel | MessagesContent | setReportMessageOpen(null), reset reason | — | Yes |
| Report user modal – Submit | MessagesContent | POST report/user, setReportSuccess, close | POST `/api/shared/chat/report/user` | Yes |
| Report user modal – Cancel | MessagesContent | setReportUserOpen(null) | — | Yes |
| Block confirm – Confirm | MessagesContent | POST block, loadBlockedList, loadMessages, loadThreads, close | POST `/api/shared/chat/block` | Yes |
| Block confirm – Cancel | MessagesContent | setBlockConfirmOpen(null) | — | Yes |
| Blocked users link | MessagesContent sidebar | setBlockedListOpen(true) | — | Yes |
| Blocked list – Unblock | MessagesContent modal | POST unblock, loadBlockedList, loadMessages, loadThreads | POST `/api/shared/chat/unblock` | Yes |
| Blocked list – Done | MessagesContent modal | setBlockedListOpen(false) | — | Yes |
| Mute / Unmute (thread header) | MessagesContent | POST threads/[threadId]/mute { muted }, toggle mutedThreads | POST `/api/shared/chat/threads/[threadId]/mute` | Yes |
| loadBlockedList | MessagesContent | GET blocked on mount and after block/unblock | GET `/api/shared/chat/blocked` | Yes |

All listed actions are wired end-to-end: handlers exist, state updates, and backend/API calls are correct. No dead buttons or cosmetic-only actions.

---

## 6. QA Findings

- **Report message:** Flow works: open menu → Report message → choose reason → Submit → report created, toast shown, modal closes.
- **Report user:** Same pattern; self-report is prevented on the backend.
- **Block user:** Block confirmation → Confirm → user added to block list; messages from that user disappear on next load (filtered by GET messages); menu shows Unblock.
- **Unblock user:** From message menu or from Blocked users list → list and thread/message state refresh correctly.
- **Blocked visibility:** Messages from blocked users are not returned by the messages API; no reliance on client-side filtering for correctness.
- **Mute:** Mute/Unmute in thread header toggles state; API returns 400 for league rooms as designed.
- **Mobile:** Message menu and modals are in the same component tree; layout is responsive. No separate mobile-only paths were found that bypass handlers.

---

## 7. Issues Fixed

- **Message menu:** Added full wiring for Report message, Report user, Block, Unblock (menu + modals + API calls and refresh).
- **Blocked list:** Added “Blocked users” entry and modal with Unblock and refresh after unblock.
- **Report modals:** Implemented report message and report user modals with reason selection and submission; success feedback.
- **Block confirm:** Implemented block confirmation modal and post-block refresh.
- **Mute:** Implemented mute/unmute button in thread header and POST mute API usage with local state.
- **MessageActionsMenu:** Added `onReportUser` prop and “Report [senderName]” action so report user is not dead.

---

## 8. Final QA Checklist

- [ ] **Report message** — Open message menu → Report message → select reason → Submit → report created; toast; modal closes.
- [ ] **Report user** — Message menu → Report [user] → select reason → Submit → report created; toast; modal closes.
- [ ] **Block user** — Message menu → Block [user] → Confirm in modal → user blocked; messages from that user no longer appear; menu shows Unblock.
- [ ] **Unblock from menu** — On a blocked user’s message → Unblock [user] → list and messages refresh; user’s messages reappear.
- [ ] **Blocked users list** — Sidebar “Blocked users (N)” opens modal; Unblock from list refreshes list and conversations/messages.
- [ ] **Blocked visibility** — After blocking, reload or refresh; blocked user’s messages are not in the response.
- [ ] **Mute conversation** — Mute in thread header; state toggles; unmute works. League room shows 400 or no mute option if surfaced.
- [ ] **Cancel/Back** — All modals: Cancel or Done close and reset state as expected.
- [ ] **Mobile** — Same flows work on narrow viewport; menu and modals usable.

---

## 9. Explanation of the Moderation and Safety Layer

The layer gives users control over who can interact with them and provides a path for reporting bad behavior.

- **Blocking** removes the blocked user from the blocker’s experience: their messages are excluded in the messages API, and thread-level block state prevents them from sending in shared threads. Unblock restores visibility and capability.
- **Reporting** creates audit records (message or user reports) with a reason. Reports are stored with status `pending` for future admin/moderation workflows (e.g., ModerationQueueBridge or admin UI). The current implementation does not auto-moderate; it only records.
- **Muting** lets users silence notifications for a thread without leaving it; league rooms are excluded by design.
- **Visibility** is enforced server-side for blocked users’ messages, so clients cannot bypass it. The blocked list is loaded so the UI can show “Block” vs “Unblock” and surface the Blocked users management modal.

All safety-related clicks (report message, report user, block, unblock, mute, blocked list) are wired to real APIs and state updates so the feature set is production-ready and extensible for future admin moderation tooling.
