# Prompt 87 — Mentions / Reactions / Pins / Polls + Full UI Click Audit

## 1. Social Interaction Architecture

### Overview

Social messaging features add **@mentions** (with notification bridge), **emoji reactions** (add/remove, aggregate counts), **pinned messages** (pin/unpin, pinned area), and **polls** (create, vote, show totals). The implementation reuses existing platform chat APIs where present and adds backend support for remove reaction, pin snippet, and poll vote. Frontend uses a new **lib/social-chat** layer and **MessageInteractionRenderer** in the messages thread view.

### Core Modules

| Module | Location | Role |
|--------|----------|------|
| **MentionResolver** | `lib/social-chat/MentionResolver.ts` | `parseMentions(text)`, `hasMentions(text)`, `getMentionRanges(text)`, `getMentionQueryFromInput(input)` for suggestion dropdown. |
| **MentionNotificationBridge** | `lib/social-chat/MentionNotificationBridge.ts` | `getMentionsPayload`, `notifyMentions(threadId, messageId, usernames)` — POST to `/api/shared/chat/mentions` so mentioned users get a notification. |
| **ReactionService** | `lib/social-chat/ReactionService.ts` | `getReactionsFromMetadata(meta)`, `getAddReactionUrl`, `getRemoveReactionUrl`, `QUICK_REACTIONS`. |
| **PinnedMessageService** | `lib/social-chat/PinnedMessageService.ts` | `getPinnedUrl`, `getPinUrl`, `getUnpinUrl`, `getPinPayload`, `getUnpinPayload`, `getPinnedDisplayBody`, `getReferencedMessageIdFromPin`. |
| **PollService** | `lib/social-chat/PollService.ts` | `isPollMessage`, `parsePollBody`, `getVoteUrl`, `getVotePayload`, `getClosePollUrl`, `getCreatePollPayload`; `PollPayload.closed`; constants. |
| **MessageInteractionRenderer** | `lib/social-chat/MessageInteractionRenderer.tsx` | Renders message body (with mention links), reactions row (add/remove, quick emojis), Pin button (hidden if already pinned), and poll block (question, options, vote buttons, totals). Handles pin-type messages with Unpin. |

### Data Flow

- **Mentions:** On send of a text message, frontend parses `parseMentions(body)` and calls `notifyMentions(threadId, created.id, usernames)`. Backend POST `/api/shared/chat/mentions` creates a platform notification per mentioned user with `meta: { threadId, messageId }` for jump-to-context. Message body is rendered with `getMentionRanges` and each @username is a link to `/profile/[username]`. **Mention suggestion:** When the user types `@` in the composer, GET `.../threads/[threadId]/members` provides thread members; a dropdown shows usernames matching the fragment after `@` (e.g. `@j` → filter by "j"); ArrowUp/ArrowDown/Enter/Tab select; click or Enter inserts `@username `.
- **Reactions:** Message `metadata.reactions` is an array of `{ emoji, count, userIds }`. POST to `.../messages/[messageId]/reactions` adds; DELETE same URL with body `{ emoji }` removes. Frontend refreshes messages after add/remove.
- **Pins:** GET `.../pinned` returns pin-type messages (body JSON `{ messageId, snippet }`). Pin creation (POST `.../pin` with `messageId`) fetches the referenced message and stores a snippet in the pin body. Unpin (POST `.../unpin` with `pinMessageId`) deletes the pin message. PinnedSection shows pinned list; Pin button on messages is hidden when that message is already pinned.
- **Polls:** POST `.../polls` creates a poll message (body JSON `{ question, options, votes? }`). POST `.../messages/[messageId]/vote` with `{ optionIndex }` records one vote per user (overwrites previous). Frontend parses poll body and renders options with vote counts and percentage.

---

## 2. Mention / Reaction / Pin / Poll Logic

- **Mention detection:** Regex `@(\w+)`; `parseMentions` returns unique usernames; `getMentionRanges` returns `{ start, end, username }[]` for splitting body into text and link segments.
- **Mention notification:** After a text message is created, if `parseMentions(text)` is non-empty, `notifyMentions(threadId, message.id, usernames)` is called. Backend resolves usernames to user IDs and creates a notification per user (excluding sender).
- **Reaction add:** POST reactions URL with `{ emoji }`; backend appends current user to `metadata.reactions[].userIds` for that emoji or adds a new reaction entry.
- **Reaction remove:** DELETE reactions URL with body `{ emoji }`; backend removes current user from that emoji’s userIds and prunes empty entries.
- **Pin:** POST pin URL with `{ messageId }`; backend loads the message, builds a snippet, creates a pin-type message with body `{ messageId, snippet }`. Pinned list is fetched separately; main message list filters out `messageType === 'pin'` so pin records are only shown in PinnedSection.
- **Unpin:** POST unpin URL with `{ pinMessageId }`; backend deletes the pin message. Frontend refetches pinned and messages.
- **Poll create:** POST polls URL with `{ question, options }` (2–6 options). Poll message body is JSON `{ question, options, votes: {} }`.
- **Poll vote:** POST vote URL with `{ optionIndex }`; backend ensures one vote per user (removes user from other options, adds to chosen). Frontend refetches messages to show updated counts.

