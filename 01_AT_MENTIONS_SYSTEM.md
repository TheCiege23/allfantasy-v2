# @ Mentions System — Full Production Cursor Prompt

## FEATURE OVERVIEW
Adds four @ mention types to all AllFantasy chat surfaces:
- **@global** — Commissioner broadcast to multiple leagues simultaneously
- **@chimmy** — Private AI message (server-side hidden from all other users)
- **@username** — Tag a specific manager with notification
- **@all** — Broadcast to all members of current league/huddle chat

---

## CURSOR PROMPT

```
Read these files completely before changing anything:
  app/dashboard/components/chat/ChatComposer.tsx
  app/dashboard/components/chat/EmojiPicker.tsx
  app/dashboard/components/chat/GifPicker.tsx
  app/dashboard/components/chat/PollComposer.tsx
  app/dashboard/components/chat/AttachmentPreview.tsx
  app/api/shared/chat/mentions/route.ts
  lib/chat-core/league-message-proxy.ts
  lib/notifications/NotificationDispatcher.ts
  lib/push-notifications/push-service.ts
  lib/notification-settings/types.ts
  app/dashboard/components/LeagueChatInPanel.tsx
  app/dashboard/components/LeftChatPanel.tsx
  app/dashboard/components/AFChatDMPanel.tsx
  prisma/schema.prisma

══════════════════════════════════════════════════════
WHAT ALREADY EXISTS — DO NOT REBUILD
══════════════════════════════════════════════════════

✅ ChatComposer — full composer (GIF, emoji, poll, voice, images)
✅ @chimmy autocomplete for BB/C2C/IDP leagues (bbSuggest pattern)
✅ mentions API — /api/shared/chat/mentions dispatches notifications
✅ NotificationDispatcher + push-service — notification infrastructure
✅ EmojiPicker, GifPicker, PollComposer — already built

WHAT THIS PROMPT BUILDS:
  1. @global — Commissioner multi-league broadcast popup
  2. @chimmy — Truly private AI messages (security hardened)
  3. @username — Manager mention autocomplete + notifications
  4. @all — Broadcast to all members in current chat
  5. @mention autocomplete dropdown in composer
  6. Privacy layer for @chimmy server-side filtering

CHAT CONTEXT RULES (enforce everywhere):
  Chimmy chat:      NO @global, NO @chimmy, NO @all
  League chat:      ALL @ mentions work
  Huddle/group:     ALL @ mentions work
  1-on-1 DM:        ONLY @chimmy and @username (not @all, not @global)
  Draft chat:       @username, @all, @chimmy (NOT @global)

══════════════════════════════════════════════════════
STEP 1 — DATABASE: ADD PRIVACY FIELDS
══════════════════════════════════════════════════════

READ prisma/schema.prisma. Find LeagueChatMessage model.
Add these fields IF they don't already exist:

  model LeagueChatMessage {
    ...existing fields...
    isPrivate          Boolean   @default(false)
    visibleToUserId    String?
    messageSubtype     String?   // 'chimmy_private' | 'global_broadcast' | 'at_all' | null
    mentionedUserIds   String[]
    globalBroadcastId  String?
  }

Also check PlatformChatMessage — add same fields.

Run: npx prisma migrate dev --name add_message_privacy_and_mentions

══════════════════════════════════════════════════════
STEP 2 — PRIVACY MIDDLEWARE (CRITICAL SECURITY)
══════════════════════════════════════════════════════

Create lib/chat-core/mentionPrivacyFilter.ts

export function filterPrivateMessages(
  messages: any[],
  requestingUserId: string
): any[] {
  return messages.filter(msg => {
    if (!msg.isPrivate) return true
    return msg.visibleToUserId === requestingUserId
  })
}

export function isChimmyPrivateMessage(text: string): boolean {
  return /^@chimmy\b/i.test(text.trim()) ||
         text.trim().toLowerCase().startsWith('@chimmy')
}

export function parseAtMentions(text: string): {
  hasGlobal: boolean
  hasChimmy: boolean
  hasAll: boolean
  userMentions: string[]
} {
  return {
    hasGlobal: /@global\b/i.test(text),
    hasChimmy: /@chimmy\b/i.test(text),
    hasAll: /@all\b/i.test(text),
    userMentions: [...text.matchAll(/@([a-zA-Z0-9_]+)/g)]
      .map(m => m[1])
      .filter(u => !['global','chimmy','all'].includes(u.toLowerCase())),
  }
}

APPLY filterPrivateMessages in ALL chat message fetch routes.

══════════════════════════════════════════════════════
STEP 3 — @CHIMMY PRIVATE MESSAGE FLOW
══════════════════════════════════════════════════════

When user sends a message containing @chimmy (any chat EXCEPT Chimmy chat):

Server-side in message send route:
  1. Detect with isChimmyPrivateMessage()
  2. Store user message: isPrivate: true, visibleToUserId: senderUserId,
     messageSubtype: 'chimmy_private'
  3. Call Chimmy AI with text after @chimmy
  4. Store Chimmy response: isPrivate: true, visibleToUserId: senderUserId,
     messageSubtype: 'chimmy_private', senderName: 'Chimmy'
  5. Return BOTH messages to sender ONLY

Frontend — add 🔒 lock icon + "Only visible to you" label
on all isPrivate messages. NEVER show to other users.

══════════════════════════════════════════════════════
STEP 4 — @ MENTION AUTOCOMPLETE HOOK
══════════════════════════════════════════════════════

Create lib/chat-core/useMentionAutocomplete.ts

export type MentionType = '@global' | '@chimmy' | '@all' | '@username'

export type MentionSuggestion = {
  type: MentionType
  value: string
  label: string
  description?: string
  avatarUrl?: string
}

export function useMentionAutocomplete({
  text, cursorPos, leagueId, chatType, isCommissioner,
}: {
  text: string
  cursorPos: number
  leagueId?: string | null
  chatType: 'league' | 'huddle' | 'dm' | 'chimmy' | 'draft'
  isCommissioner?: boolean
})

Logic:
  1. Detect @... being typed at cursor position
  2. Build suggestion list based on chatType + isCommissioner:
     - @global: only commissioners, not in DM or draft
     - @chimmy: everywhere except chimmy chat
     - @all: league and huddle only
     - @username: fetch /api/leagues/{id}/members/autocomplete?q=query
  3. Return suggestions + atQuery

══════════════════════════════════════════════════════
STEP 5 — LEAGUE MEMBERS AUTOCOMPLETE API
══════════════════════════════════════════════════════

Create app/api/leagues/[leagueId]/members/autocomplete/route.ts

GET ?q=searchQuery
  1. Auth required
  2. Find league teams matching username/displayName (case-insensitive)
  3. Return top 8 results, exclude self
  Response: [{ username, displayName, avatarUrl }]

══════════════════════════════════════════════════════
STEP 6 — MENTION AUTOCOMPLETE DROPDOWN
══════════════════════════════════════════════════════

Create app/dashboard/components/chat/MentionAutocomplete.tsx

Renders suggestions above the composer textarea.
Same style as existing bbSuggest dropdown in ChatComposer.

Props: {
  suggestions: MentionSuggestion[]
  onSelect: (suggestion: MentionSuggestion) => void
  onDismiss: () => void
}

Design:
  max-h-48 overflow-y-auto, rounded-lg buttons, hover:bg-cyan-500/15
  Icons: 📡 @global, 🔒 @chimmy, 📢 @all, avatar for @username

══════════════════════════════════════════════════════
STEP 7 — @GLOBAL BROADCAST MODAL
══════════════════════════════════════════════════════

Create app/dashboard/components/chat/GlobalBroadcastModal.tsx

Props: {
  isOpen: boolean
  onClose: () => void
  commissionerLeagues: { id: string; name: string; teamCount: number }[]
  onSend: (payload: GlobalBroadcastPayload) => Promise<void>
}

export type GlobalBroadcastPayload = {
  messageType: 'text' | 'event' | 'poll'
  text: string
  gifUrl?: string
  gifId?: string
  imageUrl?: string
  event?: {
    title: string
    date: string
    time: string
    description: string
    eventType: 'draft' | 'trade_deadline' | 'playoff' | 'custom'
  }
  poll?: {
    question: string
    options: string[]
    closeAt: Date
    allowMultiple: boolean
  }
  selectedLeagueIds: string[]
}

MODAL LAYOUT:
  Header: "📡 Global Broadcast" [X close]
  Tab row: [Message] [Event] [Poll]
  
  Message tab: textarea + GIF + Emoji + Image buttons
  Event tab: eventType dropdown, title input, date/time inputs, description
  Poll tab: reuse PollComposer component
  
  League selection section (all tabs):
    [Select All] checkbox
    League list with checkboxes: name + team count
  
  Footer: character count + selected league count
    [Cancel] [📡 Broadcast to N leagues]
  
  Disabled when: no leagues selected, required fields empty

══════════════════════════════════════════════════════
STEP 8 — GLOBAL BROADCAST API
══════════════════════════════════════════════════════

Create app/api/chat/global-broadcast/route.ts

POST — authenticated, commissioner only
Body: GlobalBroadcastPayload

  1. Auth + validate commissioner of ALL selectedLeagueIds
  2. Generate globalBroadcastId = cuid()
  3. For each selectedLeagueId:
     a. Create LeagueChatMessage: messageSubtype: 'global_broadcast',
        globalBroadcastId, metadata with event/poll/gif
     b. Fetch all league members
     c. Dispatch notification to all members:
        type: 'global_broadcast', title: '📡 League Announcement',
        body: '{commissionerName} sent a message to your league'
  4. Return: { success: true, sentToLeagues: N, broadcastId }

══════════════════════════════════════════════════════
STEP 9 — @ALL HANDLER
══════════════════════════════════════════════════════

UPDATE message send flow:

When message contains @all:
  1. Store normally: messageSubtype: 'at_all'
  2. After send, dispatch notification to all league/huddle members
     (exclude sender, respect notification preferences)
  3. Gate: only league + huddle chats, skip in DM

══════════════════════════════════════════════════════
STEP 10 — UPDATE ChatComposer
══════════════════════════════════════════════════════

UPDATE app/dashboard/components/chat/ChatComposer.tsx

New props:
  chatType?: 'league' | 'huddle' | 'dm' | 'chimmy' | 'draft'
  isCommissioner?: boolean
  commissionerLeagues?: { id: string; name: string; teamCount: number }[]
  currentUserId?: string

Add:
  1. Import + wire useMentionAutocomplete hook
  2. Track cursor position on textarea (onKeyUp, onClick)
  3. Replace bbSuggest dropdown with MentionAutocomplete
     - @global selection: open GlobalBroadcastModal
     - Other selections: insert @mention text at cursor
  4. Keep existing bbSuggest for BB/C2C/IDP (don't remove)
  5. Add GlobalBroadcastModal to render tree
  6. After send: if @username present, call /api/shared/chat/mentions
  7. If @chimmy message: mark isPrivate: true in send payload

══════════════════════════════════════════════════════
STEP 11 — MESSAGE RENDERER VISUAL LABELS
══════════════════════════════════════════════════════

Find the message render component. Add:

  Private @chimmy (isPrivate && visibleToUserId === currentUser):
    Background: bg-violet-500/5 border border-violet-500/15
    Label: 🔒 Only visible to you
    Chimmy response: 🔒 Chimmy (private)

  @global (messageSubtype === 'global_broadcast'):
    Left border: border-l-2 border-l-cyan-500
    Label: 📡 Global Broadcast

  @all (messageSubtype === 'at_all'):
    Left border: border-l-2 border-l-amber-400
    Label: 📢 @all

══════════════════════════════════════════════════════
STEP 12 — PASS PROPS DOWN COMPONENT TREE
══════════════════════════════════════════════════════

DashboardShell → compute commissionerLeagues:
  const commissionerLeagues = useMemo(() =>
    leagues.filter(l => l.isCommissioner)
      .map(l => ({ id: l.id, name: l.name, teamCount: l.teamCount ?? 0 })),
    [leagues]
  )

Pass commissionerLeagues down to:
  LeftChatPanel → LeagueChatInPanel → ChatComposer

══════════════════════════════════════════════════════
FILES TO CREATE
══════════════════════════════════════════════════════

CREATE:
  lib/chat-core/mentionPrivacyFilter.ts
  lib/chat-core/useMentionAutocomplete.ts
  app/dashboard/components/chat/MentionAutocomplete.tsx
  app/dashboard/components/chat/GlobalBroadcastModal.tsx
  app/api/chat/global-broadcast/route.ts
  app/api/leagues/[leagueId]/members/autocomplete/route.ts

UPDATE:
  prisma/schema.prisma
  app/dashboard/components/chat/ChatComposer.tsx
  app/api/shared/chat/mentions/route.ts
  app/dashboard/components/LeagueChatInPanel.tsx
  app/dashboard/DashboardShell.tsx
  (All message fetch API routes — apply filterPrivateMessages)
  (Message renderer component — add visual labels)

══════════════════════════════════════════════════════
FINAL STEPS
══════════════════════════════════════════════════════

1. npx prisma migrate dev --name add_message_privacy_and_mentions
2. npx tsc --noEmit — fix ALL type errors
3. git add -A
4. git commit -m "feat(at-mentions): @global commissioner broadcast modal (message/event/poll, multi-league, notifications), @chimmy private AI messages (server-side privacy filter, lock icon), @username mention autocomplete + notifications, @all league broadcast + notifications, MentionAutocomplete dropdown, GlobalBroadcastModal, mentionPrivacyFilter security layer"
5. git push origin main
6. Confirm Vercel build is READY
7. Report commit hash
```
