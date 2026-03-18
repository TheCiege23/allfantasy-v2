# PROMPT 322 — Chat System QA

## Objective

Ensure chat works correctly: messages send/receive, media support, mentions (@), DM vs league chat, and draft chat sync.

---

## Areas verified

### 1. Messages send/receive

- **League chat (main app):** Shared chat API `GET/POST /api/shared/chat/threads/[threadId]/messages` when `threadId = league:leagueId` uses `getLeagueChatMessages` / `createLeagueChatMessage` from `lib/league-chat/LeagueChatMessageService`. Access: user must be league member (`canAccessLeagueDraft`) or bracket member for bracket leagues.
- **DM:** Same shared API when `threadId` is a platform thread id (DM). Uses `getPlatformThreadMessages` / `createPlatformThreadMessage`. Blocked users are filtered on GET.
- **Draft chat:** `GET/POST /api/leagues/[leagueId]/draft/chat` — league members only; message length capped at 1000; supports text and (after fix) optional imageUrl.

### 2. Media support

- **Upload:** `POST /api/shared/chat/upload` accepts multipart `file`; allows images (jpeg, png, gif, webp) up to 5MB and other types (e.g. pdf, txt, csv) up to 10MB. Returns `{ url }` for use in messages.
- **League chat:** `LeagueChatMessage` stores `imageUrl` and `metadata`. **Fixes applied:**
  - **Shared POST for league:** Now passes `body.imageUrl` and `body.metadata` into `createLeagueChatMessage` so images (and other metadata) are persisted and returned.
  - **League GET:** `getLeagueChatMessages` and `createLeagueChatMessage` return now include `metadata.imageUrl` when present so clients can render images.
- **Draft chat:** POST now accepts optional `body.imageUrl`; when provided, message is stored with `type: 'image'` and `imageUrl`, and draft GET response includes `imageUrl` in the message object when present.
- **DM:** Platform messages use `messageType` and `metadata`; image URLs can be sent in body or metadata by the client (no schema change required).

### 3. Mentions (@)

- **Parsing:** `lib/league-chat/LeagueMentionResolver` parses `@username` with regex `/@(\w+)/g` and returns unique usernames.
- **Notification:** `POST /api/shared/chat/mentions` body: `{ threadId, messageId, mentionedUsernames }`. Resolves usernames to user ids, dispatches in-app notification. **Fix applied:** Notification body text is now context-aware: “mentioned you in a league chat” when `threadId.startsWith('league:')`, otherwise “mentioned you in a chat” (e.g. for DMs).
- **Flow:** Client is expected to parse mentions from the message text and call the mentions API after sending the message.

### 4. DM vs league chat

- **DM start:** `POST /api/shared/chat/dm/start` with `{ username }` finds the user by username and creates or returns a DM thread via `createPlatformThread({ threadType: 'dm', memberUserIds: [self, other] })`. Cannot message yourself.
- **League:** Virtual thread id `league:leagueId`; no separate thread row. Main app league access via `canAccessLeagueDraft(leagueId, userId)`; bracket leagues via `bracketLeagueMember`. League and DM use the same shared messages GET/POST; routing is by `threadId` (league prefix vs platform thread id).

### 5. Draft chat sync

- **Behavior:** When `liveDraftChatSyncEnabled` is on and draft status is `in_progress` or `paused`, draft room chat reads/writes the **league channel** (same as league chat). When sync is off or draft not active, draft chat uses **draft-only** messages (`source = 'draft'`).
- **Implementation:** `GET` uses `source: syncOn ? undefined : 'draft'` (undefined = league channel; exclude draft-only when sync on). `POST` uses `source: syncOn ? null : 'draft'`. So with sync on, messages appear in both draft room and league chat; with sync off, they are draft-only.
- **Response:** Both GET and POST return `syncActive: boolean` so the client can show sync status.

---

## Fixes applied (summary)

| Area | File(s) | Change |
|------|--------|--------|
| **League chat – media** | `lib/league-chat/LeagueChatMessageService.ts` | GET: include `metadata.imageUrl` when message has `imageUrl`. createLeagueChatMessage return: set `metadata` with `imageUrl` when present. |
| **Shared league POST – media** | `app/api/shared/chat/threads/[threadId]/messages/route.ts` | Pass `body.imageUrl` and `body.metadata` into `createLeagueChatMessage` for league virtual rooms. |
| **Draft chat – media** | `app/api/leagues/[leagueId]/draft/chat/route.ts` | POST: accept optional `body.imageUrl`, pass to `createLeagueChatMessage` with `type: 'image'` when set. toDraftMessage: include `imageUrl` in response when present in `metadata`. |
| **Mentions – copy** | `app/api/shared/chat/mentions/route.ts` | Use “mentioned you in a league chat” when `threadId.startsWith('league:')`, else “mentioned you in a chat”. |

---

## Reference

- **League messages:** `lib/league-chat/LeagueChatMessageService.ts`
- **Draft chat:** `app/api/leagues/[leagueId]/draft/chat/route.ts`
- **Shared threads/messages:** `app/api/shared/chat/threads/[threadId]/messages/route.ts`
- **Upload:** `app/api/shared/chat/upload/route.ts`
- **Mentions:** `app/api/shared/chat/mentions/route.ts`, `lib/league-chat/LeagueMentionResolver.ts`
- **DM:** `app/api/shared/chat/dm/start/route.ts`, `lib/platform/chat-service.ts`
- **Draft sync:** `getDraftUISettingsForLeague` (`liveDraftChatSyncEnabled`), draft session status in draft chat route.