---

## 3. Backend Updates

- **lib/platform/chat-service.ts**
  - **removeReactionFromMessage(appUserId, threadId, messageId, emoji):** Removes current user from the reaction’s userIds; removes the reaction entry if count becomes 0.
  - **votePollMessage(appUserId, threadId, messageId, optionIndex):** Loads poll message, parses body, updates `votes` so current user is only in `votes[optionIndex]`, saves body back.

- **POST .../messages/[messageId]/reactions**
  - Unchanged (add reaction).

- **DELETE .../messages/[messageId]/reactions**
  - New. Body `{ emoji }`. Calls `removeReactionFromMessage`.

- **POST .../pin**
  - Now looks up the referenced message by messageId/threadId and builds a snippet (first 120 chars); creates pin message with payload `{ messageId, snippet }` so pinned list can show the snippet.

- **POST .../messages/[messageId]/vote**
  - New. Body `{ optionIndex: number }`. Calls `votePollMessage`. Only for `messageType === 'poll'`.

- **GET .../threads/[threadId]/members**
  - New. Returns `{ members: [{ id, username, displayName }] }` for the thread (caller must be member). Used for mention suggestion dropdown.

- **POST .../messages/[messageId]/close-poll**
  - New. Calls `closePollMessage` to set `closed: true` in poll body. Any thread member can close.

- **POST /api/shared/chat/mentions**
  - Existing. Body `{ threadId, messageId, mentionedUsernames }`. Creates platform notifications with `meta: { threadId, messageId }` for jump-to-mention (notification UI can link to `/messages?thread=threadId`).

---

## 4. Frontend Interaction Updates

- **MessagesContent (app/messages/MessagesContent.tsx)**
  - **Session:** `useSession()` for `currentUserId` (for reactions and poll vote).
  - **Pinned:** State `pinned`; `loadPinned(threadId)` on thread change; **PinnedSection** above the message list with `onUnpin` that POSTs unpin then refetches pinned and messages.
  - **Message list:** Messages filtered to `messageType !== 'pin'`. Each message rendered with **MessageInteractionRenderer** (threadId, currentUserId, pinnedReferencedIds, onReactionUpdate, onPinUpdate, onVote, onImageClick, getMessageSnippet).
  - **Mentions:** After sending a text message, `parseMentions(text)` and `notifyMentions(threadId, created.id, mentionedUsernames)`.
  - **Poll create:** “Poll” (BarChart3) button in composer opens modal (question + 2–6 options, Add option); Create POSTs to polls and refetches messages.
  - Callbacks `onReactionUpdate`, `onPinUpdate`, `onVote` call `loadMessages(selectedThreadId)` (and `loadPinned` for pin updates).

- **MessageInteractionRenderer**
  - **Text with mentions:** Renders body with @username segments as `<Link href={/profile/[username]}>@username</Link>`.
  - **Reactions:** Renders `metadata.reactions` as buttons (emoji + count); click toggles add/remove (userHasReacted). Quick-reaction buttons (QUICK_REACTIONS) add reaction.
  - **Pin:** “Pin” button (hidden if message id is in pinnedReferencedIds); “Pinned” label when already pinned. Pin-type messages render snippet and “Unpin” (only when component is used with pin messages; in this app pin messages are excluded from the list).
  - **Poll:** Question and option buttons with percentage and count; click to vote (disabled when closed or after vote); "Close poll" button when open; when closed, "Closed" badge and no vote/close; refetch on vote and on close.

- **PinnedSection (components/chat/PinnedSection.tsx)**
  - Unchanged; uses `getPinnedDisplayBody` from league-chat (compatible with platform pin body `{ messageId, snippet }`).

---

## 5. Full UI Click Audit Findings

| Element | Component / Route | Handler | State / API | Status |
|--------|-------------------|--------|-------------|--------|
| Mention in message body | MessageInteractionRenderer | Link to `/profile/[username]` | Navigation | Wired |
| Reaction add (quick emoji) | MessageInteractionRenderer | `handleAddReaction` → POST reactions | onReactionUpdate → loadMessages | Wired |
| Reaction remove (click existing) | MessageInteractionRenderer | `handleRemoveReaction` → DELETE reactions | onReactionUpdate → loadMessages | Wired |
| Pin button | MessageInteractionRenderer | `handlePin` → POST pin | onPinUpdate → loadPinned + loadMessages | Wired |
| Pinned area Unpin | PinnedSection / MessagesContent | onUnpin → POST unpin | loadPinned + loadMessages | Wired |
| Pinned message display | PinnedSection | getPinnedDisplayBody (snippet) | From GET pinned | Wired |
| Create poll button | MessagesContent | Opens poll modal | pollCreateOpen | Wired |
| Poll modal Cancel | MessagesContent | Closes modal, resets form | Local state | Wired |
| Poll modal Create | MessagesContent | POST polls, close, loadMessages | API + state | Wired |
| Poll option (vote) | MessageInteractionRenderer PollBlock | POST vote | onVote → loadMessages | Wired |
| Close poll button | MessageInteractionRenderer PollBlock | POST close-poll | onPollClose → loadMessages | Wired |
| Add option (poll) | MessagesContent | setPollOptions([...o, ""]) | Local state | Wired |
| Notification (mention) | — | Backend creates notification with threadId/messageId | meta for jump-to | Backend wired |
| Back / mobile | Existing | ChevronLeft, thread list | Existing | Preserved |

