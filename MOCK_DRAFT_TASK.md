# MOCK_DRAFT_TASK.md
# Drop into repo root. In Cursor: @MOCK_DRAFT_TASK.md implement step by step

## What This Builds

A fully rebuilt mock draft simulator at `/mock-draft` that looks exactly like the
Sleeper live draft room from the screenshot, with AI-powered picks for all teams.

Two modes:
1. **League Mock** — user imports an actual league (Sleeper), gets real draft
   positions, real manager names/avatars, real roster settings
2. **Open Mock** — user configures a custom draft without a league

Adds a "Mock Draft" card to the Tools Hub.

---

## Step 1 — Read these files completely before writing anything

```
app/mock-draft-simulator/page.tsx       ← existing simulator page (find it)
app/api/mock-draft/route.ts             ← existing mock draft API
prisma/schema.prisma                    ← MockDraft model (leagueId, userId, rounds, results, shareId)
app/api/league/list/route.ts            ← user's leagues
app/api/league/roster/route.ts          ← rosters per league
lib/sleeper-client.ts                   ← getSleeperUser, getUserLeagues, getLeagueRosters
lib/ai-personality.ts                   ← AI voice for draft suggestions
lib/queues/bullmq.ts                    ← BullMQ setup
lib/workers/simulation-worker.ts        ← worker pattern
app/waiver-ai/page.tsx                  ← league gate pattern
app/trade-evaluator/page.tsx            ← visual style
```

Search for the mock draft page — it may be at:
  `app/mock-draft-simulator/page.tsx`
  `app/mock-draft/page.tsx`
  `app/(app)/mock-draft/page.tsx`

Run: `find app -name "*.tsx" | xargs grep -l "mock.draft" 2>/dev/null`
to locate it.

DO NOT change any existing API routes.

---

## Step 2 — Understand existing MockDraft Prisma model

From schema.prisma (already read):
```typescript
model MockDraft {
  id:         String   // uuid
  leagueId:   String?  // optional — null for open mocks
  userId:     String
  shareId:    String?  // for sharing
  rounds:     Int
  results:    Json     // all picks stored here
  promotedAt: DateTime?
  createdAt:  DateTime
}
```

The `results` Json stores the full draft board:
```typescript
{
  draftType:    'snake' | 'auction' | 'linear'
  teams:        TeamSlot[]
  picks:        Pick[]
  settings:     DraftSettings
  completedAt?: string
}
```

---

## Step 3 — Create app/mock-draft/page.tsx

### TWO-MODE ENTRY SCREEN:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  🏈 Mock Draft Simulator                                │
│  AI-powered drafting for every team in your league      │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐      │
│  │  🌙 League Mock     │  │  ⚙️ Open Mock       │      │
│  │                     │  │                     │      │
│  │  Import a real      │  │  Custom settings,   │      │
│  │  league — real      │  │  any format, any    │      │
│  │  managers, real     │  │  team count         │      │
│  │  draft positions    │  │                     │      │
│  │                     │  │                     │      │
│  │  [Select League]    │  │  [Configure Draft]  │      │
│  └─────────────────────┘  └─────────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### MODE 1 — LEAGUE MOCK:

After clicking "League Mock":
Show league selector (same component as waiver-ai league gate).
On league select → fetch:
  GET /api/league/roster?leagueId=X  (all managers + their rosters)
  GET Sleeper draft info if available

For each manager in the league:
  - Use their real display name (exact copy)
  - Use their real avatar from Sleeper
  - Use their assigned draft position if set, else AI predicts based on:
    record (best record → earlier pick in inverse-standings snake)

### MODE 2 — OPEN MOCK:

Config screen:
```
Teams:    [8] [10] [12] [14]
Rounds:   [10] [12] [15] [18] [20]
Format:   [Snake] [Auction] [Linear]
Sport:    [NFL] [NBA] [MLB]
Scoring:  [PPR] [Half PPR] [Standard]
QB:       [1QB] [Superflex]
Position: My pick slot [1-N selector]
Speed:    [Slow 30s] [Normal 15s] [Fast 5s] [Auto]
```

AI fills all other teams. User picks for their slot.

---

