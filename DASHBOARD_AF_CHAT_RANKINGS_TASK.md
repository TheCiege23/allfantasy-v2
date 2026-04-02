# DASHBOARD_AF_CHAT_RANKINGS_TASK.md
# Drop into repo root. In Cursor: @DASHBOARD_AF_CHAT_RANKINGS_TASK.md implement one PHASE at a time.
# This is the master spec for the AllFantasy dashboard, AF Chat, and Rankings rebuild.

---

## CRITICAL: DashboardShell.tsx was never committed

The dashboard directory only contains DashboardContent.tsx and page.tsx.
DashboardShell.tsx does not exist on main. Build it fresh from this spec.

---

## Step 1 — Read ALL of these before writing a single line

  app/dashboard/page.tsx               (125 lines)
  app/dashboard/DashboardContent.tsx   (309 lines)
  app/components/ChimmyChat.tsx        (294 lines)
  app/api/league/list/route.ts
  app/api/league/detail/route.ts       (if it exists)
  app/api/league/chat/route.ts         (if it exists)
  components/ManagerRoleBadge.tsx
  prisma/schema.prisma
  lib/auth.ts
  app/globals.css

---

## SYSTEM STATE SUMMARY (the source of truth)

### Dashboard — No League Selected
  LEFT  (200px fixed)  →  League List
  CENTER (flex-1)      →  Overview content (Get Started + welcome + rankings widget)
  RIGHT  (300px fixed) →  AF Chat (default tab = Chimmy)

### Dashboard — League Selected
  LEFT  (200px fixed)  →  League List (same component, same state)
  CENTER (flex-1)      →  League content with tabs (Draft/Team/League/Players/Trend/Trades/Scores)
  RIGHT  (300px fixed, stacked) →  AF Chat (TOP, collapses to ~200px)
                                    League List mirror (BOTTOM, scrollable)
  Chat default tab when league selected = League Chat

### No external platform names in UI ever. Everything is AllFantasy branded.

---

## PHASE 1 — Three-panel shell + League List component

### Create app/dashboard/DashboardShell.tsx

This is the root client component rendered by page.tsx.
It owns selected league state and renders all three panels.

```typescript
'use client'

import { useState, useEffect } from 'react'
import { LeagueListPanel }     from './components/LeagueListPanel'
import { AFChatPanel }         from './components/AFChatPanel'
import { DashboardOverview }   from './components/DashboardOverview'
import { LeagueView }          from './components/LeagueView'

export function DashboardShell({
  userName, userId
}: {
  userName: string
  userId:   string
}) {
  const [selectedLeague, setSelectedLeague] = useState<UserLeague | null>(null)
  const [leagues,        setLeagues]        = useState<UserLeague[]>([])

  useEffect(() => {
    fetch('/api/league/list')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setLeagues(Array.isArray(d.leagues ?? d.data ?? d) ? (d.leagues ?? d.data ?? d) : []))
      .catch(() => setLeagues([]))
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#07071a] text-white">

      {/* LEFT: League List — always visible */}
      <LeagueListPanel
        leagues={leagues}
        selectedId={selectedLeague?.id ?? null}
        onSelect={setSelectedLeague}
      />

      {/* CENTER: Overview or League View */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {selectedLeague
          ? <LeagueView league={selectedLeague} onBack={() => setSelectedLeague(null)}/>
          : <DashboardOverview userName={userName} leagues={leagues}/>
        }
      </div>

      {/* RIGHT: AF Chat — always visible, context-aware */}
      <AFChatPanel
        selectedLeague={selectedLeague}
        userId={userId}
      />

    </div>
  )
}
```

