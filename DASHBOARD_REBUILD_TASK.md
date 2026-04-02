# DASHBOARD_REBUILD_TASK.md
# /dashboard page rebuild — correct 3-panel layout per master spec
# Drop in repo root. In Cursor: @DASHBOARD_REBUILD_TASK.md implement one phase at a time.

---

## LAYOUT CORRECTION — CRITICAL

The phases 1-4 dashboard built the WRONG layout:
  LEFT=leagues, RIGHT=chat

The master spec requires the OPPOSITE:
  LEFT=chat, CENTER=content, RIGHT=leagues+DMs

This file rebuilds the dashboard with the correct layout.

---

## Read these files before writing anything

  app/dashboard/page.tsx
  app/dashboard/DashboardShell.tsx
  app/dashboard/types.ts
  app/dashboard/components/LeagueListPanel.tsx     (reuse, do not rewrite)
  app/dashboard/components/AFChatPanel.tsx          (reuse tabs logic, restructure position)
  app/dashboard/components/DashboardOverview.tsx   (reuse, do not rewrite)
  app/components/ChimmyChat.tsx                    (294 lines — do not modify)
  app/api/league/list/route.ts
  app/api/user/rank/route.ts
  lib/auth.ts

---

## GLOBAL LAYOUT RULE

Both states (dashboard + league) use the same 3-panel shell.
The ONLY thing that changes between states is center content.

  ┌─────────────────────────────────────────────────────────────┐
  │  LEFT (280px)     │  CENTER (flex-1)     │  RIGHT (300px)  │
  │  CHAT             │  Dashboard OR        │  AF Chat DMs    │
  │  (primary)        │  League tabs         │  (top ~55%)     │
  │                   │                      │  League List    │
  │                   │                      │  (bottom ~45%)  │
  └─────────────────────────────────────────────────────────────┘

Dashboard state:
  LEFT:   Chimmy Chat (default open)
  CENTER: Dashboard overview widgets
  RIGHT:  AF Chat DMs (top) + League List (bottom)

League selected state:
  LEFT:   League Chat (switches automatically)
  CENTER: League tabs (Draft/Team/League/Players/Trend/Trades/Scores)
  RIGHT:  AF Chat DMs (top) + League List (bottom, same component)

The RIGHT panel NEVER changes between states.
The LEFT panel switches between Chimmy and League Chat.
The CENTER panel swaps completely.

---

## PHASE 1 — Rebuild DashboardShell.tsx with correct layout

Completely rewrite app/dashboard/DashboardShell.tsx.
The current file has left=leagues, right=chat. Invert this.

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { LeftChatPanel }    from './components/LeftChatPanel'
import { DashboardOverview } from './components/DashboardOverview'
import { RightControlPanel } from './components/RightControlPanel'
import type { UserLeague }   from './types'

interface DashboardShellProps {
  userId:   string
  userName: string
}

export function DashboardShell({ userId, userName }: DashboardShellProps) {
  const [leagues,        setLeagues]        = useState<UserLeague[]>([])
  const [selectedLeague, setSelectedLeague] = useState<UserLeague | null>(null)
  const [leaguesLoading, setLeaguesLoading] = useState(true)

  useEffect(() => {
    fetch('/api/league/list')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setLeagues(Array.isArray(d.leagues ?? d.data ?? d)
        ? (d.leagues ?? d.data ?? d) : []))
      .catch(() => setLeagues([]))
      .finally(() => setLeaguesLoading(false))
  }, [])

  const handleSelectLeague = useCallback((league: UserLeague | null) => {
    setSelectedLeague(league)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#07071a] text-white">

      {/* LEFT: Chat panel — always visible, switches context */}
      <LeftChatPanel
        selectedLeague={selectedLeague}
        userId={userId}
        width={280}
      />

      {/* CENTER: Dashboard overview OR league tab content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {selectedLeague
          ? (
            // League view is in a separate route — /league/[id]
            // Selecting a league navigates there.
            // This state should not render inline — see navigation note below.
            null
          )
          : (
            <DashboardOverview
              userName={userName}
              leagues={leagues}
              leaguesLoading={leaguesLoading}
              onSelectLeague={handleSelectLeague}
            />
          )
        }
      </main>

      {/* RIGHT: Control panel — never changes */}
      <RightControlPanel
        leagues={leagues}
        leaguesLoading={leaguesLoading}
        selectedId={selectedLeague?.id ?? null}
        onSelectLeague={handleSelectLeague}
        userId={userId}
      />

    </div>
  )
}
```

### Navigation note for league selection

When the user clicks a league, navigate to /league/[id] instead of swapping
center content inline. The /league/[id] page has the same shell but with
league content in the center.

Update handleSelectLeague to navigate:
```typescript
import { useRouter } from 'next/navigation'