## Step 4 — THE DRAFT ROOM (Sleeper-style UI)

This is the core of the feature. Match the screenshot exactly.

### LAYOUT (match screenshot):

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER: League name · Format · Teams · Rounds · Draft type       │
│ [Pause] [Resume] [Reset] [Export]            [Ask AI] [Settings] │
├──────────┬───────────────────────────────────────────────────────┤
│ LEFT     │ CENTER: DRAFT BOARD                                   │
│ PANEL    │                                                        │
│ (260px)  │ Team cols: [avatar+name] for each manager             │
│          │                                                        │
│ Player   │ R1  [1.01][1.02][1.03][1.04][1.05][1.06]...         │
│ Queue    │ R2  [2.01][2.02][2.03]...                            │
│          │ R3  [3.01]...                                         │
│ Search   │                                                        │
│          │ Each cell: player name + pos badge + team              │
│ Filters  │ Highlighted cell = current pick on the clock           │
│          │                                 ───────────────────── │
│ Rankings │ RIGHT PANEL:                                           │
│ list     │ Current roster being built                            │
│          │ QB/RB/WR/TE slots                                     │
│          │ CHAT box at bottom                                    │
└──────────┴───────────────────────────────────────────────────────┘
```

### TYPESCRIPT TYPES:

```typescript
type DraftType    = 'snake' | 'auction' | 'linear'
type DraftFormat  = 'PPR' | 'Half PPR' | 'Standard'
type DraftSport   = 'NFL' | 'NBA' | 'MLB'
type DraftSpeed   = 30 | 15 | 5 | 0   // 0 = auto (AI picks instantly)

interface DraftSettings {
  teamCount:      number
  rounds:         number
  draftType:      DraftType
  sport:          DraftSport
  scoring:        DraftFormat
  superflex:      boolean
  myPickSlot:     number     // 1-based
  speed:          DraftSpeed
}

interface TeamSlot {
  slot:         number        // 1-based pick position
  managerId:    string
  managerName:  string        // EXACT copy from Sleeper
  avatarUrl:    string | null
  isUser:       boolean       // true = the actual user
  isAI:         boolean       // true = AI controls this team
  picks:        DraftPick[]   // picks made so far
  rosterNeeds:  string[]      // ['WR','TE'] — what they still need
}

interface DraftPick {
  overall:    number      // overall pick number (1-based)
  round:      number
  pick:       number      // pick within round
  slot:       number      // which team's slot
  playerId:   string
  playerName: string
  position:   string
  nflTeam:    string
  adp:        number
  aiReason?:  string      // why AI picked this player
}

interface AvailablePlayer {
  id:         string
  name:       string
  position:   string
  nflTeam:    string
  adp:        number
  projectedPts: number
  ownership:  number
  injuryStatus?: string | null
  tier:       number
  posRank:    string     // "WR4", "RB12" etc
}

interface DraftState {
  settings:       DraftSettings
  teams:          TeamSlot[]
  availablePlayers: AvailablePlayer[]
  picks:          DraftPick[]
  currentPick:    number   // overall pick number (1-based)
  onTheClock:     number   // slot number currently picking
  status:         'setup' | 'drafting' | 'paused' | 'complete'
  timerSeconds:   number
  chatMessages:   ChatMessage[]
}

interface ChatMessage {
  role:    'user' | 'ai'
  content: string
  pick?:   number
}
```

### LEFT PANEL — PLAYER QUEUE:

```tsx
// Header bar with position filters
<div className="flex items-center gap-1 flex-wrap">
  {['All','QB','RB','WR','TE','K','DEF'].map(pos => (
    <button key={pos}
      onClick={() => setFilter(pos)}
      className={`text-[10px] font-black px-2 py-1 rounded-lg ${
        filter === pos ? 'bg-teal-500 text-black' : 'bg-white/8 text-white/50'
      }`}>
      {pos}
    </button>
  ))}
</div>

// Search
<input placeholder="Search players..." 
  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm..."/>

// Toggle: Show Drafted / Rookies Only
<div className="flex items-center gap-3">
  <label>Show Drafted</label>
  <label>Rookies Only</label>
</div>

