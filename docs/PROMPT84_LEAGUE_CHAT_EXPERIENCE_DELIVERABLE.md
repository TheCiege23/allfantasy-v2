# Prompt 84 — League Chat Experience + Full UI Click Audit

## 1. League Chat Architecture

### Overview

League chat is the **central social surface** for a league: **LeagueChatPanel** (league tab, DMs, AI) is rendered inside **LeagueChatTab** on the app league page and via **LeagueChatDock** in the layout. Messages come from **platform threads** (UUID) or **virtual league rooms** (`league:leagueId` → bracket league API). The experience is backed by **lib/league-chat** (service, composer, system notices, pinned, mentions, poll, notification bridge) and the existing **shared chat API** plus **unpin** and **bracket league proxy** from Prompt 83.

### Conversation Types in League Chat

| Type | Description | Storage / API |
|------|-------------|----------------|
| **Normal messages** | Text from members | Platform or BracketLeagueMessage |
| **League announcements** | Commissioner @everyone | messageType `broadcast`, body JSON `{ announcement }` |
| **Trade / waiver notices** | System or bot | messageType `system` or future types; backend/cron |
| **Commissioner messages** | CommissionerBroadcastForm | POST …/broadcast → createPlatformThreadTypedMessage('broadcast', …) |
| **Reactions** | Emoji on messages | metadata.reactions (platform); BracketMessageReaction for bracket |
| **Mentions** | @username | parseMentions → POST …/mentions → createPlatformNotification |
| **Pinned messages** | Pin refs at top | messageType `pin`, body `{ messageId }`; PinnedSection + unpin API |
| **Polls** | Question + options | messageType `poll`, metadata `{ question, options }`; LeaguePollComposer |

### Core Modules (lib/league-chat)

| Module | Role |
|--------|------|
| **LeagueChatService** | getLeagueChatMessagesUrl, getLeagueChatPinnedUrl, getLeagueChatSendPayload, getLeagueChatPinPayload, getLeagueChatBroadcastPayload, isLeagueVirtualChat. |
| **LeagueMessageComposer** | Re-exports validateMessageBody, MAX_MESSAGE_LENGTH, isSendKey, handleComposerKeyDown from chat-core. |
| **LeagueSystemNoticeRenderer** | isLeagueSystemNotice(messageType), getLeagueSystemNoticeLabel, getBroadcastBody, getStatsBotPayload, getPinReferencedMessageId. |
| **PinnedLeagueMessageResolver** | getPinnedDisplayBody(msg), getReferencedMessageIdFromPin(pinMessage). |
| **LeagueMentionResolver** | parseMentions(text), hasMentions(text). |
| **LeaguePollService** | createLeaguePollPayload(question, options), isPollMessage, LEAGUE_POLL_MAX_OPTIONS, etc. |
| **LeagueChatNotificationBridge** | LEAGUE_CHAT_MENTIONS_ENDPOINT, getMentionsPayload; mentions API creates platform notifications. |

### Data Flow

- **Load:** GET threads → GET messages + GET pinned for resolved league thread (platform or `league:leagueId`).
- **Send:** POST messages with getLeagueChatSendPayload; then parseMentions → POST mentions if any.
- **Pin:** POST …/pin with messageId → creates pin-type message; GET pinned returns them; **Unpin:** POST …/unpin with pinMessageId → deletePinMessage (platform only).
- **Broadcast:** CommissionerBroadcastForm → POST …/broadcast → createPlatformThreadTypedMessage('broadcast', { announcement }).
- **Poll:** LeaguePollComposer → POST messages with messageType 'poll' and metadata { question, options }; supported for platform threads.
- **System notices:** broadcast, stats_bot, pin (and poll) rendered with distinct styling in LeagueMessageRow via LeagueSystemNoticeRenderer helpers.

---

## 2. Backend League Chat Updates

- **POST /api/shared/chat/threads/[threadId]/unpin** (new)  
  Body: `{ pinMessageId }`. Calls **deletePinMessage(appUserId, threadId, pinMessageId)** in chat-service; only deletes messages with messageType `'pin'`. Returns 400 for virtual league rooms (unpin not supported there).

- **lib/platform/chat-service.ts**  
  **deletePinMessage(appUserId, threadId, pinMessageId)** added: verifies member, verifies message is pin-type, deletes the message.

- **GET/POST messages** for `league:leagueId` (from Prompt 83) unchanged; **GET pinned** for `league:*` returns `[]`.

- **Mentions** (POST …/mentions), **broadcast** (POST …/broadcast), **pin** (POST …/pin) unchanged.

Sport support: **SportChatContextResolver** in chat-core and league-chat use **lib/sport-scope** (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER). No new sport-specific backend changes.

---

## 3. Frontend League Chat Component Updates

