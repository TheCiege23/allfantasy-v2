# PROMPT 179 — Draft Chat and League Chat Live Sync Deliverable

## Overview

Live draft chat is **league-specific**, **always open** in the draft room, and **syncs with league chat** only during an **active live draft** when the commissioner has enabled sync. Mock draft chats remain **isolated**. Commissioner can send **@everyone** broadcast to selected leagues. Trade AI review stays in **private** context.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## Live Draft Chat Requirements

| Requirement | Implementation |
|-------------|----------------|
| League-specific membership | Only users who pass `canAccessLeagueDraft(leagueId, userId)` can GET/POST draft chat and league chat (main League). |
| Only managers can view/send | Same access control; commissioners and roster members only. |
| Media (GIFs, links, images, short videos) | Backend supports `type` and `imageUrl` in LeagueChatMessage; draft chat POST currently text-only. UI can be extended; upload/attach degrades gracefully if not implemented. |
| @mentions | Supported in message body; draft panel placeholder mentions; league chat and broadcast use `@everyone`. |
| AI chat handoff | Draft panel exposes chat; AI handoff can open from chat context (existing AI/Chimmy entry points). |
| Last active / last seen | Not implemented in this pass; can be added via LeagueChatMessage or member lastReadAt. |
| **Sync during active live draft only** | When `liveDraftChatSyncEnabled` and draft session status is `in_progress` or `paused`: draft chat GET/POST use **league chat** (same store, no `source` filter). When sync off or no active draft: draft chat uses **draft-only** messages (`source: 'draft'`). |
| Mock draft chats isolated | Mock draft uses MockDraftChat and `/api/mock-draft/[draftId]/chat`; no league chat sync. |

---

## Realtime Sync Rules

- **When sync is ON and draft is active:** Messages sent in draft chat are stored as league chat (no `source` or `source: null`). Messages sent in league chat (LeagueChatPanel or shared API for `league:leagueId`) appear in draft chat because both read from the same store.
- **When sync is OFF:** Draft chat reads/writes `LeagueChatMessage` with `source: 'draft'`. League chat tab reads messages with `source != 'draft'` (or null). So draft room and league tab see different sets.
- **Mock draft:** No sync; mock chat is separate (MockDraftChat); league chat unchanged.

---

## Backend

### Schema

- **LeagueChatMessage** (new): `id`, `leagueId`, `userId`, `message`, `type` (text, broadcast, gif, image, …), `imageUrl`, `metadata`, `source` ('draft' | null), `createdAt`. Used for main app League chat and draft chat.
- **Migration:** `prisma/migrations/20260348000000_add_league_chat_messages/migration.sql`.

### Routes

| Method | Route | Auth | Purpose |
|--------|--------|------|--------|
| GET | `/api/leagues/[leagueId]/draft/chat` | canAccessLeagueDraft | List draft chat messages (sync on → league messages; sync off → source='draft'). Returns `{ messages, syncActive }`. |
| POST | `/api/leagues/[leagueId]/draft/chat` | canAccessLeagueDraft | Send message (sync on → league; sync off → source='draft'). Body: `{ text }`. |
| GET | `/api/shared/chat/threads/[threadId]/messages` | (existing) | For `threadId = league:leagueId`: if BracketLeague member use BracketLeagueMessage; else if canAccessLeagueDraft use LeagueChatMessage (main League). |
| POST | same | (existing) | Same: main League creates LeagueChatMessage. |
| GET | `/api/commissioner/leagues` | session | List leagues where user is commissioner (`League.userId = session.user.id`). |
| POST | `/api/commissioner/broadcast` | session | Body: `{ leagueIds: string[], message: string }`. For each leagueId assert commissioner; send `@everyone {message}` to league chat (LeagueChatMessage type 'broadcast' or platform thread broadcast). |

### Services

- **lib/league-chat/LeagueChatMessageService.ts**: `getLeagueChatMessages(leagueId, options)`, `createLeagueChatMessage(leagueId, userId, message, options)` for main League.
- **lib/live-draft-engine/auth**: `canAccessLeagueDraft` (commissioner or own roster in league).

---

## Frontend

### Draft room chat

- **DraftRoomPageClient:** Fetches draft chat on load (when session exists) and on poll. Sends via `handleSendChat` to POST `/api/leagues/[leagueId]/draft/chat`. Passes `messages`, `onSend`, `sending`, `leagueChatSync`, `onBroadcast` (commissioner), `onReconnect` (refresh + fetchChat).
- **DraftChatPanel:** Shows “League sync” when `leagueChatSync`; send works; Broadcast button opens commissioner broadcast modal.

### Commissioner broadcast

- **Modal:** Opens from Draft Chat “Broadcast” button. Fetches GET `/api/commissioner/leagues`, multi-select leagues, message input, POST `/api/commissioner/broadcast`. Current league pre-selected. Permission: only commissioners see the button and can submit (API re-checks).

---

## Trade AI Private Review

- Trade evaluation/analyze (e.g. `/api/ai/trade-eval`, `/api/legacy/trade/analyze`, trade modals) must **not** post to league chat. AI suggestions (decline/accept/counter) and counter packages are delivered in **private** context: DM, in-app trade modal, or notification to the receiving manager. No change to league chat or draft chat from trade AI.

---

## Mandatory Click Audit

- [ ] **Send message works:** Type in draft chat, send; message appears in list and persists (refetch).
- [ ] **Upload/attach:** If implemented, attach/image works or degrades gracefully (no dead button).
- [ ] **Mention selection:** @mention in input or selector works or placeholder; no crash.
- [ ] **AI handoff:** AI handoff from chat opens correctly (existing entry point).
- [ ] **Live sync only during active draft:** With sync on and draft in progress, message in draft chat appears in league chat tab and vice versa; with draft not active or sync off, draft chat is separate.
- [ ] **Mock chats isolated:** Send in mock draft chat; league chat and live draft chat unchanged.
- [ ] **Commissioner broadcast selector:** Open Broadcast, see list of commissioner leagues, select one or more, enter message, Send; message appears in selected league chat(s) as @everyone.
- [ ] **No dead media actions:** Any media/attach controls either work or are hidden/disabled without breaking the UI.

---

## QA Checklist (concise)

1. Draft room: send message → appears and persists; “League sync” shown when sync on.
2. With sync on and draft active: send from draft chat → visible in league chat tab; send from league chat → visible in draft chat.
3. With sync off: draft chat and league chat independent.
4. Mock draft: chat only in mock room; no league/draft sync.
5. Commissioner: Broadcast opens modal; select leagues; send @everyone; message in league chat.
6. Trade AI: review/suggestions remain in private context (no leak to league chat).

---

## Files Touched

- **Schema:** `prisma/schema.prisma` (LeagueChatMessage, League.chatMessages, AppUser.leagueChatMessages).
- **Migration:** `prisma/migrations/20260348000000_add_league_chat_messages/migration.sql`.
- **Shared chat:** `app/api/shared/chat/threads/[threadId]/messages/route.ts` (main League fallback via canAccessLeagueDraft + LeagueChatMessageService).
- **League chat service:** `lib/league-chat/LeagueChatMessageService.ts` (new).
- **Draft chat:** `app/api/leagues/[leagueId]/draft/chat/route.ts` (new).
- **Commissioner:** `app/api/commissioner/leagues/route.ts` (new), `app/api/commissioner/broadcast/route.ts` (new).
- **Draft room:** `components/app/draft-room/DraftRoomPageClient.tsx` (fetchChat, handleSendChat, broadcast modal, onBroadcast).