// Player list
{filteredPlayers.map((player, i) => (
  <div key={player.id}
    onContextMenu={e => { e.preventDefault(); addToQueue(player) }}
    onClick={() => onUserPick(player)}    // only active when it's user's turn
    className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer
      ${isUserTurn ? 'hover:bg-white/8' : 'opacity-60 cursor-default'}
      ${player.injuryStatus === 'OUT' ? 'opacity-40' : ''}
    `}>
    <div className="text-xs text-white/30 w-4">{i+1}</div>
    <div className={`text-[10px] font-black w-6 text-center rounded px-0.5 ${posColor(player.position)}`}>
      {player.position}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-semibold text-white/85 truncate">{player.name}</div>
      <div className="text-[10px] text-white/35">{player.nflTeam} · {player.posRank}</div>
    </div>
    {player.injuryStatus && (
      <span className="text-[9px] font-black text-red-400">{player.injuryStatus}</span>
    )}
    <div className="text-[10px] text-white/40 font-mono">{player.adp.toFixed(1)}</div>
  </div>
))}
```

### CENTER — DRAFT BOARD:

```tsx
// Team headers row
<div className="grid" style={{ gridTemplateColumns: `repeat(${settings.teamCount}, minmax(100px, 1fr))` }}>
  {teams.map(team => (
    <div key={team.slot} className="text-center p-2 border-r border-white/6">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full mx-auto mb-1 overflow-hidden border-2 ${
        team.isUser ? 'border-teal-500' : 'border-white/20'
      }`}>
        {team.avatarUrl
          ? <img src={team.avatarUrl} alt={team.managerName}/>
          : <div className="w-full h-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center text-xs font-black text-white">
              {team.managerName[0]?.toUpperCase()}
            </div>
        }
      </div>
      <div className="text-[10px] font-bold text-white/70 truncate">{team.managerName}</div>
      {team.isUser && <div className="text-[9px] text-teal-400">YOU</div>}
    </div>
  ))}
</div>

// Draft board grid — each round row
{Array.from({ length: settings.rounds }, (_, rIdx) => {
  const round = rIdx + 1
  const isSnakeReversed = settings.draftType === 'snake' && round % 2 === 0
  const slotsInOrder = isSnakeReversed
    ? [...teams].reverse()
    : teams

  return (
    <div key={round} className="grid border-b border-white/4"
      style={{ gridTemplateColumns: `repeat(${settings.teamCount}, minmax(100px, 1fr))` }}>
      {slotsInOrder.map((team, pIdx) => {
        const overallPick = (round - 1) * settings.teamCount + pIdx + 1
        const pick = picks.find(p => p.overall === overallPick)
        const isOnClock = currentPick === overallPick && status === 'drafting'
        const isUserPick = team.isUser

        return (
          <div key={team.slot}
            className={`min-h-[52px] p-1.5 border-r border-white/4 transition-all ${
              isOnClock ? 'bg-teal-500/15 border-teal-500/30 ring-1 ring-teal-500/40' :
              isUserPick ? 'bg-white/2' : ''
            }`}>
            {/* Pick number label */}
            <div className="text-[9px] text-white/20 mb-1">
              {round}.{String(pIdx + 1).padStart(2,'0')}
            </div>
            {pick ? (
              /* Filled pick */
              <div>
                <div className={`text-[9px] font-black mb-0.5 ${posColor(pick.position)}`}>
                  {pick.position}
                </div>
                <div className="text-[10px] font-semibold text-white/85 leading-tight truncate">
                  {pick.playerName}
                </div>
                <div className="text-[9px] text-white/30 truncate">{pick.nflTeam}</div>
                {pick.aiReason && !isUserPick && (
                  <div className="text-[8px] text-cyan-400/60 italic mt-0.5 leading-tight line-clamp-1">
                    {pick.aiReason}
                  </div>
                )}
              </div>
            ) : isOnClock ? (
              /* On the clock */
              <div className="flex items-center justify-center h-8">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"/>
              </div>
            ) : (
              /* Empty future pick */
              <div/>
            )}
          </div>
        )
      })}
    </div>
  )
})}
```

### RIGHT PANEL — CURRENT ROSTER:

```tsx
// Show the "on the clock" team's roster being built
{(() => {
  const clockTeam = teams.find(t => t.slot === onTheClock)
  if (!clockTeam) return null
  const rosterSlots = getRosterSlots(settings)  // QB, RB, RB, WR, WR, TE, FLEX, etc

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
        {clockTeam.isUser ? 'Your Roster' : `${clockTeam.managerName}'s Roster`}
      </div>
      {rosterSlots.map((slot, i) => {
        const filledPick = clockTeam.picks[i]
        return (
          <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-white/3">
            <span className={`text-[9px] font-black w-8 text-center ${posColor(slot)}`}>{slot}</span>
            {filledPick ? (
              <>
                <span className="text-[10px] text-white/75 truncate flex-1">{filledPick.playerName}</span>
                <span className="text-[9px] text-white/30">{filledPick.nflTeam}</span>
              </>
            ) : (
              <span className="text-[10px] text-white/20 italic">Empty</span>
            )}
          </div>
        )
      })}
    </div>
  )
})()}

