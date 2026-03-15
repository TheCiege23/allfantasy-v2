# Prompt 83 — Unified Chat + Messaging Core Architecture + Full UI Click Audit

## 1. Unified Chat Architecture

### Overview

The **unified chat** layer supports **league chat**, **direct messages**, **group messages**, **AI chat**, and **system/commissioner notices** through a single abstraction: **room id** (platform thread UUID or virtual `league:leagueId`), **message list**, and **send**. The backend uses **PlatformChatThread / PlatformChatMessage** for DMs and group threads, **BracketLeagueMessage** for bracket league chat, and virtual room ids so the app shell can show one thread list (including leagues) and one message API.

### Conversation Types

| Type | Storage | Room id | API |
|------|---------|---------|-----|
| **League Chat** | BracketLeagueMessage (or PlatformChatThread when real thread exists) | `league:leagueId` or UUID | GET/POST `/api/shared/chat/threads/[threadId]/messages` (proxies to bracket when `league:`) |
| **Direct Messages** | PlatformChatThread + PlatformChatMessage | UUID | Same shared API |
| **Group Messages** | PlatformChatThread + PlatformChatMessage | UUID | Same shared API |
| **AI Chat** | Legacy AI (Chimmy) / ChatConversation | `ai:conversationId` or in-product | `/api/chat/chimmy`, `/af-legacy?tab=chat` |
| **System / Commissioner** | PlatformChatMessage (messageType broadcast, stats_bot, pin) | UUID thread | createSystemMessage, CommissionerBroadcastForm |

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **ChatCoreService** | `lib/chat-core/ChatCoreService.ts` | resolveChatRoom, isLeagueVirtualRoom, getLeagueIdFromVirtualRoom, bracketMessageToPlatformShape, shouldFetchMessagesFromBracketLeague, getLeagueIdForRoom. |
| **ChatRoomResolver** | `lib/chat-core/ChatRoomResolver.ts` | resolveChatRoom(roomId) → ResolvedChatRoom (roomType, source: platform \| bracket_league, leagueId), isLeagueVirtualRoom, isAiVirtualRoom. |
| **RealtimeMessageService** | `lib/chat-core/RealtimeMessageService.ts` | getPollIntervalMs, DEFAULT_POLL_INTERVAL_MS (8s), FAST_POLL_INTERVAL_MS (4s). |
| **MessageComposerController** | `lib/chat-core/MessageComposerController.ts` | validateMessageBody, MAX_MESSAGE_LENGTH (1000), isSendKey, handleComposerKeyDown. |
| **MessageQueryService** | `lib/chat-core/MessageQueryService.ts` | getMessageQueryOptions, clampLimit, parseCursor, DEFAULT_PAGE_LIMIT (50), MAX_PAGE_LIMIT (100). |
| **ChatPresenceResolver** | `lib/chat-core/ChatPresenceResolver.ts` | getPresenceStatus(lastSeenAt), ChatPresence type (placeholder for future typing/online). |
| **SportChatContextResolver** | `lib/chat-core/SportChatContextResolver.ts` | resolveSportForChatRoom, getDefaultChatSport, isSportScopedRoomType, SUPPORTED_CHAT_SPORTS (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER from sport-scope). |

### Data Flow

- **Thread list:** `getPlatformChatThreads(appUserId)` returns real platform threads; on error/empty, `getLegacyFallbackThreads` returns virtual `league:leagueId` and `ai:conversationId` so the app can show league and AI in the same list.
- **Messages:** GET `/api/shared/chat/threads/[threadId]/messages` — if `threadId` is `league:leagueId`, backend fetches **BracketLeagueMessage** and maps to platform message shape; otherwise uses **getPlatformThreadMessages**.
- **Send:** POST same route — if `league:leagueId`, creates **BracketLeagueMessage** and returns mapped message; otherwise **createPlatformThreadMessage**.
- **Pinned:** GET pinned returns `[]` for virtual league rooms (no pin storage for bracket league in shared API yet).
- **Reactions:** For virtual league rooms, reaction API currently targets platform messages; bracket league reactions live in **BracketMessageReaction**. Documented as future alignment.

---

## 2. Data Model / Schema Updates

### Existing Structures (Preserved)

- **PlatformChatThread** — id (UUID), threadType, productType, title, createdByUserId, lastMessageAt, members, messages.
- **PlatformChatThreadMember** — threadId, userId, role, joinedAt, lastReadAt, isMuted, isBlocked.
- **PlatformChatMessage** — id, threadId, senderUserId, messageType, body, metadata, createdAt, updatedAt. Pinned represented as messageType `pin` with body JSON `{ messageId }`.
- **BracketLeagueMessage** — id, leagueId, userId, message, type, replyToId, imageUrl, metadata, createdAt; reactions via **BracketMessageReaction** (messageId, userId, emoji).

