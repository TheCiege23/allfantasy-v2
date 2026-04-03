# Cursor Prompt — AllFantasy Draft Room System (Full Build)

## Read First
This is a full production build. Read this entire file before writing any code. Do not return vague guidance — return working implementation with real files, real routes, real state, and real component code.

---

## Entry Points

Wire into the existing league page at `app/league/[leagueId]/`:

- **Mock Drafts button** in `DraftTab.tsx` → opens mock draft room
- **Draft Room button** in `DraftTab.tsx` → opens live draft room

Both buttons should navigate to:
- Mock: `/draft/mock/[roomId]`
- Live: `/draft/live/[leagueId]`

Create these as new Next.js app router pages.

---

## Pages to Create

```
app/draft/
  mock/
    [roomId]/
      page.tsx
  live/
    [leagueId]/
      page.tsx
  components/
    DraftShell.tsx              # shared wrapper for both modes
    DraftBoard.tsx              # full pick grid
    PlayerPool.tsx              # draftable players table
    QueuePanel.tsx              # user queue
    RosterPanel.tsx             # current user's roster build
    DraftChatPanel.tsx          # public draft room chat
    ChimmyDraftChat.tsx         # private Chimmy AI chat
    DraftHeader.tsx             # top bar with timer + controls
    ManagerHeader.tsx           # manager columns with avatars
    PickCell.tsx                # single pick box in the board
    TradedPickBadge.tsx         # overlay for traded picks
    DraftSettingsModal.tsx      # mock draft config modal
    DraftResultsView.tsx        # post-draft recap
    PlayerCard.tsx              # full player detail popover
    AutopickToggle.tsx
    DraftTimerBar.tsx
```

---

## Routing + Mode Logic

In `DraftShell.tsx`:
- Accept `mode: 'mock' | 'live'` prop
- Accept `leagueId` (live) or `roomId` (mock)
- All child components are shared between both modes
- Data source differs: live = Sleeper API + Supabase, mock = local room state + Supabase mock session

---

## Supabase Schema — Add These Tables

```sql
-- Mock draft rooms
CREATE TABLE mock_draft_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users,
  sport TEXT NOT NULL DEFAULT 'NFL',
  num_teams INT NOT NULL DEFAULT 12,
  num_rounds INT NOT NULL DEFAULT 15,
  timer_seconds INT NOT NULL DEFAULT 60,
  scoring_type TEXT NOT NULL DEFAULT 'PPR',
  roster_settings JSONB,
  player_pool TEXT NOT NULL DEFAULT 'all', -- 'all' | 'rookies' | 'veterans'
  invite_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | active | complete
  draft_order JSONB, -- array of seat assignments
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Draft picks (both mock and live)
CREATE TABLE draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id TEXT, -- null for mock
  room_id UUID REFERENCES mock_draft_rooms, -- null for live
  round INT NOT NULL,
  pick_number INT NOT NULL,
  overall_pick INT NOT NULL,
  original_owner_id TEXT NOT NULL,
  current_owner_id TEXT NOT NULL,
  picked_by_id TEXT,
  player_id TEXT,
  player_name TEXT,
  position TEXT,
  team TEXT,
  is_traded BOOLEAN DEFAULT false,
  trade_source JSONB,
  autopicked BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Draft queues per user per session
CREATE TABLE draft_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  league_id TEXT,
  room_id UUID REFERENCES mock_draft_rooms,
  player_ids JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Draft room chat messages
CREATE TABLE draft_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id TEXT,
  room_id UUID REFERENCES mock_draft_rooms,
  user_id UUID REFERENCES auth.users,
  author_display_name TEXT,
  author_avatar TEXT,
  message TEXT,
  type TEXT DEFAULT 'user', -- 'user' | 'system' | 'chimmy'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Draft room state (real-time sync)
CREATE TABLE draft_room_state (
  id TEXT PRIMARY KEY, -- leagueId or roomId
  mode TEXT NOT NULL, -- 'mock' | 'live'
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | active | paused | complete
  current_pick INT NOT NULL DEFAULT 1,
  current_round INT NOT NULL DEFAULT 1,
  current_team_index INT NOT NULL DEFAULT 0,
  timer_ends_at TIMESTAMPTZ,
  timer_paused BOOLEAN DEFAULT false,
  pick_order JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Autopick settings per user per session
CREATE TABLE autopick_settings (
  user_id UUID REFERENCES auth.users,
  session_id TEXT,
  enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);
```