{/* AI Chat box at bottom */}
<div className="mt-auto border-t border-white/8 pt-3">
  <div className="space-y-1 max-h-32 overflow-y-auto mb-2">
    {chatMessages.map((msg, i) => (
      <div key={i} className={`text-[10px] rounded-lg px-2 py-1.5 ${
        msg.role === 'ai'
          ? 'bg-cyan-500/10 text-cyan-300'
          : 'bg-white/5 text-white/60'
      }`}>
        {msg.content}
      </div>
    ))}
  </div>
  <div className="flex gap-2">
    <input
      value={chatInput}
      onChange={e => setChatInput(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && sendChat()}
      placeholder="Type a message..."
      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"
    />
    <button onClick={() => sendChat()}
      className="px-3 py-2 rounded-xl bg-white/10 text-xs text-white/60 hover:text-white">
      Send
    </button>
    <button onClick={() => askAI()}
      className="px-3 py-2 rounded-xl text-xs font-bold"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white' }}>
      Ask AI
    </button>
  </div>
</div>
```

---

## Step 5 — AI DRAFT LOGIC

### AI Pick Engine:

When it's an AI team's turn, run this logic:

```typescript
const makeAIPick = useCallback(async (team: TeamSlot): Promise<AvailablePlayer> => {
  // 1. Filter available players
  const available = availablePlayers.filter(p => !picks.some(pk => pk.playerId === p.id))

  // 2. Compute team needs
  const needs = computeTeamNeeds(team, settings)

  // 3. Score each player
  const scored = available.map(player => ({
    player,
    score: scorePlayerForTeam(player, team, needs, settings, picks),
  })).sort((a, b) => b.score - a.score)

  // 4. Add variance (AI isn't perfect — top 3 picks by score, choose weighted random)
  const top3   = scored.slice(0, 3)
  const weights = [0.65, 0.25, 0.10]
  const rand    = Math.random()
  let pick      = top3[0].player
  if (rand > 0.65 && top3[1]) pick = top3[1].player
  else if (rand > 0.90 && top3[2]) pick = top3[2].player

  // 5. Generate AI reason (call /api/chat/chimmy for a short pick explanation)
  // Only generate reason for late-game picks or when user is watching this team
  const aiReason = generatePickReason(pick, team, needs, round)

  return { ...pick, aiReason }
}, [availablePlayers, picks, settings])
```

### Scoring function:

```typescript
function scorePlayerForTeam(
  player:    AvailablePlayer,
  team:      TeamSlot,
  needs:     string[],
  settings:  DraftSettings,
  allPicks:  DraftPick[]
): number {
  let score = 100 - player.adp   // base: inverse ADP

  // Need bonus: if team needs this position
  if (needs.includes(player.position)) score += 20
  if (needs.includes(player.position) && needs[0] === player.position) score += 10

  // Superflex QB bonus
  if (settings.superflex && player.position === 'QB' && !team.picks.some(p => p.position === 'QB')) {
    score += 15
  }

  // Positional scarcity: if top players at this position are getting taken fast
  const posRemaining = allPicks.filter(p => p.position === player.position).length
  if (posRemaining < 3 && needs.includes(player.position)) score += 8

  // Late-round handcuff/upside picks
  const roundNum = Math.ceil(allPicks.length / settings.teamCount) + 1
  if (roundNum > settings.rounds * 0.7) {
    // Prefer upside in late rounds
    if (player.ownership < 50 && player.adp > (roundNum * settings.teamCount * 0.8)) {
      score += 5
    }
  }

  return score
}
```

### Draft Clock:

```typescript
// Timer that runs the draft
useEffect(() => {
  if (status !== 'drafting') return
  const onTheClock = teams.find(t => t.slot === currentTeamSlot)
  if (!onTheClock) return

  if (onTheClock.isUser) {
    // Start user timer
    const interval = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          // Auto-pick best available for user
          const best = availablePlayers[0]
          if (best) handlePick(best, false)
          return settings.speed
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  } else {
    // AI team — make pick after short delay based on speed
    const delay = settings.speed === 0 ? 300 : settings.speed * 200
    const timeout = setTimeout(async () => {
      const pick = await makeAIPick(onTheClock)
      handlePick(pick, true)
    }, delay)
    return () => clearTimeout(timeout)
  }
}, [status, currentTeamSlot, teams])
```

---

## Step 6 — LEAGUE MOCK: Draft Position Logic

When a league is selected and draft positions ARE set in Sleeper:
- Use exact positions from `leagueData.draft_order` mapping
- Map Sleeper `roster_id` → `draft_slot` → show in correct column order

When draft positions are NOT set:
- AI predicts based on record: worst record → pick 1, best record → last pick
- If no record (offseason): randomize with slight bias toward historical performance
- Show "(predicted)" label under each manager name in the header

```typescript
function predictDraftOrder(teams: TeamSlot[], leagueData: SleeperLeague): TeamSlot[] {
  // Sort by record (worst first = best picks in redraft)
  // For dynasty: rookie draft is typically reverse standings
  const sorted = [...teams].sort((a, b) => {
    const winsA = a.record?.wins ?? 0
    const winsB = b.record?.wins ?? 0
    return winsA - winsB   // ascending = worst record first = pick 1
  })
  return sorted.map((team, i) => ({ ...team, slot: i + 1, slotPredicted: true }))
}
```

---

## Step 7 — SAVE AND SHARE

After draft completes:

```typescript
// POST to /api/mock-draft to save
const saveDraft = async (results: DraftState) => {
  const res = await fetch('/api/mock-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leagueId:  selectedLeague?.id ?? null,
      rounds:    settings.rounds,
      results: {
        draftType: settings.draftType,
        teams:     results.teams,
        picks:     results.picks,
        settings,
        completedAt: new Date().toISOString(),
      },
    }),
  })
  const data = await res.json()
  setShareId(data.shareId)
}
```

After saving, show:
```
🏆 Mock Draft Complete!
Your team: [summary of picks]
[📤 Share Draft] → copies /mock-draft/share/{shareId}
[🔄 Draft Again] → reset with same settings
[📊 Grade My Team] → calls AI to grade the user's selections
```

**Team Grade (after draft):**
Call `/api/trade-evaluator` or Chimmy chat with:
- User's pick list
- League settings
- Ask: "Grade my mock draft team A-F and explain strengths/weaknesses"

---

## Step 8 — PLAYER DATA SOURCE

Read `lib/sleeper-client.ts` to see if there's a player list function.
Also check `app/api/players/search/route.ts` and `app/api/player-value/route.ts`.

For the available players list, use in priority order:
1. `GET /api/players/search?sport=NFL&limit=300` — if this returns players with ADP
2. Sleeper public API: `GET https://api.sleeper.app/v1/players/nfl` (cached)
3. FantasyCalc values via `fetchFantasyCalcValues` (already in lib/fantasycalc.ts)

