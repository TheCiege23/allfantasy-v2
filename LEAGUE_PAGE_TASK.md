# LEAGUE_PAGE_TASK.md
# /league/[id] — new league homepage replacing /app/league/[id]
# Drop in repo root. In Cursor: @LEAGUE_PAGE_TASK.md implement one phase at a time.

---

## WHAT THIS BUILDS

A full-featured league homepage at /league/[id].
This is a NEW route — app/league/[id] does not exist yet.

After this is built:
  /league/57a85bac-bc26-43a1-a3e6-e3279fc9ec4d → league homepage
  /app/league/[id]                              → redirects to /league/[id]

---

## Read these files before writing anything

  app/dashboard/DashboardShell.tsx              (shell reference)
  app/dashboard/types.ts                        (UserLeague, UserLeagueTeam etc.)
  app/dashboard/components/LeftChatPanel.tsx    (built in DASHBOARD_REBUILD_TASK)
  app/dashboard/components/RightControlPanel.tsx (built in DASHBOARD_REBUILD_TASK)
  app/dashboard/components/LeagueListPanel.tsx  (reuse directly)
  app/components/ChimmyChat.tsx
  app/api/league/list/route.ts                  (109 lines)
  app/api/league/roster/route.ts                (if exists)
  app/api/bracket/leagues/[leagueId]/chat/route.ts
  lib/sleeper-client.ts
  prisma/schema.prisma                          (League, LeagueTeam fields)
  lib/auth.ts
  components/ManagerRoleBadge.tsx

---

## LAYOUT (same shell, different center)

  ┌──────────────────────────────────────────────────────────────┐
  │  LEFT (280px)      │  CENTER (flex-1)      │  RIGHT (300px) │
  │  League Chat       │  League tab content   │  AF Chat DMs   │
  │  (primary)         │  [Draft][Team][League]│  (top ~55%)    │
  │                    │  [Players][Trend]     │  League List   │
  │                    │  [Trades][Scores]     │  (bottom ~45%) │
  └──────────────────────────────────────────────────────────────┘

LEFT:   League Chat (persistent across all tab changes)
CENTER: Active tab content (changes on tab click)
RIGHT:  AF Chat DMs (top) + League List (bottom) — same as dashboard

---

## Step 1 — Create the route structure

```
app/league/
  [id]/
    page.tsx        (server component — loads auth + initial data)
    LeagueShell.tsx (client component — owns tab state)
    tabs/
      DraftTab.tsx
      TeamTab.tsx
      LeagueTab.tsx
      PlayersTab.tsx
      TrendTab.tsx
      TradesTab.tsx
      ScoresTab.tsx
    components/
      PlayerRow.tsx
      PlayerStatCard.tsx   (modal)
      RosterSlot.tsx
      TradeCard.tsx
      TrendRow.tsx
```

---

## Step 2 — Create app/league/[id]/page.tsx (server component)

```typescript
import { getServerSession }  from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { redirect }          from 'next/navigation'
import { prisma }            from '@/lib/prisma'
import { LeagueShell }       from './LeagueShell'

interface PageProps {
  params: { id: string }
}

export default async function LeaguePage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login?callbackUrl=/league/' + params.id)

  // Load league data server-side
  const league = await prisma.league.findFirst({
    where: { id: params.id },
    include: {
      teams: { orderBy: { externalId: 'asc' } },
      invites: {
        where: { isActive: true },
        take: 1,
      }
    }
  })

  if (!league) redirect('/dashboard')

  // Verify user has access
  const userTeam = league.teams.find(t => t.claimedByUserId === session.user.id)
  const isOwner  = league.userId === session.user.id
  if (!userTeam && !isOwner) redirect('/dashboard')

  // Fetch all leagues for the right panel league list
  const allLeagues = await prisma.league.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <LeagueShell
      league={league}
      userTeam={userTeam ?? null}
      isOwner={isOwner}
      allLeagues={allLeagues}
      userId={session.user.id}
      userName={session.user.name ?? session.user.email ?? 'Manager'}
    />
  )
}
```