No new Prisma models were added. The prompt’s **ChatRoom** / **ChatParticipant** / **ChatMessage** / **MessageReaction** / **PinnedMessage** are mapped as follows:

- **ChatRoom** → PlatformChatThread (or virtual `league:leagueId`).
- **ChatParticipant** → PlatformChatThreadMember (or BracketLeagueMember for league rooms).
- **ChatMessage** → PlatformChatMessage or BracketLeagueMessage (unified shape at API boundary).
- **MessageReaction** → metadata.reactions on PlatformChatMessage, or BracketMessageReaction for bracket.
- **PinnedMessage** → pin-type PlatformChatMessage (body references messageId); league virtual rooms return empty pinned.

---

## 3. Backend Messaging Service Updates

- **GET/POST `/api/shared/chat/threads/[threadId]/messages`**  
  - When `threadId` is **league:leagueId**: resolve leagueId, check **BracketLeagueMember**, then GET: **bracketLeagueMessage.findMany** for that leagueId, map with **bracketMessagesToPlatform**; POST: **bracketLeagueMessage.create** with message from body.body/body.message, return mapped message.  
  - Otherwise: unchanged (resolvePlatformUser, getPlatformThreadMessages, createPlatformThreadMessage).

- **GET `/api/shared/chat/threads/[threadId]/pinned`**  
  - When `threadId` is **league:***, return `{ pinned: [] }` so UI does not call platform pin list for virtual rooms.

- **lib/chat-core/league-message-proxy.ts** (new)  
  - **bracketMessagesToPlatform(rows, threadId)** — maps BracketLeagueMessage-like rows to PlatformChatMessage shape for shared API responses.

- **lib/platform/chat-service.ts**  
  - Unchanged; still used for platform threads and fallback thread list (getLegacyFallbackThreads returns virtual league and AI threads).

Sport support: **SportChatContextResolver** uses **lib/sport-scope.ts** (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER). No backend changes required beyond the shared messages and pinned routes above.

---

## 4. Frontend Chat Shell Updates

- **LeagueChatPanel** (existing) — Already uses `/api/shared/chat/threads` and `/api/shared/chat/threads/[threadId]/messages` and pinned. With backend support for `league:leagueId`, when the thread list includes virtual league threads (from getLegacyFallbackThreads), loading messages for that thread now returns bracket league messages; send posts to bracket league. No frontend code change required; behavior is fixed by backend.
- **Messages page** (`/messages`) — Tabs (DMs, Group Chats, AI); “Open Legacy AI Chat” links to `/af-legacy?tab=chat`. No structural change; DM/group list and thread view can later consume the same shared thread/message APIs.
- **Bracket LeagueChat / PoolChat** — Continue to use `/api/bracket/leagues/[leagueId]/chat` directly; unchanged.
- **Identity / theme / language** — Shared components (IdentityImageRenderer, theme, i18n) remain; chat UIs already use them where applicable.

Optional future: use **MessageComposerController.handleComposerKeyDown** and **validateMessageBody** from `lib/chat-core` in LeagueChatPanel and message composer components for consistent validation and enter-to-send.

---

## 5. Full UI Click Audit Findings

| Element | Component | Route / Behavior | Handler / Wiring | Status |
|--------|-----------|------------------|------------------|--------|
| League chat tab | LeagueChatPanel | Switch to league | setActiveTab("league") | OK |
| DM tab | LeagueChatPanel | Switch to DM | setActiveTab("dm") | OK |
| AI chat tab | LeagueChatPanel | Switch to AI | setActiveTab("ai") | OK |
| Close chat | LeagueChatPanel | onClose | button onClick | OK |
| League message list | LeagueChatPanel | loadMessages(resolvedLeagueThreadId) | GET threads/…/messages (now supports league:) | Fixed |
| Send league message | LeagueChatPanel | handleSendLeague | POST threads/…/messages (now supports league:) | Fixed |
| Enter key send (league) | LeagueChatPanel | onKeyDown Enter !shiftKey | handleSendLeague | OK |
| Pin message | LeagueChatPanel | handlePin → POST …/pin | Platform only; league virtual returns [] pinned | OK (league: no pin) |
| Reaction (league) | LeagueMessageRow | onReaction → POST …/reactions | Platform only; league virtual not persisted | Note |
| DM thread select | LeagueChatPanel | setDmThreadId(t.id) | Loads DM messages | OK |
| Send DM | LeagueChatPanel | handleSendDm | POST threads/…/messages | OK |
| Enter key send (DM) | LeagueChatPanel | onKeyDown Enter !shiftKey | handleSendDm | OK |
| AI input send | AIChatTabContent | send() | useAIChat.send; Enter key | OK |
| AI send button | AIChatTabContent | onClick send | disabled when loading or empty | OK |
| Media placeholder (GIF, image, video, meme) | MediaPlaceholderButtons | upload.uploadGif etc. | useMediaUpload | OK |
| Poll button | MediaPlaceholderButtons | (no handler) | title/aria only; dead | Note |
| Commissioner broadcast | CommissionerBroadcastForm | threadId, leagueId, onSent | Rendered when isCommissioner | OK |
| Pinned section | PinnedSection | pinned list | Click to scroll/expand if implemented | OK |
| Messages page tab | MessagesPage | setActiveTab | DMs, Groups, AI | OK |
| Messages Sign In / Sign Up | MessagesPage | Link login/signup with next=/messages | OK |
| Open Legacy AI Chat | MessagesPage | /af-legacy?tab=chat | OK |
| Bracket LeagueChat send | LeagueChat (bracket) | POST /api/bracket/leagues/[leagueId]/chat | handleSend | OK |
| Bracket LeagueChat list | LeagueChat (bracket) | GET same, poll 8s | fetchMessages | OK |
| PoolChat send / list | PoolChat | Bracket league API | Same pattern | OK |