Map each player to `AvailablePlayer` interface.
Sort by ADP ascending (1 = first overall).

---

## Step 9 — VISUAL DESIGN

Match the screenshot exactly:

```
bg:             #0a0a18 (slightly darker than normal pages — immersive)
draft board bg: #0c0c1e
pick cells:     min-height 52px, border-r border-b border-white/6
on-the-clock:   bg-teal-500/15, ring-1 ring-teal-500/40, pulse animation
user picks:     subtle bg-violet-500/5 tint on their column
past picks:     full content
future picks:   empty/transparent

Team header:
  Avatar: 32px circle, teal border if user
  Name:   10px truncated
  YOU:    teal label badge

Position colors (match Sleeper exactly):
  QB:   text-red-400    bg-red-500/20
  RB:   text-green-400  bg-green-500/20
  WR:   text-blue-400   bg-blue-500/20
  TE:   text-orange-400 bg-orange-500/20
  K:    text-gray-400   bg-gray-500/20
  DEF:  text-purple-400 bg-purple-500/20
  FLEX: text-cyan-400   bg-cyan-500/20

Left panel:
  Width: 260px fixed
  bg: #0c0c1e, border-r border-white/8

Right panel:
  Width: 200px fixed
  bg: #0c0c1e, border-l border-white/8

Draft board: flex-1 overflow-x-auto overflow-y-auto

Pick cell hover (unfilled future picks):
  bg-white/4 on hover if user is currently picking

AI reason text:
  8px italic cyan — shown on AI picks
  Only visible if pick cell is wide enough

Queue badge:
  Right-click player → adds orange "QUEUED" badge
  Queue section shows ordered list, user can reorder

Timer bar (when user is on the clock):
  Full-width teal bar at top of left panel
  Depletes from 100% to 0% over timer duration
  Red at < 5s remaining
```