---

## Step 3 — Create app/league/[id]/LeagueShell.tsx (client component)

```typescript
'use client'

import { useState }           from 'react'
import { useRouter }          from 'next/navigation'
import { LeftChatPanel }      from '@/app/dashboard/components/LeftChatPanel'
import { RightControlPanel }  from '@/app/dashboard/components/RightControlPanel'
import { DraftTab }           from './tabs/DraftTab'
import { TeamTab }            from './tabs/TeamTab'
import { LeagueTab }          from './tabs/LeagueTab'
import { PlayersTab }         from './tabs/PlayersTab'
import { TrendTab }           from './tabs/TrendTab'
import { TradesTab }          from './tabs/TradesTab'
import { ScoresTab }          from './tabs/ScoresTab'
import { PlayerStatCard }     from './components/PlayerStatCard'
import type { UserLeague }    from '@/app/dashboard/types'

type LeagueTab = 'draft' | 'team' | 'league' | 'players' | 'trend' | 'trades' | 'scores'

const TABS: { id: LeagueTab; label: string; icon: string }[] = [
  { id: 'draft',   label: 'Draft',   icon: '🏈' },
  { id: 'team',    label: 'Team',    icon: '👥' },
  { id: 'league',  label: 'League',  icon: '🏆' },
  { id: 'players', label: 'Players', icon: '🔍' },
  { id: 'trend',   label: 'Trend',   icon: '📈' },
  { id: 'trades',  label: 'Trades',  icon: '🔄' },
  { id: 'scores',  label: 'Scores',  icon: '📊' },
]

export function LeagueShell({ league, userTeam, isOwner, allLeagues, userId, userName }: LeagueShellProps) {
  const router             = useRouter()
  const [activeTab, setActiveTab] = useState<LeagueTab>('draft')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)   // playerId for stat card

  // Convert DB league to UserLeague for components
  const selectedLeague: UserLeague = {
    id:        league.id,
    name:      league.name,
    platform:  league.platform ?? 'sleeper',
    sport:     league.sport ?? 'NFL',
    format:    league.scoring ?? 'redraft',
    scoring:   league.scoring ?? 'PPR',
    teamCount: league.leagueSize ?? 10,
    season:    league.season ?? new Date().getFullYear(),
    status:    'pre_draft',
    isDynasty: league.isDynasty,
  }

  // Convert all leagues for right panel
  const leagueList: UserLeague[] = allLeagues.map(l => ({
    id: l.id, name: l.name, platform: l.platform ?? 'sleeper',
    sport: l.sport ?? 'NFL', format: l.scoring ?? 'redraft',
    scoring: l.scoring ?? 'PPR', teamCount: l.leagueSize ?? 10,
    season: l.season ?? new Date().getFullYear(),
    isDynasty: l.isDynasty,
  }))

  const handleLeagueSelect = (l: UserLeague | null) => {
    if (l && l.id !== league.id) router.push(`/league/${l.id}`)
    else if (!l) router.push('/dashboard')
  }

  const handlePlayerClick = (playerId: string) => setSelectedPlayer(playerId)
  const closePlayerCard   = () => setSelectedPlayer(null)

  return (
    <div className="flex h-screen overflow-hidden bg-[#07071a] text-white">

      {/* LEFT: League Chat (persistent) */}
      <LeftChatPanel
        selectedLeague={selectedLeague}
        userId={userId}
        width={280}
      />

      {/* CENTER: League tab content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* League header */}
        <LeagueHeader
          league={selectedLeague}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOwner={isOwner}
        />

        {/* Tab content area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'draft'   && <DraftTab   league={selectedLeague} teams={league.teams} isOwner={isOwner} inviteToken={league.invites[0]?.token}/>}
          {activeTab === 'team'    && <TeamTab    league={selectedLeague} userTeam={userTeam} onPlayerClick={handlePlayerClick}/>}
          {activeTab === 'league'  && <LeagueTab  league={selectedLeague} teams={league.teams}/>}
          {activeTab === 'players' && <PlayersTab league={selectedLeague} onPlayerClick={handlePlayerClick}/>}
          {activeTab === 'trend'   && <TrendTab   league={selectedLeague} onPlayerClick={handlePlayerClick}/>}
          {activeTab === 'trades'  && <TradesTab  league={selectedLeague} teams={league.teams}/>}
          {activeTab === 'scores'  && <ScoresTab  league={selectedLeague}/>}
        </div>
      </main>

      {/* RIGHT: Control panel (same as dashboard) */}
      <RightControlPanel
        leagues={leagueList}
        leaguesLoading={false}
        selectedId={league.id}
        onSelectLeague={handleLeagueSelect}
        userId={userId}
      />

      {/* Player stat card modal (global, opens from any tab) */}
      {selectedPlayer && (
        <PlayerStatCard
          playerId={selectedPlayer}
          leagueId={league.id}
          sport={selectedLeague.sport}
          onClose={closePlayerCard}
        />
      )}

    </div>
  )
}

function LeagueHeader({ league, activeTab, onTabChange, isOwner }: {
  league:       UserLeague
  activeTab:    LeagueTab
  onTabChange:  (t: LeagueTab) => void
  isOwner:      boolean
}) {
  return (
    <div className="flex-shrink-0 bg-[#0c0c1e] border-b border-white/[0.07]">
      {/* League name row */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-0">
        <div className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center text-base"
             style={{ background: 'linear-gradient(135deg, #1e3a5f, #0e4a6e)' }}>
          {league.sport === 'NFL' ? '🏈' : league.sport === 'NBA' ? '🏀' : '⚾'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-bold text-white truncate">{league.name}</h1>
            <span className="text-[11px] text-white/40 flex-shrink-0">
              {league.season} {league.teamCount}-Team {league.isDynasty ? 'Dynasty' : 'Redraft'} {league.scoring}
            </span>
          </div>
        </div>
        {isOwner && (
          <button className="text-white/30 hover:text-white/60 transition-colors text-lg">⚙️</button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto scrollbar-none px-5 mt-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold
                        whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id
                ? 'text-white border-cyan-500'
                : 'text-white/40 border-transparent hover:text-white/70'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 4 — Draft Tab (app/league/[id]/tabs/DraftTab.tsx)

Reference: Sleeper predraft page — draftboard card, timer, team list, invite banner

```typescript
// Props: league, teams, isOwner, inviteToken
```

LAYOUT (all wrapped in a scrollable div with p-5 space-y-4):

INVITE BANNER (commissioner only, show if league not full):
  Card with: "Invite friends to play" + count badge (X/Y teams filled)
  URL row: allfantasy.ai/join/{inviteToken}
  Copy button: cyan, "COPY" — copies to clipboard
  Background: bg-[#0c0c1e] border border-white/8 rounded-2xl p-4

DRAFTBOARD CARD (blue gradient):
  Background: linear-gradient(135deg, #1a237e 0%, #283593 100%)
  Rounded-2xl overflow-hidden p-5

  Header row:
    Left: "Draftboard" (font-bold 14px) + draft date or "Draft time has not yet been set" (muted 10px)
    Right: globe icon + settings icon (small buttons, bg-white/15 rounded-lg)

  Timer row (if no date set: show dashes):
    Dark pill: bg-black/35 rounded-xl px-4 py-3 flex gap-6 justify-center
    Four segments: DAYS : HRS : MINS : SECS
    Each: number (18px mono font-bold) + label (8px uppercase muted)

  CTA row:
    Left: [Mock Drafts] button (bg-white/15 border border-white/25 rounded-xl px-4 py-2)
          Subtext: "Practice drafting" (9px muted under label)
    Right: [Draftroom] button (bg-cyan-500 text-black font-bold rounded-xl px-5 py-2)
           Commissioner only: [Set Time] instead of or in addition to Draftroom

TEAM SECTION:
  Header: "Team" (section label) + "League is full" or count text
  Divisions if applicable (text label like "AFC", "NFC")

  Each team row:
    Rank number (white/25, 13px, w-5)
    Avatar (32px circle — Sleeper CDN or initials fallback)
    Team name (font-semibold 12px) + role badge (C/CC/O from ManagerRoleBadge)
    Manager username (@name, white/35)
    Draft position ("Draft position #5" or "No draft position" — muted 10px)
    If orphan: "Unclaimed" in cyan + small invite icon (commissioner only)

---

## Step 5 — Team Tab (app/league/[id]/tabs/TeamTab.tsx)

Reference: Sleeper team page — roster rows with position badges, OWN%/START%, IR/taxi warnings

PROPS: league, userTeam (LeagueTeam | null), onPlayerClick: (playerId: string) => void

LAYOUT:

WARNING BANNERS (show before roster):
  If IR players ineligible: amber banner "You have X players no longer eligible for IR..."
  If taxi exceeded: amber banner "You have players in taxi who exceeded allowed duration..."
  Style: bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300

TEAM HEADER:
  Team name + settings icon (small gear)
  Waiver budget + trade button row (icons on right)
  Week selector: "← Wk 1 →" centered

ROSTER SECTION HEADER:
  "STARTERS" label (uppercase 10px white/35)
  "Click on position buttons to update your lineup" (muted hint)
  Columns: OWN%   START% (right-aligned header, white/35)

PLAYER ROWS (starters then bench):
  Position badge (colored pill: QB=red, RB=green, WR=blue, TE=orange, K=gray, DEF=purple)
  Player headshot (32px circle, from NFL CDN or placeholder silhouette)
  Player name (font-semibold 12px)
  Position + team abbreviation (white/40 10px)
  Injury status if applicable (red/yellow dot or badge)
  OWN% and START% (right-aligned, 12px)
  Click anywhere on row → onPlayerClick(player.sleeperId)

SECTION DIVIDERS:
  After starters: "BENCH" section header (same style)
  After bench: "IR" section (if slots exist)
  After IR: "TAXI" section (dynasty only)

EMPTY STATE (user has no team in this league):
  Centered card: "You haven't claimed a team in this league"
  Button: "Claim a team" → /join/{inviteToken}

LOADING:
  Show 8 skeleton rows while roster loads

DATA:
  Fetch from GET /api/league/roster?leagueId={id}&userId={userId}
  Or read from the teams prop + fetch player details from Sleeper API
  Map sleeper_id to player images: https://sleepercdn.com/content/nfl/players/thumb/{sleeper_id}.jpg

---

## Step 6 — League Tab (app/league/[id]/tabs/LeagueTab.tsx)

Reference: Sleeper league page — members list, standings, settings

SECTIONS:

MEMBERS / STANDINGS:
  Table or card grid of all teams
  Columns: rank, avatar, team name, manager, W-L record, points for/against
  For pre-draft leagues: just show team list (no record yet)
  Commissioner badge (C) via ManagerRoleBadge

LEAGUE SETTINGS CARD:
  "League Settings" header + gear icon
  Row-by-row display:
    Number of Teams: {n}
    Roster Format: {scoring}
    Playoffs: {playoffTeams} teams, starts week {week}
    Waiver Type: FAAB (Bidding) / Standard / Free Agent
    Clear Waivers: {day} ({time} EDT)
    Trade Deadline: Week {n}
    IR Slots: {n}
    Draft Pick Trading: Yes / No
  Map from league.settings JSON field

  Non-standard settings highlighted:
    If any scoring value differs from standard PPR → amber bg highlight on that row

SCORING SETTINGS CARD:
  "Scoring" header + note "Non-standard settings highlighted in amber"
  Sections: Passing, Rushing, Receiving, Kicking
  Each row: stat name (white/50) + value on right (white/80)
  Values formatted: "+0.1 per yard (10 yards = 1 point)" for yardage settings
  Non-standard rows: bg-amber-500/10 border-l-2 border-amber-500

---

## Step 7 — Players Tab (app/league/[id]/tabs/PlayersTab.tsx)

Reference: Sleeper players page — filter bar, stat columns, scrollable table

FILTER BAR (sticky top of tab content):
  Position pills: ALL | QB | RB | WR | TE | K | DEF | MORE
  Active pill: bg-cyan-500/20 border-cyan-500 text-cyan-400
  Inactive: bg-white/5 border-white/10 text-white/50

  Toggle row:
    Projection / Stats toggle (button pair)
    Year selector: 2026 ▼
    Week selector: Week 1 ▼
    [Free agents] checkbox toggle (teal when on)
    [Watchlist] checkbox
    [Rookies] checkbox
    Filter icon (sliders)

SEARCH:
  "Find player Ctrl +" input (right side of filter bar)
  Real-time filter

COLUMN HEADERS:
  Fixed header row:
    Player name (left, ~200px)
    FANTASY PTS
    RUSHING: ATT | YD | TD
    RECEIVING: REC | TAR | YD | TD
    PASSING: CMP | ATT | YD | TD
  All stat columns: text-right, muted label, 40-55px wide

PLAYER ROWS:
  + add button (left, circular, 28px, border-white/20 hover:border-cyan-500)
  Player headshot (28px circle)
  Player name (12px font-semibold) + position tag (10px muted)
  All stat values right-aligned, 11px
  Rostered players show team color accent or "ROSTERED" badge
  Free agents show green dot
  Click row body → onPlayerClick(player.id)

VIRTUAL SCROLL: If list >100 rows, use windowed rendering
  Show 20 rows at a time, load more on scroll

DATA:
  Fetch Sleeper players: GET /api/league/roster?leagueId={id}&view=available
  Or use lib/sleeper-client.ts getAllPlayers()
  Filter in client by selected position and toggles

---

## Step 8 — Trend Tab (app/league/[id]/tabs/TrendTab.tsx)

Reference: Sleeper trend page — two-column split, trending up + trending down

LAYOUT:
  Two equal columns side by side
  Each has its own header and scroll
  On mobile: stacked vertically

LEFT COLUMN — Trending Up:
  Header: "Trending up" (bold 14px) + "ALL" filter pill
  Each row:
    Rank number in circle (24px, white/20 bg)
    Player headshot (32px circle)
    Player name (font-semibold 12px) + position + team (white/40 10px)
    Delta: +{number} in green (font-bold 12px, right-aligned)
    "Rostered {n}%" below delta (white/40 9px)
    + add button (circle, 24px, white/10 bg hover:cyan)
    Click row → onPlayerClick(player.id)

RIGHT COLUMN — Trending Down:
  Header: "Trending down" (bold 14px) + "ALL" filter pill
  Same structure but delta in red (-{number})
  - drop button instead of + add

FILTER PILLS (per column):
  ALL | QB | RB | WR | TE | K | DEF
  Active: bg-white/15 text-white
  Inactive: text-white/40

DATA:
  Fetch recent trending data
  Use Sleeper's public trending endpoint if available:
    GET https://api.sleeper.app/v1/players/nfl/trending/{type}?lookback_hours=24&limit=25
    type = 'add' for trending up, 'drop' for trending down
  Cache this data — it's public, no auth needed
  Create API route: GET /api/league/trend?type=add&sport=NFL

---

## Step 9 — Trades Tab (app/league/[id]/tabs/TradesTab.tsx)

Reference: Sleeper trades page — Active Trades left, Trade Block right, TRADE CTA

LAYOUT:
  Two-panel layout:
    LEFT (~55%): Active Trades
    RIGHT (~45%): Trade Block
  TRADE button: centered between them (position: sticky top)

ACTIVE TRADES SECTION:
  Header: "Active Trades" + pending count badge (cyan circle)
  If no trades: empty state
    Sleeper-style empty state: faint illustration + "No active trades yet..."
    "PROPOSE A TRADE" text link in cyan
  If trades exist:
    Trade card for each:
      Two-column layout: Team A gave ← → Team B gave
      Each side shows player avatars + names + picks
      Trade status badge (PENDING / ACCEPTED / REJECTED)
      Accept/Decline/Counter buttons if pending and you're involved
      Timestamp + who proposed

TRADE CTA BUTTON (center):
  TRADE button with trade icon
  Style: bg-white/10 border border-white/20 rounded-xl px-5 py-2 font-bold
  Or primary style: bg-gradient-to-r from-cyan-500 to-violet-600
  Opens trade flow

TRADE BLOCK SECTION:
  Header: "Trade Block"
  If no players listed: empty state
    Faint illustration + "No players on the trade block yet"
  If players listed:
    Each block item: player avatar + name + position + team
    Who listed them (manager avatar + name)
    Note if any was added
    Click player → onPlayerClick(player.id)

PROPOSE TRADE FLOW (modal or inline):
  Step 1: Select partner team (grid of manager cards)
  Step 2: My assets (players + picks + FAAB)
  Step 3: Their assets (browse their roster)
  Step 4: Review + Send
  Each step scrollable, clear back/next navigation

PICKS SUPPORT:
  Future draft picks shown as: "{year} {round} pick (via {team})"
  Selectable in trade flow

---

## Step 10 — Scores Tab (app/league/[id]/tabs/ScoresTab.tsx)

LAYOUT:
  Matchup cards stacked vertically
  Week selector at top: ← Week 1 →

  Each matchup card:
    Team A (left): avatar + name + score (large, white)
    vs. divider (center, white/25)
    Team B (right): score + name + avatar
    Winner highlighted: slightly brighter or underlined
    Projected score if in progress: "Proj: 142.3" (white/45 smaller)
    Game status: FINAL / IN PROGRESS / UPCOMING

  Empty state for pre-season: "Scores will appear once the season begins"

---

## Step 11 — PlayerStatCard modal (app/league/[id]/components/PlayerStatCard.tsx)

Global modal — opens from any tab when a player is clicked.

OVERLAY:
  Fixed inset-0 bg-black/50 backdrop-blur-sm z-50
  Click backdrop → close
  ESC key → close (useEffect keydown listener)
  Fade + scale-in animation (opacity 0→1, scale 0.96→1, 200ms)

CARD:
  Max-width 580px, centered
  Max-height 85vh, overflow-y-auto
  Background: #0c0c1e
  Border: 1px solid rgba(255,255,255,0.12)
  Rounded-3xl p-0 overflow-hidden

HEADER:
  Full-width player banner (bg gradient based on NFL team color)
  Player headshot (80px circle, border-4 border-white/20, bottom-left of banner)
  Player name (24px font-black, white)
  Position badge + team + jersey number
  Injury status badge if applicable (red/yellow pill)
  Close button (×) top-right

STAT TABS (below header):
  [2026 Stats] [Career] [Game Log] [Ownership] [Trade Value]
  Active: white border-b-2
  Inactive: white/40

2026 STATS TAB (default):
  Passing section: YDS / TDs / INTs / CMP%
  Rushing section: YDS / ATT / TDs
  Receiving section: REC / YDS / TDs / Targets
  Fantasy points by week (bar chart, 8 weeks if available)
    Each bar: height proportional to points, label on hover
    Below chart: avg PPG

TRADE VALUE TAB:
  Current value (from FantasyCalc if available, else stub)
  30-day trend arrow (↑ or ↓) + % change
  Dynasty vs Redraft toggle

BOTTOM CTAs:
  [Add to Waiver Queue]  [Analyze Trade]  [Ask Chimmy about {name}]
  Ask Chimmy: onclick → dispatch event to LeftChatPanel to open Chimmy tab
              with pre-loaded prompt: "Tell me about {playerName} in my {leagueName}"

DATA:
  Fetch from GET /api/player/{sleeperId}?league={leagueId}
  Or use Sleeper's public player endpoint if available
  Headshot: https://sleepercdn.com/content/nfl/players/thumb/{sleeperId}.jpg

---

## Step 12 — Add redirect from /app/league/[id]

Create app/app/league/[id]/page.tsx:
```typescript
import { redirect } from 'next/navigation'