- **LeagueChatPanel**
  - Uses **parseMentions**, **getLeagueChatSendPayload**, **getMentionsPayload**, **LEAGUE_CHAT_MENTIONS_ENDPOINT**, **isLeagueVirtualChat**, **handleComposerKeyDown**, **createLeaguePollPayload**, **isLeagueSystemNotice**, **getLeagueSystemNoticeLabel**, **getBroadcastBody**, **getStatsBotPayload** from lib/league-chat.
  - **PinnedSection:** receives **canUnpin={isCommissioner && !isLeagueVirtualChat(resolvedLeagueThreadId)}** and **onUnpin** that POSTs to …/unpin then **loadMessages**.
  - **Scroll to bottom:** empty div at end of message list with ref; button (when messages.length > 3) scrolls to it with smooth behavior.
  - **League tab:** **showPin** set to false for virtual league rooms (reactions/pin not persisted there).
  - **Enter key:** **handleComposerKeyDown(e, handleSendLeague, canSend)** for consistent send-on-Enter.
  - **Poll:** **showPollComposer** state; **LeaguePollComposer** (question + 2 options, Post poll / Cancel) when open; **MediaPlaceholderButtons** receive **onPollClick** to toggle composer.
  - **LeagueMessageRow:** system notices (broadcast, stats_bot, pin) use distinct styling (background, border, label, icon); **displayBody** from getBroadcastBody / getStatsBotPayload for broadcast/stats_bot; Pin button hidden for system notices (**showPin && !isSystemNotice**).

- **LeaguePollComposer** (inline in LeagueChatPanel)  
  Question + Option 1 + Option 2; submit POSTs to …/messages with messageType `'poll'` and metadata from **createLeaguePollPayload**; on success calls onSent (close composer + loadMessages) and onCancel closes composer.

- **PinnedSection**  
  Uses **getPinnedDisplayBody(m)** from lib/league-chat for display text; **onUnpin(pinMessageId)** passes the pin message id (same as existing contract).

---

## 4. Activity / System Notice Integration Updates

- **Commissioner broadcast:** CommissionerBroadcastForm unchanged; creates broadcast messages; **LeagueMessageRow** renders them with Commissioner label, amber styling, and Megaphone icon; body from **getBroadcastBody**.
- **Chat Stats Bot:** Placeholder stats (placeholderStatsBotUpdate) shown above the list; **stats_bot** messages in the list rendered with “Chat Stats Bot” label and compact stats line from **getStatsBotPayload**.
- **Pin:** Pin-type messages in the list rendered as “Pinned” with distinct style; **PinnedSection** shows pinned refs; **Unpin** (commissioner, platform only) removes the pin message and refreshes.
- **Mentions:** After send, **parseMentions** and **getMentionsPayload** trigger POST to **LEAGUE_CHAT_MENTIONS_ENDPOINT**; backend creates platform notifications for mentioned users.
- **Trade / waiver notices:** Backend or cron can create system/notice messages; **LeagueSystemNoticeRenderer** and **LeagueMessageRow** treat **system** and other notice types with a label and consistent styling.

---

## 5. Full UI Click Audit Findings

| Element | Component | Route / Behavior | Handler / Wiring | Status |
|--------|-----------|------------------|------------------|--------|
| League chat tab | LeagueChatPanel | setActiveTab("league") | button onClick | OK |
| DM tab | LeagueChatPanel | setActiveTab("dm") | button onClick | OK |
| AI chat tab | LeagueChatPanel | setActiveTab("ai") | button onClick | OK |
| Close chat | LeagueChatPanel | onClose | button onClick | OK |
| Message send button | LeagueChatPanel | handleSendLeague | disabled when empty/sending | OK |
| Enter key send | LeagueChatPanel | handleComposerKeyDown → handleSendLeague | league-chat handleComposerKeyDown | OK |
| Pin message | LeagueMessageRow | onPin → handlePin(m.id) | POST …/pin; loadMessages | OK |
| Unpin (pinned section) | PinnedSection | onUnpin(m.id) | POST …/unpin; loadMessages | OK (platform only) |
| Reaction add | LeagueMessageRow | onReaction(emoji) | POST …/reactions; loadMessages | OK (platform); bracket virtual N/A |
| Emoji picker open | LeagueMessageRow | setPickerOpen(true) | + button | OK |
| Emoji picker choose | LeagueMessageRow | onReaction(emoji); setPickerOpen(false) | button per emoji | OK |
| GIF button | MediaPlaceholderButtons | upload.uploadGif() | useMediaUpload | OK |
| Image button | MediaPlaceholderButtons | upload.uploadImage() | useMediaUpload | OK |
| Video / Meme buttons | MediaPlaceholderButtons | upload.uploadVideo / uploadMeme | useMediaUpload | OK |
| Poll button | MediaPlaceholderButtons | onPollClick | setShowPollComposer | OK |
| Poll composer submit | LeaguePollComposer | handleSubmit | POST poll message; onSent | OK |
| Poll composer cancel | LeaguePollComposer | onCancel | setShowPollComposer(false) | OK |
| Commissioner broadcast | CommissionerBroadcastForm | handleSubmit | POST …/broadcast; onSent | OK |
| Scroll to bottom | LeagueChatPanel | messagesEndRef.scrollIntoView | button when messages.length > 3 | OK |
| Pinned section Unpin | PinnedSection | onUnpin(pinMessageId) | only when canUnpin | OK |
| Profile/sender (future) | LeagueMessageRow | — | no link yet | Note |
| More menu | LeagueMessageRow | aria-label only | no handler | Note |