---

## 6. QA Findings

- **Mentions:** Sending text with @username creates notifications for resolved users; message body renders @username as profile links.
- **Reactions:** Add (quick or existing bubble) and remove (click same bubble) update counts; list refetches so state is correct.
- **Pins:** Pin stores snippet; pinned list shows snippet; unpin removes and refetches. Pin button hidden for already-pinned messages.
- **Polls:** Create poll (question + options) posts and appears in list; voting updates counts and disables further vote; percentages and totals display.
- **Notification jump-to-mention:** Notifications include threadId/messageId; client can link to `/messages?thread=threadId` (and optionally scroll to messageId when supported).

---

## 7. Issues Fixed

- **Remove reaction:** Backend had no remove; added `removeReactionFromMessage` and DELETE handler on reactions route.
- **Pin display:** Pin message body was only `{ messageId }`; pin route now fetches referenced message and stores `snippet` so PinnedSection and getPinnedDisplayBody show the snippet.
  - **Poll vote:** No vote API; added `votePollMessage` and POST `.../messages/[messageId]/vote` with `optionIndex`.
  - **Poll close:** Added `closePollMessage` and POST `.../messages/[messageId]/close-poll`; PollBlock shows "Close poll" and closed state.
  - **Mention suggestion:** Added GET `.../threads/[threadId]/members` and composer dropdown when typing `@`; `getMentionQueryFromInput` and thread members filter.
- **Message list and pin-type:** Pin-type messages excluded from main list so they only appear in PinnedSection; MessageInteractionRenderer still handles pin-type for consistency.
- **Already-pinned state:** Pin button hidden when message id is in pinnedReferencedIds; “Pinned” label shown.

---

## 8. Final QA Checklist

- [ ] Send message with @username; mentioned user receives notification; @username in message links to profile.
- [ ] Add reaction (quick emoji or new bubble); count updates; remove by clicking same bubble; list refetches.
- [ ] Pin a message; it appears in PinnedSection with snippet; Pin button on that message becomes “Pinned” or hidden.
- [ ] Unpin from PinnedSection; pin disappears; Pin button on original message reappears.
- [ ] Create poll (question + ≥2 options); poll appears in thread; vote updates counts; cannot vote again.
- [ ] Notification from mention opens or could open thread (client links to /messages?thread=threadId).
- [ ] All reaction/pin/poll/mention click paths work with no dead buttons.

---

## 9. Explanation of the Social Interaction System

- **@mentions** let users tag others by username. When a message is sent, the client parses @username and calls the mentions API, which creates a notification for each mentioned user (excluding the sender). Notifications carry threadId and messageId so the app can open the thread (and ideally scroll to the message). In the message list, @username is rendered as a link to that user’s profile.

- **Reactions** are emoji attached to a message and stored in `metadata.reactions` as an array of `{ emoji, count, userIds }`. Any thread member can add or remove their reaction. The UI shows each emoji with its count; clicking toggles the current user’s reaction. Quick-reaction buttons let users add common emojis without opening a picker.

- **Pinned messages** are represented as separate “pin” messages whose body references the original message and a short snippet. The backend creates this snippet when pinning so the pinned list can show what was pinned without loading the full message. The main message list hides pin-type messages and shows a PinnedSection above the list. Unpinning deletes the pin message and refetches both pinned and messages.

- **Polls** are messages with `messageType: 'poll'` and body JSON `{ question, options, votes, closed? }`. Votes are stored as `votes[optionIndex] = [userId, ...]` with one vote per user (re-voting overwrites). Any thread member can close the poll (POST close-poll), which sets `closed: true` and disables further voting. The UI shows the question, option buttons with percentage and count, "Close poll" when open, and a "Closed" badge when closed. Create poll is a modal from the composer (question + options); creating posts to the polls API and the new message appears in the thread.

- **Unread mention context:** Mention notifications already include `meta: { threadId, messageId }`. The notification center or inbox can use this to link to `/messages?thread=threadId` (and optionally scroll to or highlight the message) so users can jump to the mention. No additional backend field is required for basic jump-to-mention.

All of these features are wired so that handlers call the correct APIs and refresh state (messages and/or pinned) so the UI stays in sync with the backend.