Update app/dashboard/page.tsx to render DashboardShell:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { redirect }         from 'next/navigation'
import { DashboardShell }   from './DashboardShell'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  return (
    <DashboardShell
      userId={session.user.id}
      userName={session.user.name ?? session.user.email ?? 'Manager'}
    />
  )
}
```

---

## PHASE 2 — LeagueListPanel (shared component, used in both positions)

### Create app/dashboard/components/LeagueListPanel.tsx

This component is used in two places:
1. Left panel (always visible, full height)
2. Right panel bottom half (when league is selected, half height)

Props control which mode it renders in.

```typescript
interface LeagueListPanelProps {
  leagues:    UserLeague[]
  selectedId: string | null
  onSelect:   (league: UserLeague) => void
  compact?:   boolean   // true = bottom-right stacked mode
}
```

Features (all required):

SEARCH BAR:
  Input at top: "Search leagues..."
  Filters leagues in real time by name
  Icon: magnifying glass SVG

FAVORITES:
  Star icon on each league card
  Starred leagues float to the top of the list
  Star state persisted in localStorage under 'af-league-favorites'

DRAG AND DROP REORDER:
  Read whether the existing project has a DnD library installed
  If not, implement with native HTML5 drag API:
    draggable={true} on each league card
    onDragStart, onDragOver, onDrop handlers
    Visual: dragged card gets opacity-50, drop target gets border-cyan-500
  Order persisted in localStorage under 'af-league-order'

LEAGUE CARD display per card:
  League name (truncated if long)
  Status badge: Pre-Draft / Active / Completed / Off-Season
  Sport badge: NFL / NBA / MLB / NHL / CFB
  League Concept Type badge (see mapping below)
  Platform emoji (🌙 Sleeper, 🏈 Yahoo, 🏆 MFL, 📊 Fantrax, 🔴 ESPN)

LEAGUE CONCEPT TYPE MAPPING:
  Read league.scoring / league.isDynasty / league.settings to determine type
  Display these labels:
    isDynasty + scoring=PPR       → "Dynasty PPR"
    isDynasty                     → "Dynasty"
    scoring=guillotine OR         → "Guillotine"
    settings.last_scored_leg      → "Guillotine"
    scoring=best_ball             → "Best Ball"
    scoring=keeper                → "Keeper"
    default                       → "Redraft"

SELECTED STATE:
  Selected league gets border-l-2 border-cyan-500 bg-cyan-500/8
  Non-selected gets border-l-2 border-transparent

ORPHAN INVITE BUTTON:
  If user is commissioner and league has orphan teams:
  Show small "+" button to copy invite link

EMPTY STATE:
  No leagues: show centered card with
    Text: "No leagues connected"
    Button: "Import a League" → opens ImportDrawer or navigates to /dashboard/rankings

VISUAL:
  Panel background: #0a0a1f
  Width: 200px in left mode, 100% in right-bottom mode
  Border-right: 1px solid rgba(255,255,255,0.07) in left mode
  Always has a scrollbar (overflow-y: auto, scrollbar-gutter: stable)
```

---

## PHASE 3 — AFChatPanel (the right panel)

### Create app/dashboard/components/AFChatPanel.tsx

This is "AF Chat" — a full-featured chat panel with tabs.

```typescript
interface AFChatPanelProps {
  selectedLeague: UserLeague | null
  userId:         string
}
```

PANEL STRUCTURE:
  When NO league selected:
    Full height, single area
    Tab bar at top
    Chat content below

  When league IS selected:
    STACKED layout:
      TOP HALF: AF Chat (chat only, ~50% height)
      BOTTOM HALF: LeagueListPanel (compact mode)
    Border between them: 1px solid rgba(255,255,255,0.07)

PANEL WIDTH: 300px fixed, flex-shrink-0

TAB SYSTEM (at top of chat area):
  Four tabs, always visible:
    [🤖 Chimmy]   → AI chat with Chimmy
    [👤 Direct]   → 1-on-1 DMs
    [👥 Groups]   → Group chats
    [🏈 League]   → League chat (only active when league is selected)

  Default tab logic:
    If no league selected: default = Chimmy
    If league selected: default = League

  Tab styling:
    Active: bg-white/8 text-white border-b-2 border-cyan-500
    Inactive: text-white/40 hover:text-white/70
    Disabled (League tab when no league): opacity-30 cursor-not-allowed

CHIMMY TAB:
  Import and render the existing ChimmyChat component
  ChimmyChat.tsx already has voice, image upload, message history
  Wrap it inside the tab panel with correct sizing

DIRECT TAB:
  Shows list of users the logged-in user has DM'd
  Each row: avatar + username + last message preview + timestamp
  Clicking a user opens the DM thread in the tab
  Empty state: "No direct messages yet"

GROUPS TAB:
  Shows list of group chats the user is in
  Each row: group avatar (initials) + group name + member count + last message
  Empty state: "No group chats yet"

LEAGUE CHAT TAB:
  When no league selected: "Select a league to see its chat" empty state
  When league selected: full chat for that league

  Chat features:
    Messages feed (scrollable, newest at bottom)
    Each message:
      Avatar (26px circle, initials or Sleeper CDN image)
      Username + timestamp
      Message text OR activity notification (free agent moves, trades)
      Activity messages: italic, player name in cyan
    Input bar (fixed at bottom of the tab):
      Emoji button → shows emoji picker (use a simple one)
      GIF button → stub "Coming soon" tooltip
      File upload → file input, image preview
      @mention → on typing "@", show dropdown of league managers
      Send button (arrow icon)
      "Ask Chimmy about this league" shortcut button → switches to Chimmy tab with league context pre-loaded