export default function LegacyLeaguePage({ params }: { params: { id: string } }) {
  redirect(`/league/${params.id}`)
}
```

Also check if middleware.ts exists and add a catch-all redirect:
```typescript
// In middleware.ts — add to matcher patterns
if (req.nextUrl.pathname.startsWith('/app/league/')) {
  const id = req.nextUrl.pathname.replace('/app/league/', '')
  return NextResponse.redirect(new URL(`/league/${id}`, req.url))
}
```

---

## Design Tokens (same as dashboard)

Background page:    #07071a
Background panel:   #0a0a1f
Background card:    #0c0c1e
Border default:     1px solid rgba(255,255,255,0.07)
Text primary:       #ffffff
Text muted:         rgba(255,255,255,0.40)
Accent cyan:        #06b6d4
Accent violet:      #7c3aed
Warning amber:      #f59e0b

Position badge colors:
  QB: bg-red-500/25 text-red-400 border-red-500/35
  RB: bg-emerald-500/25 text-emerald-400 border-emerald-500/35
  WR: bg-blue-500/25 text-blue-400 border-blue-500/35
  TE: bg-orange-500/25 text-orange-400 border-orange-500/35
  K:  bg-gray-500/25 text-gray-400 border-gray-500/35
  DEF: bg-purple-500/25 text-purple-400 border-purple-500/35
  SF: bg-yellow-500/25 text-yellow-400 border-yellow-500/35  (superflex)

---

## Files to Create

| File | Notes |
|------|-------|
| app/league/[id]/page.tsx | Server component, auth gate, data load |
| app/league/[id]/LeagueShell.tsx | Client shell, owns tab state |
| app/league/[id]/tabs/DraftTab.tsx | Draftboard + team list |
| app/league/[id]/tabs/TeamTab.tsx | Roster rows with position badges |
| app/league/[id]/tabs/LeagueTab.tsx | Members + standings + settings |
| app/league/[id]/tabs/PlayersTab.tsx | Searchable player pool table |
| app/league/[id]/tabs/TrendTab.tsx | Trending up/down split |
| app/league/[id]/tabs/TradesTab.tsx | Active trades + trade block |
| app/league/[id]/tabs/ScoresTab.tsx | Matchup scores by week |
| app/league/[id]/components/PlayerStatCard.tsx | Global player modal |
| app/league/[id]/components/PlayerRow.tsx | Shared player row component |
| app/league/[id]/components/RosterSlot.tsx | Roster slot with position badge |
| app/app/league/[id]/page.tsx | Redirect stub to /league/[id] |
| app/api/league/trend/route.ts | Trending players API (proxies Sleeper) |
| app/api/player/[sleeperId]/route.ts | Player detail API |

---

## Commit Order

```
git commit -m "feat(league-page): add /league/[id] route structure and shell"
git commit -m "feat(league-draft): implement Draft tab with draftboard and team list"
git commit -m "feat(league-team): implement Team tab with roster rows and warnings"
git commit -m "feat(league-info): implement League tab with settings and scoring"
git commit -m "feat(league-players): implement Players tab with filter bar and table"
git commit -m "feat(league-trend): implement Trend tab with up/down split"
git commit -m "feat(league-trades): implement Trades tab with trade block and flow"
git commit -m "feat(league-scores): implement Scores tab with matchup cards"
git commit -m "feat(player-card): add PlayerStatCard global modal"
git commit -m "feat(league-redirect): redirect /app/league/[id] to /league/[id]"
```

---

## Constraints

- All tab files have 'use client' at the top
- LeagueShell.tsx has 'use client'
- page.tsx is server-only (no hooks, no useState)
- No any / no @ts-ignore
- LeftChatPanel and RightControlPanel are imported from app/dashboard/components — do not duplicate them
- ManagerRoleBadge is imported from components/ManagerRoleBadge — do not recreate
- ChimmyChat.tsx is never modified
- Player images use Sleeper CDN: sleepercdn.com/content/nfl/players/thumb/{id}.jpg
- PlayerStatCard is a fixed overlay (not position:fixed — use a portal or root-level div)
- Trending data API can use Sleeper's public endpoint — no auth needed for that data
- npx tsc --noEmit after each tab file is complete