const router = useRouter()

const handleSelectLeague = useCallback((league: UserLeague | null) => {
  if (league) {
    router.push(`/league/${league.id}`)
  } else {
    setSelectedLeague(null)
  }
}, [router])
```

---

## PHASE 2 — Create LeftChatPanel component

Create app/dashboard/components/LeftChatPanel.tsx

This is the LEFT panel — the primary communication surface.

```typescript
interface LeftChatPanelProps {
  selectedLeague: UserLeague | null
  userId:         string
  width:          number
}
```

VISUAL:
  Width: 280px (fixed by parent)
  Background: #0a0a1f
  Border-right: 1px solid rgba(255,255,255,0.07)
  Full height

CONTENT (two modes):

MODE A — No league selected (dashboard):
  Show ChimmyChat full height
  No tab bar needed — Chimmy is the default chat context on dashboard

MODE B — League selected (this component is also used on /league/[id]):
  Show League Chat full height
  League Chat header: "League Chat" + mute icon
  Scrollable message feed
  Fixed input bar at bottom
  Chat tab bar at top with: [League] [Chimmy] [Groups]
  Default: League tab

LAYOUT:
```tsx
<div style={{ width: `${width}px` }}
     className="flex-shrink-0 h-full flex flex-col bg-[#0a0a1f]
                border-r border-white/[0.07] overflow-hidden">
  {selectedLeague
    ? <LeagueChatInPanel league={selectedLeague} userId={userId}/>
    : <ChimmyChatInPanel userId={userId}/>
  }