**Note:** Profile click from message row and More menu actions (e.g. copy, report) are not implemented; documented for future work.

---

## 6. QA Findings

- **League chat loads:** Messages and pinned load for both platform thread and virtual `league:leagueId`; loading state and empty state shown.
- **Messages send:** Text send works; payload from getLeagueChatSendPayload; mentions trigger mention API.
- **Mentions:** parseMentions and getMentionsPayload used; POST to mentions endpoint; notifications created for mentioned users.
- **Pinning:** Pin creates pin-type message; pinned list shows getPinnedDisplayBody; **Unpin** (commissioner, platform only) removes pin and refreshes.
- **Reactions:** Platform threads: add reaction and refresh; virtual league room: reaction API not applied (no persistence for bracket in shared API).
- **League notices:** Broadcast and stats_bot messages render with Commissioner / Chat Stats Bot label and distinct styling; pin-type messages in list show “Pinned” and distinct style.
- **Commissioner messages:** CommissionerBroadcastForm sends broadcast; messages appear with Commissioner styling.
- **Mobile compose/send:** Input and send button work; Enter and button both send; scroll-to-bottom and poll composer usable on small screens.
- **Poll:** Poll button opens composer; question + 2 options; post sends poll message (platform threads); composer closes and list refreshes.

---

## 7. Issues Fixed

- **Poll button dead:** Wired **onPollClick** to **setShowPollComposer**; added **LeaguePollComposer** (question, 2 options, Post poll / Cancel) and POST with messageType `'poll'` and metadata.
- **Unpin missing:** Added **POST …/unpin** and **deletePinMessage** in chat-service; **PinnedSection** receives **canUnpin** and **onUnpin**; commissioner can unpin on platform threads (unpin not supported for virtual league room).
- **Pinned display logic duplicated:** **PinnedSection** now uses **getPinnedDisplayBody** from lib/league-chat.
- **System notices looked like normal messages:** **LeagueMessageRow** uses **isLeagueSystemNotice**, **getLeagueSystemNoticeLabel**, **getBroadcastBody**, **getStatsBotPayload**; broadcast has Commissioner label and amber styling; stats_bot and pin have distinct background and label; Pin button hidden for system notices.
- **No scroll to bottom:** Added ref at end of message list and “Scroll to bottom” button when there are more than 3 messages.
- **Enter key not using shared composer logic:** Replaced inline key check with **handleComposerKeyDown** from league-chat.
- **Mention payload ad hoc:** Switched to **getMentionsPayload** and **LEAGUE_CHAT_MENTIONS_ENDPOINT** from league-chat.

---

## 8. Final QA Checklist

- [ ] League chat tab loads messages and pinned; virtual league room shows bracket messages.
- [ ] Send message (button and Enter); no duplicate send; mentions trigger notifications.
- [ ] Pin message; pinned section updates; Unpin (commissioner, platform thread) removes pin and refreshes.
- [ ] Reactions (platform thread): add reaction, list refreshes.
- [ ] Commissioner broadcast: send @everyone; message appears with Commissioner styling.
- [ ] Stats bot and pin messages in list show correct labels and styling.
- [ ] Poll: open composer, enter question + 2 options, Post poll; message appears; composer closes.
- [ ] Scroll to bottom: button appears when enough messages; click scrolls to bottom.
- [ ] Mobile: compose, send, scroll, poll composer, and tabs work.
- [ ] All league-chat-related click paths (tabs, send, pin, unpin, reaction, poll, broadcast, scroll) work; no dead buttons except documented More/Profile.

---

## 9. Explanation of the League Chat Experience

The **league chat experience** is the main social layer for a league: one place for **normal messages**, **commissioner announcements**, **system and stats-bot notices**, **pinned messages**, **polls**, **reactions**, and **@mentions**. It is implemented in **LeagueChatPanel** (league / DM / AI tabs), backed by **lib/league-chat** for URLs, payloads, validation, system-notice detection, pinned display, mention parsing, poll payloads, and the mention-notification bridge. The panel uses the **shared chat API** (messages, pinned, pin, unpin, broadcast, reactions, mentions); for virtual league rooms (`league:leagueId`), messages and send go through the same API and are proxied to the bracket league backend (pin/unpin and reactions are platform-only). **LeagueMessageRow** renders normal messages with sender and timestamp and **system notices** (broadcast, stats_bot, pin) with distinct labels and styling so commissioner and bot messages are clearly recognizable. **PinnedSection** shows pinned refs and supports **Unpin** for commissioners on platform threads. **LeaguePollComposer** allows creating a poll (question + 2 options) that is stored as a poll-type message on platform threads. A **scroll-to-bottom** button keeps the latest messages in view. The experience is **mobile- and desktop-friendly**, uses **theme and language** vars, and integrates with **notifications** via the mentions API. All seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) are supported through the existing sport-scope and league context; league chat itself is sport-agnostic. The result is a single, consistent league chat that feels central, social, and premium.