SHARED CHAT INPUT COMPONENT:
  Use the same input bar component across all chat tabs
  It adapts its send behavior based on active tab

---

## PHASE 4 — DashboardOverview (center when no league selected)

### Create app/dashboard/components/DashboardOverview.tsx

This replaces DashboardContent.tsx as the overview.
Read DashboardContent.tsx (309 lines) fully first and migrate any useful content.

SECTIONS (top to bottom):

GET STARTED ACCORDION:
  Only show if not all steps are complete
  Check completion from localStorage 'af-onboarding-steps' OR from user DB
  Collapsible: click header to expand/collapse
  Steps:
    1. Select favorite sports (link to Settings)
    2. Connect a platform (link to Import flow)
    3. Join or create a league (link to Import/Find)
    4. Try your first AI action (link to Chimmy)
    5. Invite a friend (link to copy referral)
  When all 5 complete: show "All set! Setup controls moved to Settings →" then hide after 3s

WELCOME BANNER:
  "Welcome back, {userName}" with username in cyan
  Quick action buttons:
    [+ Create League]
    [Import]
    [Find League]

RANKING WIDGET:
  Show user's current tier badge prominently
  Tier name (e.g. "Tier 1 — Elite")
  XP bar showing progress to next tier
  League count + active leagues count
  Link: "View full rankings →" → /dashboard/rankings
  If no import yet: "Complete your import to unlock your ranking →"

LEAGUE SUMMARY CARDS:
  Grid of the user's leagues (compact, 2 per row)
  Each card:
    League name + sport + format
    Record (W-L) if in season
    AI insight snippet (last AI analysis summary)
    "Open" button → sets selectedLeague in parent shell

AI SHORTCUTS ROW:
  Four quick-action cards:
    Trade Advice → /trade-evaluator
    Waiver Help  → /waiver-ai
    Power Rankings → /power-rankings
    Mock Draft     → /mock-draft
  Each card: icon + label + brief description

---

## PHASE 5 — LeagueView (center when league is selected)

### Create app/dashboard/components/LeagueView.tsx

Read app/api/league/detail/route.ts to understand the data shape.

HEADER:
  League badge + name + subtitle (format, year, team count)
  Tab bar: [Draft] [Team] [League] [Players] [Trend] [Trades] [Scores]
  Active tab: cyan underline

TAB CONTENT:

DRAFT TAB:
  Invite banner (commissioner only):
    "Invite friends to play" + manager count (X/Y)
    Invite URL with copy button
    Uses league invite token from LeagueInvite model
  Draftboard section:
    Draft countdown timer (days/hrs/mins/secs)
    If time not set: "Draft time has not yet been set"
    [Mock Drafts] button → /mock-draft
    [Set Time] button (commissioner only)
  Team list:
    All teams in the league ordered by slot/rank
    Each row: rank number + avatar + team name + manager name + role badge (C/CC/O)
    Orphan teams: cyan O badge + "Unclaimed" text + invite link

TEAM TAB:
  The logged-in user's team in this league
  Roster grid by position
  Record (W-L-T) + points for/against
  Next matchup preview
  AI insight for this week

LEAGUE TAB:
  Two sections:
    League Settings panel (team count, playoffs, waiver type, trade deadline, IR slots)
    Scoring panel (scoring_settings mapped to human-readable rows)
    Non-standard settings highlighted in amber (like Sleeper does)

PLAYERS TAB:
  Search/filter players in this league
  Shows owned/available status
  Click a player → opens PlayerStatCard modal (see Phase 6)

TREND TAB:
  Trending players in this league
  Trade activity feed
  Weekly power movement (who moved up/down)

TRADES TAB:
  Recent trades in the league
  Each trade: Team A gave / Team B gave layout
  AI verdict on each trade (fair/lopsided)

SCORES TAB:
  Current week matchups
  Each matchup: Team A score vs Team B score
  Projected final scores
  Live indicator if in-season

---

## PHASE 6 — Player Stat Card (modal, used across all views)

### Create components/PlayerStatCard.tsx

When any player name is clicked anywhere in the app, open this modal.