</div>
```

CHIMMY CHAT PANEL (no league):
  Import ChimmyChat from app/components/ChimmyChat
  Wrap in flex-1 min-h-0 container
  Add a small header: "Chimmy" with AI icon, cyan accent
  The existing ChimmyChat component fills this panel

LEAGUE CHAT PANEL (league selected):
  Fetch from GET /api/bracket/leagues/{leagueId}/chat?limit=50
  If 404 or error: show welcome state ("No messages yet. Start the conversation!")
  Messages feed:
    Avatar (26px circle, initials or CDN image)
    Username + relative timestamp
    Message text or activity notification (italic, player name cyan)
    System messages: trade completed, waiver add, etc. — in muted italic
  Input bar (fixed bottom):
    + icon (attachments stub — tooltip "coming soon")
    GIF button (stub)
    Emoji button (stub)
    Text input: flex-1, "Message league..."
    Send on Enter (no shift) or click
    Ask Chimmy shortcut: small violet button, onClick → switch to Chimmy mode

LEAGUE CHAT TAB BAR (when league is selected):
  Three tabs at top:
    [🏈 League]  [🤖 Chimmy]  [👥 Groups]
  League = shows league chat (default)
  Chimmy = shows ChimmyChat component
  Groups = empty state for now
  Active tab: cyan underline + white text
  Inactive: white/40

---

## PHASE 3 — Create RightControlPanel component

Create app/dashboard/components/RightControlPanel.tsx

This is the RIGHT panel — always visible, never changes between states.

```typescript
interface RightControlPanelProps {
  leagues:        UserLeague[]
  leaguesLoading: boolean
  selectedId:     string | null
  onSelectLeague: (league: UserLeague | null) => void
  userId:         string
}
```

VISUAL:
  Width: 300px (fixed)
  Background: #0a0a1f
  Border-left: 1px solid rgba(255,255,255,0.07)
  Full height
  Two stacked sections — no overflow on container

LAYOUT:
```tsx
<div className="w-[300px] flex-shrink-0 h-full flex flex-col
                bg-[#0a0a1f] border-l border-white/[0.07] overflow-hidden">
  {/* TOP SECTION: AF Chat DMs (~55% height) */}
  <div className="flex flex-col border-b border-white/[0.07]"
       style={{ height: '55%', minHeight: 0 }}>
    <AFChatDMPanel userId={userId}/>
  </div>

  {/* BOTTOM SECTION: League List (~45% height) */}
  <div className="flex flex-col" style={{ flex: 1, minHeight: 0 }}>
    <LeagueListPanel
      leagues={leagues}
      selectedId={selectedId}
      onSelect={onSelectLeague}
      compact={true}
    />
  </div>
</div>
```

AF CHAT DM PANEL (top section):
  This is the DM/messaging control, NOT the league chat.
  Label it: "AF Chat"
  Three tabs: [🤖 Chimmy] [👤 Direct] [👥 Groups]
  Default tab: Chimmy (on dashboard), or last-used tab (on league page)

  Chimmy sub-tab:
    Shows ChimmyChat component in a compact version
    If compact ChimmyChat doesn't fit, show a "Open Chimmy →" link
    that opens a drawer or navigates to full chat

  Direct sub-tab:
    Empty state: "No direct messages yet"
    Avatar + username list if DMs exist

  Groups sub-tab:
    Empty state: "No group chats yet"

  CRITICAL: This AF Chat panel on the RIGHT is for DMs/Chimmy access
  It is NOT the league chat — league chat lives on the LEFT

LEAGUE LIST (bottom section):
  Use the existing LeagueListPanel component with compact={true}
  Add a small header: "My Leagues" label + "+" button (opens import)
  All existing features apply: search, favorites, drag-drop, concept badges
  Clicking a league calls onSelectLeague → navigates to /league/[id]

---

## PHASE 4 — Update DashboardOverview for the new layout

Read app/dashboard/components/DashboardOverview.tsx fully.
The existing DashboardOverview was written for the old layout
(center panel with no left chat). It may need padding adjustments.

Changes:
  - Remove any padding that was compensating for the old left panel
  - The overview now sits in the CENTER of a 3-panel layout
  - It has 280px of chat on its left, 300px of controls on its right
  - Center content should be max-w-3xl centered within its flex-1 area
  - Scrolls independently: overflow-y-auto h-full

No functional changes — just layout/spacing adjustments.

The existing sections remain:
  Get Started accordion (collapses when complete)
  Welcome banner with username in cyan
  Ranking widget (from /api/user/rank)
  League summary cards (calls onSelectLeague → navigates to /league/[id])
  AI shortcuts row (Trade Advisor, Waiver Wire, Power Rankings, Mock Draft)

---

## PHASE 5 — Fix types.ts (BLOCKING — must do first)

Before any of the above, fix the build-breaking issue:

  git add app/dashboard/types.ts
  git commit -m "fix(dash): commit missing types.ts to unblock Vercel build"
  git push origin main

Then implement Phases 1-4, then:

  npx tsc --noEmit
  git add app/dashboard/
  git commit -m "feat(dash): rebuild dashboard with correct layout — chat left, controls right"
  git push origin main

---

## Files to Create / Modify

| Action | File |
|--------|------|
| COMMIT | app/dashboard/types.ts (was uncommitted — fix first) |
| REWRITE | app/dashboard/DashboardShell.tsx |
| CREATE | app/dashboard/components/LeftChatPanel.tsx |
| CREATE | app/dashboard/components/RightControlPanel.tsx |
| KEEP   | app/dashboard/components/LeagueListPanel.tsx (no changes) |
| KEEP   | app/dashboard/components/DashboardOverview.tsx (minor layout tweaks) |
| KEEP   | app/components/ChimmyChat.tsx (no changes) |

---

## Design tokens

Background page:    #07071a
Background panel:   #0a0a1f
Background card:    #0c0c1e
Chat input bg:      rgba(255,255,255,0.05)
Border default:     1px solid rgba(255,255,255,0.07)
Text primary:       #ffffff
Text muted:         rgba(255,255,255,0.40)
Accent cyan:        #06b6d4
Accent violet:      #7c3aed
Left panel width:   280px
Right panel width:  300px
Center:             flex-1

---

## Constraints

- No any / no @ts-ignore
- ChimmyChat.tsx is never modified — only wrapped
- LeagueListPanel.tsx is never rewritten — only repositioned to right panel
- League selection navigates to /league/[id] — does not swap center inline
- Both panels scroll independently
- Right panel always shows AF Chat (top) + League List (bottom) regardless of state
- Mobile (<768px): left panel collapses to a floating chat button, right panel collapses to a bottom sheet