---

## Step 10 — Tools Hub Card

Read `app/tools-hub/ToolsHubClient.tsx` for exact card pattern.
Add using the same structure as existing cards:

```typescript
{
  name:        "Mock Draft Simulator",
  description: "Full AI-powered draft room that looks like Sleeper. Import your league for real managers and positions, or run a custom mock. AI drafts every other team using roster needs, ADP, and scoring context.",
  href:        "/mock-draft",
  category:    ["Draft"],
  badge:       "AI-Powered",
  featured:    true,
  icon:        "🏈",
  related:     ["AI Draft Assistant", "Waiver Wire Advisor"],
}
```

---

## All Buttons Must Work

- ✓ Mode select (League Mock / Open Mock) → enters setup
- ✓ League selector → loads real managers + positions
- ✓ Config dropdowns (teams, rounds, format, scoring, position) → update settings
- ✓ [Start Draft] → initializes DraftState, starts clock
- ✓ Player row click → picks player (only when user's turn)
- ✓ Right-click player → adds to queue
- ✓ Position filter tabs → filter player list
- ✓ Search input → filter by name
- ✓ Show Drafted toggle → show/hide drafted players
- ✓ Rookies Only toggle → filter to rookies
- ✓ [Pause] → pauses timer and AI picks
- ✓ [Resume] → resumes
- ✓ [Reset] → confirms then resets to setup screen
- ✓ [Ask AI] → opens chat and asks for recommendation
- ✓ Chat send → posts message
- ✓ [Share Draft] → saves + copies share URL
- ✓ [Draft Again] → reset with same settings
- ✓ [Grade My Team] → AI grades the user's picks

---

## Final Checks

```bash
npx tsc --noEmit
```

Commit:
```bash
git add app/mock-draft/page.tsx
git add app/tools-hub/ToolsHubClient.tsx
git commit -m "feat: add AI mock draft simulator with Sleeper-style board, league import, and tools hub card"
```

---

## Constraints

- No new npm dependencies
- No any / no @ts-ignore
- Draft board is read from Prisma MockDraft model on load (if shareId in URL)
- Player data loaded once on draft start — not refetched mid-draft
- AI picks are synchronous (scored locally) — no API call per pick
  Exception: "Ask AI" chat calls /api/chat/chimmy
- Timer interval cleanup via useEffect return function
- All Sleeper API calls are server-side via existing lib/sleeper-client.ts
- Snake draft reversal logic: even rounds go right-to-left visually
- League mock predicted positions: show "(predicted)" badge on team headers
- Mobile: left panel collapses to bottom sheet, board scrolls horizontally