MODAL LAYOUT:
  Header:
    Player headshot image (from API — NFL: nfl.com/static/content/public/static/img/fantasy/transparent/200x200/{playerId}.png)
    Player name (large)
    Position badge + NFL team + jersey number
    Injury status badge if applicable
  Stats tabs:
    [2026 Stats] [Career] [Game Log] [Ownership] [Trade Value]
  Stats section:
    Passing: yards, TDs, INTs, completion %
    Rushing: yards, attempts, TDs
    Receiving: receptions, yards, TDs, targets
    Fantasy points per week bar chart (use recharts or CSS bars)
  Trade value:
    Current FantasyCalc value
    30-day trend (up/down arrow + %)
    Dynasty vs redraft value toggle
  Bottom CTA row:
    [Add to Waiver Queue] [Analyze Trade] [Ask Chimmy about {name}]

Modal behavior:
  Backdrop click → close
  ESC key → close
  Smooth fade-in animation
  Max width 600px, centered

---

## PHASE 7 — Rankings rebuild at /dashboard/rankings

Read the existing rankings page files:
  app/dashboard/rankings/page.tsx  (if it exists)
  app/api/user/rank/route.ts

The rankings system is broken. Rebuild it cleanly.

DATA SOURCES to aggregate (internal only, no external names in UI):
  The rank is computed from the user's imported data.
  Data is already pulled from the import flow.
  Do not hit external APIs from the client.

RANKING WIDGET (small, shown on overview):
  Tier badge (colored by tier level)
  Tier name + level
  XP progress bar to next tier
  Career stats: W-L record, championships, leagues played

FULL RANKINGS PAGE (/dashboard/rankings):
  MY RANKING section:
    Large tier display
    Breakdown: Win rate, playoff appearances, championships, league difficulty
    Platform badges showing which platforms contributed (Sleeper, Yahoo, etc.)
    "Update ranking" button (only if eligible — not already locked)
    Dispute link (one per platform, per the Phase 2 logic already built)

  LEADERBOARD section:
    Table of all users by tier
    Columns: Rank, Username, Tier, W-L Record, Championships, Leagues
    Filter by: sport, format (dynasty/redraft), tier
    User's own row highlighted in cyan

  TIER SYSTEM display:
    Read tiers from lib/ranking/config.ts
    Show all tiers with description
    Highlight user's current tier

FIXES for current broken state:
  Read app/api/user/rank/route.ts to find the bug
  Read lib/ranking/computeLegacyRank.ts for the rank function
  Check that LegacyUserRankCache is being populated after import
  The rank should be loaded from LegacyUserRankCache, not recomputed on every page load

---

## TypeScript interfaces for DashboardShell

```typescript
// app/dashboard/types.ts

export interface UserLeague {
  id:         string
  name:       string
  platform:   string
  sport:      string
  format:     string        // 'dynasty' | 'keeper' | 'redraft' | 'guillotine' etc
  scoring:    string
  teamCount:  number
  season:     string | number
  status?:    string        // 'pre_draft' | 'in_season' | 'completed' | 'off_season'
  isDynasty?: boolean
  settings?:  Record<string, unknown>
  sleeperLeagueId?: string
}

export interface UserLeagueTeam {
  id:              string
  externalId:      string
  teamName:        string
  ownerName:       string
  avatarUrl:       string | null
  role:            'commissioner' | 'co_commissioner' | 'member' | 'orphan'
  isOrphan:        boolean
  claimedByUserId: string | null
  draftPosition:   number | null
  wins:            number
  losses:          number
}

export interface LeagueDetail {
  id:          string
  name:        string
  sport:       string
  format:      string
  teamCount:   number
  isDynasty:   boolean
  settings:    Record<string, unknown>
  userRole:    string
  inviteToken: string | null
  draftDate:   string | null
  teams:       UserLeagueTeam[]
}

export interface ChatMessage {
  id:           string
  authorId:     string
  authorName:   string
  authorAvatar: string | null
  text?:        string
  isActivity:   boolean
  activityText?: string
  playerName?:   string
  createdAt:    string
}

export interface ChecklistStep {
  id:          string
  label:       string
  description: string
  done:        boolean
  ctaHref?:    string
  ctaLabel?:   string
}

export type LeagueTab = 'draft' | 'team' | 'league' | 'players' | 'trend' | 'trades' | 'scores'
export type AFChatTab = 'chimmy' | 'direct' | 'groups' | 'league'
```

---

## Visual Design System

All components must use these exact values:

BACKGROUNDS:
  Page bg:          #07071a
  Panel bg:         #0a0a1f
  Card bg:          #0c0c1e
  Card hover:       #0e0e24
  Input bg:         rgba(255,255,255,0.05)