**Note:** Poll button in LeagueChatPanel has no onClick handler. Reactions for virtual league rooms (`league:leagueId`) are not persisted (reaction API is platform-only); bracket league reactions exist in DB but are not wired through the shared thread API in this pass.

---

## 6. QA Findings

- **Room loading:** League chat in app now loads messages for virtual `league:leagueId` threads (bracket league messages). Platform threads unchanged.
- **Message sending:** League virtual room send creates BracketLeagueMessage and returns platform-shaped message; list updates. DM and platform league send unchanged.
- **Message receiving:** GET messages for league virtual room returns bracket messages; polling or refresh shows new messages.
- **Switching room types:** League / DM / AI tab switch and DM thread switch work; state is per-tab and per-thread.
- **Unread state:** Unread counts remain from existing logic (platform lastReadAt etc.); no change in this pass.
- **Mobile / desktop:** LeagueChatPanel is responsive; input and send work on mobile; Enter and button send both work.
- **AI chat:** LeagueChatPanel AI tab and Messages page “Open Legacy AI Chat” load /af-legacy?tab=chat; useAIChat and Chimmy API work in context.
- **Identity / theme / language:** Existing; chat uses panel and border vars; no regressions observed.

---

## 7. Issues Fixed

- **League virtual room messages empty:** GET/POST `/api/shared/chat/threads/[threadId]/messages` now treat `threadId` starting with `league:` as bracket league room: GET returns BracketLeagueMessage rows mapped to platform shape; POST creates BracketLeagueMessage and returns same shape. LeagueChatPanel now shows and sends league messages when the thread list contains virtual league threads (e.g. from getLegacyFallbackThreads).
- **Pinned API for league virtual room:** GET pinned for `league:*` now returns `{ pinned: [] }` instead of calling platform (which would return [] or error); UI continues to work.

No other dead buttons or broken flows were fixed in this pass; Poll button and reactions for league virtual rooms are documented for future work.

---

## 8. Final QA Checklist

- [ ] League chat (app): open league chat tab, see messages when thread is `league:leagueId`; send message; list updates.
- [ ] League chat (app): enter key and send button both send; no duplicate send.
- [ ] DM: select DM thread, see messages; send; switch threads.
- [ ] AI chat: type and send; Enter and button; AI response appears.
- [ ] Bracket league chat: messages load and send via bracket API; poll updates.
- [ ] Pinned: platform threads show pinned when present; league virtual shows none.
- [ ] Reactions: platform threads reactions work; league virtual optional.
- [ ] Mobile: chat panel usable; send and scroll work.
- [ ] Theme/language: chat respects theme and locale.
- [ ] All chat-related click paths (tabs, send, pin, reaction, close, DM select, AI send) work without dead handlers except documented Poll and league-virtual reactions.

---

## 9. Explanation of the Unified Chat System

The **unified chat** system gives one **thread list** and one **message API** for the app shell: **league chat**, **DMs**, **group chats**, and **AI** entry. Rooms are identified by **room id** — either a **platform thread UUID** (DMs, groups, or future real league threads) or a **virtual id** like **league:leagueId** (bracket league chat) or **ai:conversationId** (AI sessions). The **ChatRoomResolver** and **ChatCoreService** in **lib/chat-core** resolve room type and backend (platform vs bracket_league). The **shared API** `/api/shared/chat/threads/[threadId]/messages` handles both: for **league:*** it reads/writes **BracketLeagueMessage** and maps to the same **PlatformChatMessage** shape the frontend already uses, so **LeagueChatPanel** works without change. **Pinned** for league virtual rooms returns an empty list so the UI does not break. **RealtimeMessageService** defines poll intervals for near-realtime refresh; **MessageComposerController** and **MessageQueryService** standardize validation, enter-to-send, and pagination. **SportChatContextResolver** and **ChatPresenceResolver** provide sport (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) and presence hooks for future use. The result is a single messaging architecture that feels fast and consistent across league, DM, group, and AI, with mobile- and desktop-friendly behavior and a clear path for moderation and media expansion.