Add these to `prisma/schema.prisma` as Prisma models with the same fields. Run `npx prisma migrate dev --name add_draft_room_tables`.

---

## Real-Time with Supabase

Use Supabase Realtime subscriptions for:
- `draft_room_state` — current pick, timer, status changes
- `draft_picks` — new picks broadcast to all participants
- `draft_chat_messages` — live chat
- `draft_queues` — user queue sync across tabs

In `DraftShell.tsx`:
```ts
const channel = supabase
  .channel(`draft-${sessionId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_room_state', filter: `id=eq.${sessionId}` }, handleStateChange)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `league_id=eq.${leagueId}` }, handleNewPick)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'draft_chat_messages' }, handleNewMessage)
  .subscribe()
```

---

## API Routes to Create

```
app/api/draft/
  room/
    create/route.ts          # POST — create mock room, return roomId + invite code
    join/route.ts            # POST — join mock room by invite code
    state/route.ts           # GET — fetch current draft_room_state
  pick/
    make/route.ts            # POST — submit a pick (validates on-the-clock, saves to draft_picks)
    undo/route.ts            # POST — commissioner only, undo last pick
  queue/
    update/route.ts          # POST — save user's queue order
    get/route.ts             # GET — fetch user's current queue
  timer/
    pause/route.ts           # POST — commissioner only
    resume/route.ts          # POST — commissioner only
  chat/
    send/route.ts            # POST — save to draft_chat_messages + mirror to league chat
    history/route.ts         # GET — fetch chat history
  autopick/
    toggle/route.ts          # POST — toggle autopick for user
  mock/
    settings/route.ts        # POST — save mock draft settings
    cpu-pick/route.ts        # POST — trigger CPU pick logic
  ai/
    best-pick/route.ts
    compare/route.ts
    roster-fit/route.ts
    scarcity/route.ts
    queue-suggestions/route.ts
    pick-survival/route.ts
    draft-recap/route.ts
    grade/route.ts
```

---

## app/api/draft/pick/make/route.ts

```ts
export async function POST(req: Request) {
  const { sessionId, playerId, userId, mode } = await req.json()
  
  // 1. Validate user is currently on the clock
  // 2. Validate player is not already drafted
  // 3. Insert into draft_picks
  // 4. Update draft_room_state (advance current_pick, current_round, current_team_index)
  // 5. If live mode: sync pick to Sleeper (if Sleeper API supports it) OR save locally
  // 6. Broadcast via Supabase realtime (handled by postgres_changes)
  // 7. Post system message to draft_chat_messages: "{player} selected by {team} with pick {X.XX}"
  // 8. Mirror system message to league chat
  
  return Response.json({ success: true })
}
```

---

## Chat Mirroring Logic

In `app/api/draft/chat/send/route.ts`:
```ts
// 1. Save to draft_chat_messages
await supabase.from('draft_chat_messages').insert({ ...messageData })

// 2. Mirror to league chat (only for live drafts, not mock)
if (mode === 'live' && leagueId) {
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/league/chat`, {
    method: 'POST',
    body: JSON.stringify({
      leagueId,
      message: `[Draft Room] ${authorName}: ${message}`,
      userId,
      type: 'draft_mirror'
    })
  })
}
```

System pick events (e.g. "Pick 1.01 — Patrick Mahomes selected by TheCiege24") should also mirror to league chat.

---

## DraftBoard.tsx

```tsx
// Grid: managers across top (X columns), rounds down (Y rows)
// Each cell is a PickCell component

// Sticky behavior:
// - Manager header row: sticky top-0
// - Round labels column: sticky left-0
// - Horizontal + vertical scroll on the grid body

// Color system:
// - Assign each manager a unique hue from a predefined palette (12 colors)
// - Store in managerColorMap: { [userId]: { bg, border, text } }
// - Use these colors in: ManagerHeader, PickCell background tint, queue accents

const MANAGER_COLORS = [
  { bg: 'bg-blue-900/40', border: 'border-blue-500', text: 'text-blue-300' },
  { bg: 'bg-emerald-900/40', border: 'border-emerald-500', text: 'text-emerald-300' },
  { bg: 'bg-violet-900/40', border: 'border-violet-500', text: 'text-violet-300' },
  { bg: 'bg-orange-900/40', border: 'border-orange-500', text: 'text-orange-300' },
  { bg: 'bg-rose-900/40', border: 'border-rose-500', text: 'text-rose-300' },
  { bg: 'bg-cyan-900/40', border: 'border-cyan-500', text: 'text-cyan-300' },
  { bg: 'bg-yellow-900/40', border: 'border-yellow-500', text: 'text-yellow-300' },
  { bg: 'bg-pink-900/40', border: 'border-pink-500', text: 'text-pink-300' },
  { bg: 'bg-teal-900/40', border: 'border-teal-500', text: 'text-teal-300' },
  { bg: 'bg-indigo-900/40', border: 'border-indigo-500', text: 'text-indigo-300' },
  { bg: 'bg-lime-900/40', border: 'border-lime-500', text: 'text-lime-300' },
  { bg: 'bg-fuchsia-900/40', border: 'border-fuchsia-500', text: 'text-fuchsia-300' },
]
```

---

## PickCell.tsx

Each cell must show:
- Pick number formatted as `{round}.{pick}` (e.g. 1.01, 2.06)
- If completed: player name + position + team + manager color tint
- If traded: amber/gold overlay + TradedPickBadge
- If current pick: subtle pulse animation (`animate-pulse` on border)
- Hover tooltip: original owner, current owner, player if picked, timestamp

```tsx
<div className={cn(
  'relative border rounded p-1 text-xs min-h-[60px]',
  isCurrentPick && 'ring-2 ring-white animate-pulse',
  isTraded && 'ring-1 ring-amber-400',
  isPicked && managerColor.bg,
  !isPicked && 'bg-slate-900'
)}>
  <span className="text-slate-500 text-[10px]">{pickLabel}</span>
  {isPicked && <PlayerPickDisplay pick={pick} />}
  {isTraded && <TradedPickBadge pick={pick} />}
</div>
```

---

## DraftTimerBar.tsx

- Countdown timer showing seconds remaining
- Color states: green (>30s), yellow (10-30s), red (<10s)
- Progress bar that shrinks left to right
- "On the Clock: {teamName}" display
- Commissioner controls: Pause / Resume buttons (only visible if `isCommissioner`)
- Autopick countdown overlay when autopick is enabled

---

## PlayerPool.tsx

Columns: Rank | Player (image + name + team) | Pos | Bye | ADP | Proj Pts | Key Stat | Actions

Filters / tabs:
- Position tabs: ALL | QB | RB | WR | TE | K | DEF
- Toggle: Show Drafted / Hide Drafted
- Toggle: Watchlist Only
- Toggle: Rookies Only
- Search input (debounced 200ms)

Actions per row:
- ★ Watchlist toggle
- + Add to Queue
- DRAFT button (only active when user is on the clock and player is available)

Data source:
- Pull from existing Sleeper players cache in your DB
- Enrich with ADP from RI or static ADP dataset
- Sort by ADP by default

---

## QueuePanel.tsx

- Drag-to-reorder using `@dnd-kit/sortable`
- Remove button per item
- "Queue is empty" empty state with message "Add players to auto-draft in order"
- Syncs to `draft_queues` table on every reorder (debounced 500ms)
- Autopick uses queue[0] when user's pick comes up

---

## RosterPanel.tsx

- Shows current user's drafted players organized by roster slot
- Roster slots from league settings (QB, RB, RB, WR, WR, WR, TE, FLEX, K, DEF, BN×6, IR, TAXI)
- Empty slots shown as dashed boxes with position label
- Position need indicators: highlight positions still needed
- Color-coded by position (QB=red, RB=green, WR=blue, TE=orange, K=gray, DEF=purple)

---

## DraftSettingsModal.tsx (Mock Draft)

Show before starting a mock draft:

```
Sport: [NFL ▼]
Teams: [12 ▼]
Rounds: [15 ▼]
Timer: [60s ▼]
Scoring: [PPR ▼] [Half-PPR] [Standard]
Player Pool: [All ▼] [Rookies] [Veterans]
CPU Teams: [slider 0–11]
Draft Order: [Auto ▼] [Manual]
Invite Link: [copy button]
[Start Mock Draft]
```

---

## CPU Pick Logic (app/api/draft/mock/cpu-pick/route.ts)

```ts
// Simple fallback ranking for CPU picks:
// 1. Get all undrafted players sorted by ADP
// 2. Check CPU team's current roster needs
// 3. Apply positional scarcity logic:
//    - If no QB drafted by round 8, consider QB
//    - Fill skill positions first
//    - Fill K/DEF last 2 rounds
// 4. Return top available player matching needs
```

Trigger CPU picks automatically after each human pick if there are CPU seats. Use a server-side setTimeout or queue worker approach via Supabase Edge Functions or a simple API polling loop in the client.

---

## AI Routes

All AI routes live under `app/api/draft/ai/`. Each calls Claude `claude-sonnet-4-20250514` with draft context injected.

### app/api/draft/ai/best-pick/route.ts
```ts
// System: "You are Chimmy, AllFantasy's AI draft assistant..."
// User context: current roster, remaining board, scoring settings, num teams, round
// Returns: top 3 recommended picks with reasoning
```

### app/api/draft/ai/compare/route.ts
```ts
// Receives: playerA, playerB, leagueContext
// Returns: side-by-side comparison, recommendation, reasoning
```

### app/api/draft/ai/roster-fit/route.ts
```ts
// Receives: currentRoster, availablePlayers (top 20), leagueContext
// Returns: which available player fits the roster best and why
```

### app/api/draft/ai/scarcity/route.ts
```ts
// Receives: remainingBoard, currentRound, numTeams
// Returns: positions with high scarcity risk, recommended action
```

### app/api/draft/ai/pick-survival/route.ts
```ts
// Receives: targetPlayer, currentPick, numTeams, remainingPicks
// Returns: probability estimate player is available at user's next pick
```

### app/api/draft/ai/queue-suggestions/route.ts
```ts
// Receives: currentRoster, remainingBoard, leagueContext
// Returns: suggested queue of 10 players in priority order
```

### app/api/draft/ai/draft-recap/route.ts
```ts
// Receives: full draft picks for the session, all rosters
// Returns: sports-column style recap with best value, biggest reach, best team, sleeper pick
```

### app/api/draft/ai/grade/route.ts
```ts
// Receives: one team's full draft picks, leagueContext
// Returns: letter grade A-F per pick + overall team grade + narrative summary
```

---

## ChimmyDraftChat.tsx

Separate from public draft chat. Private to the user.

Quick action buttons above input:
- "Best Pick Available"
- "Compare Two Players" (opens player selector)
- "Who Fits My Roster"
- "Scarcity Alert"
- "Will They Be There?"
- "Grade My Draft So Far"

Each button constructs a prompt and calls the relevant `/api/draft/ai/` route.

Chat history persists in component state during session. Not saved to DB unless user explicitly exports.

Chimmy persona in system prompt:
```
You are Chimmy, AllFantasy's AI draft assistant. You sound like a friendly, smart GM — calm, strategic, concise, and data-driven. You are aware of the current draft context including the user's roster, the remaining board, league settings, and scoring format. Give specific actionable advice, not generic tips. Never be vague.
```

---

## Draft Worker / Monitor (Background AI)

Create `app/api/draft/worker/route.ts` as a POST endpoint called every time a pick is made.

The worker:
1. Checks if any user has autopick enabled and is on the clock
2. If yes: reads their queue → picks queue[0] → calls `/api/draft/pick/make`
3. If queue empty: calls `/api/draft/ai/best-pick` → picks top result
4. Posts a system message: "Autopick: {player} selected for {team}"
5. Advances draft state

Call this worker from the client after each pick is confirmed:
```ts
await fetch('/api/draft/worker', { method: 'POST', body: JSON.stringify({ sessionId }) })
```

---

## Post-Draft Experience (DraftResultsView.tsx)

Show after `draft_room_state.status === 'complete'`:

- Full pick grid (read-only version of DraftBoard)
- Each team's roster summary
- "Grade My Draft" button per team (calls `/api/draft/ai/grade`)
- "Generate Recap" button (calls `/api/draft/ai/draft-recap`)
- Chimmy recap displayed as a sports column with:
  - Best value pick of the draft
  - Biggest reach
  - Best overall team build
  - Sleeper pick of the draft
- Share recap button (generates shareable URL)

---

## DraftTab.tsx Integration

In `app/league/[leagueId]/tabs/DraftTab.tsx`:

```tsx
// Mock Drafts button
<button onClick={() => {
  // Create a new mock room, then navigate
  const res = await fetch('/api/draft/room/create', { method: 'POST', body: JSON.stringify({ leagueId, mode: 'mock' }) })
  const { roomId } = await res.json()
  router.push(`/draft/mock/${roomId}`)
}}>
  Mock Drafts
</button>

// Draft Room button
<button onClick={() => router.push(`/draft/live/${leagueId}`)}>
  Draft Room
</button>
```

Pre-draft state: show countdown timer + Draft Room button when draft not yet started.
Active state: show "Rejoin Draft Room" button with live pick indicator.
Complete state: show "View Draft Results" button → opens DraftResultsView.

---

## Notifications

Wire these draft events to the existing notification system:

- "Your pick is coming up in 2 picks" — alert when 2 picks away
- "You're on the clock!" — push notification + in-app banner
- "Autopick made for you: {player}" — if autopick triggered
- "Draft complete — view your team" — post-draft
- "[LeagueMate] just drafted {player} you had queued" — queue conflict alert

Use Supabase realtime to trigger these from `draft_room_state` changes.

---

## Design Direction

Dark navy base (`#0d1117`). Draft board uses a dense grid layout.

Layout proportions (desktop):
```
[Draft Header — full width top bar]
[Draft Board — full width, ~40vh, horizontal scroll]
[Player Pool 40%] [Queue 20%] [Roster 20%] [Chat tabs 20%]
```

Chat tabs at bottom right:
- Tab 1: "Draft Chat" (public)
- Tab 2: "Chimmy ✨" (private AI)

Mobile: stack vertically, Draft Board collapses to current pick + team view, Player Pool becomes primary scrollable area.

---

## File Summary — Create These Files

```
app/draft/mock/[roomId]/page.tsx
app/draft/live/[leagueId]/page.tsx
app/draft/components/DraftShell.tsx
app/draft/components/DraftBoard.tsx
app/draft/components/DraftHeader.tsx
app/draft/components/ManagerHeader.tsx
app/draft/components/PickCell.tsx
app/draft/components/TradedPickBadge.tsx
app/draft/components/PlayerPool.tsx
app/draft/components/QueuePanel.tsx
app/draft/components/RosterPanel.tsx
app/draft/components/DraftChatPanel.tsx
app/draft/components/ChimmyDraftChat.tsx
app/draft/components/DraftTimerBar.tsx
app/draft/components/DraftSettingsModal.tsx
app/draft/components/DraftResultsView.tsx
app/draft/components/PlayerCard.tsx
app/draft/components/AutopickToggle.tsx
app/api/draft/room/create/route.ts
app/api/draft/room/join/route.ts
app/api/draft/room/state/route.ts
app/api/draft/pick/make/route.ts
app/api/draft/pick/undo/route.ts
app/api/draft/queue/update/route.ts
app/api/draft/queue/get/route.ts
app/api/draft/timer/pause/route.ts
app/api/draft/timer/resume/route.ts
app/api/draft/chat/send/route.ts
app/api/draft/chat/history/route.ts
app/api/draft/autopick/toggle/route.ts
app/api/draft/mock/settings/route.ts
app/api/draft/mock/cpu-pick/route.ts
app/api/draft/worker/route.ts
app/api/draft/ai/best-pick/route.ts
app/api/draft/ai/compare/route.ts
app/api/draft/ai/roster-fit/route.ts
app/api/draft/ai/scarcity/route.ts
app/api/draft/ai/pick-survival/route.ts
app/api/draft/ai/queue-suggestions/route.ts
app/api/draft/ai/draft-recap/route.ts
app/api/draft/ai/grade/route.ts
```

---

## Implementation Notes

- Use `@dnd-kit/sortable` for queue drag-and-drop
- Use `qrcode.react` for mock draft invite QR code
- Use Supabase Realtime for all live state sync
- Use `framer-motion` for pick animations and panel transitions
- All AI routes use `claude-sonnet-4-20250514` with `max_tokens: 1000`
- `npx tsc --noEmit` must pass after all changes
- Do not break any existing league page functionality