BORDERS:
  Default:          1px solid rgba(255,255,255,0.07)
  Emphasis:         1px solid rgba(255,255,255,0.15)
  Active/selected:  border-cyan-500 (#06b6d4)

TEXT:
  Primary:          #ffffff
  Secondary:        rgba(255,255,255,0.60)
  Muted:            rgba(255,255,255,0.35)
  Accent:           #06b6d4 (cyan)

ACCENT COLORS:
  Primary CTA:      #06b6d4 (cyan-500)
  Secondary CTA:    #7c3aed (violet-600)
  Success:          #10b981 (emerald-500)
  Warning:          #f59e0b (amber-500)
  Danger:           #ef4444 (red-500)
  Commissioner C:   #f59e0b (amber)
  Co-Comm CC:       #f59e0b at 70% opacity
  Orphan O:         #06b6d4 (cyan)

STATUS BADGES:
  Pre-Draft:   bg-amber-500/20 text-amber-400 border-amber-500/30
  Active:      bg-emerald-500/20 text-emerald-400 border-emerald-500/30
  Completed:   bg-gray-500/20 text-gray-400 border-gray-500/30
  Off-Season:  bg-white/10 text-white/40 border-white/15

PANEL WIDTHS:
  League list (left):  200px fixed
  AF Chat (right):     300px fixed
  Center:              flex-1 (remaining space)

TYPOGRAPHY:
  Panel section labels:  10px, uppercase, letter-spacing 0.08em, text-white/30
  League names:          11-12px, font-semibold, text-white/80
  Tab labels:            11px, font-semibold
  Chat messages:         12px, leading-relaxed

SCROLLBARS:
  All scrollable panels: scrollbar-gutter stable
  Custom: 4px wide, rounded, rgba(255,255,255,0.1) thumb

TRANSITIONS:
  Panel selections: transition-all duration-150
  Tab switches: transition-colors duration-100
  Modal open/close: opacity + scale, duration-200

---

## Files to Create / Modify

| Action | File |
|--------|------|
| CREATE | app/dashboard/DashboardShell.tsx |
| CREATE | app/dashboard/components/LeagueListPanel.tsx |
| CREATE | app/dashboard/components/AFChatPanel.tsx |
| CREATE | app/dashboard/components/DashboardOverview.tsx |
| CREATE | app/dashboard/components/LeagueView.tsx |
| CREATE | app/dashboard/components/LeagueView/DraftTab.tsx |
| CREATE | app/dashboard/components/LeagueView/TeamTab.tsx |
| CREATE | app/dashboard/components/LeagueView/LeagueTab.tsx |
| CREATE | app/dashboard/components/LeagueView/PlayersTab.tsx |
| CREATE | app/dashboard/components/PlayerStatCard.tsx |
| CREATE | app/dashboard/types.ts |
| MODIFY | app/dashboard/page.tsx (render DashboardShell) |
| MODIFY | app/dashboard/rankings/page.tsx (rankings rebuild) |
| KEEP   | app/components/ChimmyChat.tsx (used inside Chimmy tab) |

---

## Phase order and commits

Phase 1 — Shell structure + page.tsx wiring
  git commit -m "feat(dash1): three-panel shell with league selection state"

Phase 2 — LeagueListPanel with search/favorites/drag-drop
  git commit -m "feat(dash2): league list panel with search favorites and reorder"

Phase 3 — AFChatPanel with all 4 tabs
  git commit -m "feat(dash3): AF Chat panel with Chimmy direct group and league tabs"

Phase 4 — DashboardOverview (no league selected state)
  git commit -m "feat(dash4): dashboard overview with onboarding rankings and shortcuts"

Phase 5 — LeagueView with all tabs
  git commit -m "feat(dash5): league view with draft team league players trend trades scores tabs"

Phase 6 — PlayerStatCard modal
  git commit -m "feat(dash6): player stat card modal with stats trade value and AI CTA"

Phase 7 — Rankings rebuild
  git commit -m "feat(dash7): rebuild rankings page with tier display and leaderboard"

---

## Constraints

- Never reference external platform names in UI text (use them only in internal logic)
- No new npm dependencies without checking what is already installed first
- DashboardShell.tsx is a client component ('use client')
- page.tsx remains a server component (reads session server-side)
- The three panels are independent scroll containers — never share scroll
- League list is ONE reusable component used in both left panel and right panel bottom
- ChimmyChat.tsx is not rewritten — it is imported and used inside the Chimmy tab
- All panel widths are fixed in px, center is flex-1
- Mobile (<768px): left sidebar collapses to a bottom sheet trigger, chat collapses to a floating button
- No any, no @ts-ignore
- npx tsc --noEmit must pass after each phase
