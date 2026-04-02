# DASHBOARD_LEAGUE_HUB_TASK.md
# Drop into repo root. In Cursor: @DASHBOARD_LEAGUE_HUB_TASK.md implement step by step

## What This Builds

A full three-panel dashboard layout at /dashboard that matches the Sleeper
league experience but inside the AF design system:

  LEFT (200px)   │  CENTER (flex-1)         │  RIGHT (280px)
  ─────────────────────────────────────────────────────────
  Leagues list   │  League content + tabs   │  League Chat
  sidebar        │  (Draft/Team/League/etc) │  (not Chimmy)

When no league is selected: center shows the existing welcome/overview content.
When a league is clicked in the left sidebar: center replaces with the full
league experience. Right panel switches from Chimmy to that league's chat.

---

## Step 1 — Read these files before writing anything

  app/dashboard/page.tsx               (125 lines)
  app/dashboard/DashboardContent.tsx   (309 lines)
  app/components/ChimmyChat.tsx        (294 lines)
  app/api/league/list/route.ts
  app/api/league/roster/route.ts
  lib/sleeper-client.ts
  prisma/schema.prisma                 (League, LeagueTeam, LeagueInvite)
  components/ManagerRoleBadge.tsx      (Phase 4)
  app/globals.css
  app/layout.tsx

---

## Step 2 — Create the three-panel shell

Rebuild app/dashboard/page.tsx as a three-column layout.

The outer shell is a full-height flex row. The existing dashboard content
goes into the center panel. The league sidebar and chat panel are new.

```tsx
// app/dashboard/page.tsx (server component, passes data to client)
import { getServerSession }   from 'next-auth'
import { authOptions }        from '@/lib/auth'
import { redirect }           from 'next/navigation'
import { DashboardShell }     from './DashboardShell'  // new client component

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

## Step 3 — Create app/dashboard/DashboardShell.tsx

This is the main layout component. It owns:
- Which league is selected (null = overview)
- The left sidebar
- The center panel (overview OR league view)
- The right panel (Chimmy OR league chat)

```tsx
'use client'

import { useState, useEffect } from 'react'
// imports...

export function DashboardShell({ userId, userName }: { userId: string; userName: string }) {
  const [leagues,         setLeagues]         = useState<UserLeague[]>([])
  const [selectedLeague,  setSelectedLeague]  = useState<UserLeague | null>(null)
  const [activeTab,       setActiveTab]       = useState<LeagueTab>('draft')
  const [leagueDetail,    setLeagueDetail]    = useState<LeagueDetail | null>(null)
  const [loadingDetail,   setLoadingDetail]   = useState(false)

  // Fetch user's leagues on mount
  useEffect(() => {
    fetch('/api/league/list')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setLeagues(Array.isArray(d.leagues ?? d.data ?? d) ? (d.leagues ?? d.data ?? d) : []))
      .catch(() => setLeagues([]))
  }, [])

  const handleSelectLeague = async (league: UserLeague) => {
    setSelectedLeague(league)
    setActiveTab('draft')
    setLoadingDetail(true)
    try {
      const res  = await fetch(`/api/league/detail?leagueId=${league.id}`)
      const data = await res.json()
      setLeagueDetail(data)
    } catch {
      setLeagueDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07071a]">

      {/* LEFT: LEAGUE SIDEBAR */}
      <LeagueSidebar
        leagues={leagues}
        selectedId={selectedLeague?.id ?? null}
        onSelect={handleSelectLeague}
      />

      {/* CENTER: OVERVIEW OR LEAGUE VIEW */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {selectedLeague ? (
          <LeagueView
            league={selectedLeague}
            detail={leagueDetail}
            loading={loadingDetail}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        ) : (
          <DashboardOverview userName={userName} leagues={leagues}/>
        )}
      </div>

      {/* RIGHT: LEAGUE CHAT OR CHIMMY */}
      <div className="w-[280px] flex-shrink-0 border-l border-white/[0.07] bg-[#0a0a1f] flex flex-col">
        {selectedLeague ? (
          <LeagueChat league={selectedLeague}/>
        ) : (
          <ChimmyChatPanel/>
        )}
      </div>

    </div>
  )
}
```

---

## Step 4 — Create LeagueSidebar component

```tsx
// Inside DashboardShell.tsx or a separate file

function LeagueSidebar({ leagues, selectedId, onSelect }: {
  leagues:    UserLeague[]
  selectedId: string | null
  onSelect:   (l: UserLeague) => void
}) {
  // Sport/format color for league avatar
  const FORMAT_GRADIENT: Record<string, string> = {
    dynasty: 'linear-gradient(135deg, #1e3a5f, #0e4a6e)',
    keeper:  'linear-gradient(135deg, #3b1f5e, #5e1f7a)',
    redraft: 'linear-gradient(135deg, #1a3d2b, #0e6e3e)',
    guillotine: 'linear-gradient(135deg, #5e1f1f, #8b0000)',
  }

  return (
    <div className="w-[200px] flex-shrink-0 bg-[#0a0a1f] border-r border-white/[0.07] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3.5 pb-2.5 border-b border-white/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">My Leagues</p>
      </div>

      {/* League list */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {leagues.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-[11px] text-white/25">No leagues yet</p>
            <button
              onClick={() => {/* open import drawer */}}
              className="mt-2 text-[10px] text-cyan-400 hover:underline">
              Import a league
            </button>
          </div>
        )}
        {leagues.map(league => {
          const isSelected = league.id === selectedId
          const gradient   = FORMAT_GRADIENT[league.format?.toLowerCase() ?? 'redraft']
            ?? FORMAT_GRADIENT.redraft
          return (
            <button
              key={league.id}
              onClick={() => onSelect(league)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-all
                border-l-2 ${isSelected
                  ? 'bg-cyan-500/8 border-l-cyan-500'
                  : 'border-l-transparent hover:bg-white/[0.04]'
                }`}
            >
              {/* League avatar */}
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm"
                style={{ background: gradient }}
              >
                {league.sport === 'NFL' ? '🏈' : league.sport === 'NBA' ? '🏀' : '⚾'}
              </div>

              {/* League info */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-white/80 truncate">{league.name}</div>
                <div className="text-[9px] text-white/35 capitalize mt-0.5">
                  {league.format} · {league.teamCount} teams
                </div>
              </div>

              {/* Status dot */}
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                league.status === 'in_season' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}/>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

---

## Step 5 — Create LeagueView component

This is the center panel when a league is selected. It has:
- League header (badge + name + subtitle)
- Tab row (Draft / Team / League / Players / Trend / Trades / Scores)
- Tab content area

```tsx
type LeagueTab = 'draft' | 'team' | 'league' | 'players' | 'trend' | 'trades' | 'scores'

const LEAGUE_TABS: { id: LeagueTab; label: string }[] = [
  { id: 'draft',   label: 'Draft'   },
  { id: 'team',    label: 'Team'    },
  { id: 'league',  label: 'League'  },
  { id: 'players', label: 'Players' },
  { id: 'trend',   label: 'Trend'   },
  { id: 'trades',  label: 'Trades'  },
  { id: 'scores',  label: 'Scores'  },
]

function LeagueView({ league, detail, loading, activeTab, onTabChange }: {
  league:       UserLeague
  detail:       LeagueDetail | null
  loading:      boolean
  activeTab:    LeagueTab
  onTabChange:  (t: LeagueTab) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* League header + tabs */}
      <div className="bg-[#0c0c1e] border-b border-white/[0.06] px-4 pt-3.5">
        <div className="flex items-center gap-3 mb-0">
          {/* League badge */}
          <div className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center text-base"
               style={{ background: 'linear-gradient(135deg, #1e3a5f, #0e4a6e)' }}>
            {league.sport === 'NFL' ? '🏈' : league.sport === 'NBA' ? '🏀' : '⚾'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-[15px] font-bold text-white">{league.name}</h2>
              <span className="text-[11px] text-white/40">
                {new Date().getFullYear()} {league.teamCount}-Team {league.format} {league.scoring}
              </span>
            </div>
          </div>
        </div>

        {/* Tab row */}
        <div className="flex mt-2 overflow-x-auto scrollbar-none">
          {LEAGUE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3.5 py-2 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-cyan-500'
                  : 'text-white/40 border-transparent hover:text-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-32 text-white/30 text-sm">
            Loading league data...
          </div>
        )}
        {!loading && (
          <>
            {activeTab === 'draft'   && <DraftTab   league={league} detail={detail}/>}
            {activeTab === 'team'    && <TeamTab    league={league} detail={detail}/>}
            {activeTab === 'league'  && <LeagueTab  league={league} detail={detail}/>}
            {activeTab === 'players' && <PlayersTab league={league} detail={detail}/>}
            {activeTab === 'trend'   && <TrendTab   league={league} detail={detail}/>}
            {activeTab === 'trades'  && <TradesTab  league={league} detail={detail}/>}
            {activeTab === 'scores'  && <ScoresTab  league={league} detail={detail}/>}
          </>
        )}
      </div>
    </div>
  )
}
```

---

## Step 6 — Build DraftTab (the default tab)

```tsx
function DraftTab({ league, detail }: { league: UserLeague; detail: LeagueDetail | null }) {
  const [copied, setCopied] = useState(false)
  const inviteUrl = `${window.location.origin}/join/${detail?.inviteToken ?? ''}`

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const teams = detail?.teams ?? []
  const claimedCount = teams.filter(t => !t.isOrphan && t.claimedByUserId).length

  return (
    <div className="space-y-4">

      {/* Invite banner (show if commissioner and league not full) */}
      {detail?.userRole === 'commissioner' && (
        <div className="rounded-xl border border-white/8 bg-[#0c0c1e] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[12px] font-semibold text-white">Invite friends to play</p>
              <span className="text-[10px] text-white/40">Copy the link and share with your friends</span>
            </div>
            <div className="text-[13px] font-bold text-cyan-400">
              {claimedCount} / {league.teamCount}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-white/50 truncate">
              {inviteUrl}
            </div>
            <button
              onClick={handleCopy}
              className="bg-cyan-500 text-black rounded-lg px-4 py-1.5 text-[11px] font-bold hover:bg-cyan-400 transition-colors">
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>
        </div>
      )}

      {/* Draftboard */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a237e, #283593)' }}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="text-[14px] font-bold text-white">Draftboard</h3>
              <p className="text-[10px] text-white/55 mt-0.5">
                {detail?.draftDate ? `Draft on ${detail.draftDate}` : 'Draft time has not yet been set'}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-sm">🌐</button>
              <button className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-sm">⚙️</button>
            </div>
          </div>

          {/* Timer */}
          <div className="bg-black/35 rounded-lg py-2.5 px-4 flex items-center justify-center gap-4 my-3">
            {['Days','Hrs','Mins','Secs'].map((label, i) => (
              <div key={label} className="flex items-center gap-4">
                {i > 0 && <span className="text-[18px] text-white/30 font-bold pb-2.5">:</span>}
                <div className="text-center">
                  <div className="text-[18px] font-bold text-white font-mono">—</div>
                  <div className="text-[8px] text-white/40 uppercase tracking-widest">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button className="bg-white/15 border border-white/25 rounded-lg px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-white/20 transition-colors">
              Mock Drafts
              <span className="block text-[9px] text-white/50 font-normal mt-0.5">Practice drafting</span>
            </button>
            {detail?.userRole === 'commissioner' && (
              <button className="bg-cyan-500 text-black rounded-lg px-5 py-2 text-[12px] font-bold hover:bg-cyan-400 transition-colors">
                Set Time
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Team list */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-2">Team</p>
        <div className="space-y-1.5">
          {teams.map((team, i) => (
            <div key={team.id} className="flex items-center gap-2.5 bg-[#0c0c1e] border border-white/[0.07] rounded-xl px-3 py-2.5">
              <span className="text-[13px] font-semibold text-white/25 w-4">{i + 1}</span>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm border ${
                team.isOrphan
                  ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400 text-[10px] font-bold'
                  : 'bg-white/8 border-white/10'
              }`}>
                {team.isOrphan ? 'O' : team.avatarUrl
                  ? <img src={`https://sleepercdn.com/avatars/${team.avatarUrl}`} className="w-full h-full rounded-full object-cover" alt=""/>
                  : team.ownerName[0]?.toUpperCase()
                }
              </div>
              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[12px] font-semibold ${team.isOrphan ? 'text-white/40' : 'text-white/85'}`}>
                    {team.teamName || team.ownerName}
                  </span>
                  <ManagerRoleBadge role={team.role}/>
                  {!team.isOrphan && team.ownerName !== team.teamName && (
                    <span className="text-[10px] text-white/35">{team.ownerName}</span>
                  )}
                </div>
                <div className={`text-[10px] mt-0.5 ${
                  team.isOrphan ? 'text-cyan-400' : 'text-white/35'
                }`}>
                  {team.isOrphan
                    ? 'Unclaimed — waiting for manager'
                    : team.draftPosition
                      ? `Draft position #${team.draftPosition}`
                      : 'No draft position'
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
```

---

## Step 7 — Build other tabs (stub them for now, expand later)

```tsx
function TeamTab({ league, detail }: TabProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] p-6 text-center">
      <p className="text-sm text-white/40">Team tab — roster and standings for {league.name}</p>
    </div>
  )
}

function LeagueTab({ league, detail }: TabProps) {
  // Show league settings: scoring rules, playoff structure, waiver type, etc.
  // Read from detail.settings — map to human-readable labels
  // Match the "League Settings" view from the screenshot
  return (
    <LeagueSettingsView settings={detail?.settings}/>
  )
}

// Stub the rest — expand in a follow-up session
function PlayersTab({ league, detail }: TabProps) { return <TabStub label="Players"/> }
function TrendTab({ league, detail }: TabProps) { return <TabStub label="Trend"/> }
function TradesTab({ league, detail }: TabProps) { return <TabStub label="Trades"/> }
function ScoresTab({ league, detail }: TabProps) { return <TabStub label="Scores"/> }

function TabStub({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
      <p className="text-sm text-white/30">{label} tab — coming soon</p>
    </div>
  )
}
```

---

## Step 8 — Build LeagueChat right panel

```tsx
function LeagueChat({ league }: { league: UserLeague }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input,    setInput]    = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch league chat messages from existing chat API
  // Read app/api/legacy/chat/route.ts to find the correct endpoint
  useEffect(() => {
    fetch(`/api/legacy/chat?leagueId=${league.id}&limit=50`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setMessages(d.messages ?? []))
      .catch(() => setMessages([]))
  }, [league.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    // POST to chat API
    // Add optimistic message to list
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/[0.06]">
        <h3 className="text-[12px] font-bold text-white">League Chat</h3>
        <button className="text-base opacity-50 hover:opacity-80 transition-opacity">🔊</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-2">
            <div className="w-[26px] h-[26px] rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center text-[10px] font-semibold text-white/60">
              {msg.authorName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-white/30 mb-0.5">
                {msg.authorName} · {msg.relativeTime}
              </div>
              {msg.isActivity ? (
                <p className="text-[10px] text-white/45 italic">
                  {msg.activityText}
                  {msg.playerName && (
                    <span className="font-semibold not-italic text-cyan-400/90"> {msg.playerName}</span>
                  )}
                </p>
              ) : (
                <p className="text-[11px] text-white/70 leading-relaxed">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-white/[0.06] flex items-center gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Enter message"
          className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 placeholder:text-white/25 focus:outline-none focus:border-white/20"
        />
        <button
          onClick={sendMessage}
          className="text-cyan-500 text-base px-1.5 hover:text-cyan-400 transition-colors">
          &#9658;
        </button>
      </div>
    </>
  )
}
```

---

## Step 9 — Create GET /api/league/detail/route.ts

The LeagueView needs more data than /api/league/list provides.
Create a new endpoint that returns:
- Full team list with roles, avatars, draft positions
- League settings (scoring, playoff config, waiver type)
- Active invite token (if user is commissioner)
- Draft info (date, type, status)
- User's role in this league

```typescript
// GET /api/league/detail?leagueId=X
// Returns full league detail for the league homepage view
// Auth required

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = new URL(req.url).searchParams.get('leagueId')
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: {
      teams: { orderBy: { externalId: 'asc' } },
      invites: {
        where: { isActive: true, createdBy: session.user.id },
        take: 1,
      }
    }
  })

  if (!league) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Verify user has access (is a member or the league owner)
  const userTeam = league.teams.find(t => t.claimedByUserId === session.user.id)
  const isOwner  = league.userId === session.user.id
  if (!userTeam && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({
    id:          league.id,
    name:        league.name,
    sport:       league.sport,
    format:      league.scoring,
    teamCount:   league.leagueSize,
    isDynasty:   league.isDynasty,
    settings:    league.settings,
    userRole:    userTeam?.role ?? (isOwner ? 'commissioner' : 'member'),
    inviteToken: league.invites[0]?.token ?? null,
    draftDate:   null,   // fetch from Sleeper if available
    teams: league.teams.map(t => ({
      id:             t.id,
      externalId:     t.externalId,
      teamName:       t.teamName,
      ownerName:      t.ownerName,
      avatarUrl:      t.avatarUrl,
      role:           t.role,
      isOrphan:       t.isOrphan,
      claimedByUserId: t.claimedByUserId,
      draftPosition:  null,   // from League.settings if stored
      wins:           t.wins,
      losses:         t.losses,
    }))
  })
}
```

---

## Step 10 — TypeScript interfaces

Add these to a shared types file or at the top of DashboardShell.tsx:

```typescript
interface UserLeague {
  id:         string
  name:       string
  platform:   string
  sport:      string
  format:     string
  scoring:    string
  teamCount:  number
  season:     string | number
  status?:    string
  sleeperLeagueId?: string
}

interface LeagueTeamSlot {
  id:              string
  externalId:      string
  teamName:        string
  ownerName:       string
  avatarUrl:       string | null
  role:            string
  isOrphan:        boolean
  claimedByUserId: string | null
  draftPosition:   number | null
  wins:            number
  losses:          number
}

interface LeagueDetail {
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
  teams:       LeagueTeamSlot[]
}

interface ChatMessage {
  id:           string
  authorName:   string
  authorAvatar: string | null
  text?:        string
  isActivity:   boolean
  activityText?: string
  playerName?:  string
  relativeTime: string
}

type LeagueTab = 'draft' | 'team' | 'league' | 'players' | 'trend' | 'trades' | 'scores'
type TabProps  = { league: UserLeague; detail: LeagueDetail | null }
```

---

## Step 11 — LeagueSettingsView for the League tab

Read the scoring/settings structure from League.settings in the schema.
Display it in the format from the screenshots:

```tsx
function LeagueSettingsView({ settings }: { settings?: Record<string, unknown> | null }) {
  if (!settings) return <TabStub label="League Settings"/>

  const scoring = settings.scoringSettings as Record<string, number> | undefined

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
          <div>
            <h3 className="text-sm font-bold text-white">League Settings</h3>
            {scoring && Object.keys(scoring).some(k => [
              'pass_int','bonus_rec_wr','bonus_rec_te'
            ].includes(k)) && (
              <p className="text-[10px] text-amber-400 mt-0.5">
                Some non-standard scoring settings highlighted
              </p>
            )}
          </div>
          <button className="text-white/40 hover:text-white/70">⚙️</button>
        </div>
        {/* Settings rows */}
        {[
          { label: 'Number of Teams',   value: settings.teamCount },
          { label: 'Playoffs',          value: settings.playoffTeams ? `${settings.playoffTeams} teams` : null },
          { label: 'Waiver Type',       value: settings.waiverType === 0 ? 'Free Agent' : settings.waiverType === 2 ? 'FAAB (Bidding)' : 'Standard' },
          { label: 'Trade Deadline',    value: settings.tradeDeadline ? `Week ${settings.tradeDeadline}` : 'None' },
          { label: 'IR Slots',          value: settings.reserveSlots },
          { label: 'Pick Trading',      value: settings.tradeDeadline !== 0 ? 'Yes' : 'No' },
        ].filter(r => r.value != null).map(row => (
          <div key={row.label} className="flex items-center justify-between px-5 py-3 border-b border-white/4 last:border-0">
            <span className="text-sm text-white/50">{row.label}</span>
            <span className="text-sm text-white/80">{String(row.value)}</span>
          </div>
        ))}
      </div>

      {/* Scoring section */}
      {scoring && (
        <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/6">
            <h3 className="text-sm font-bold text-white">Scoring</h3>
          </div>
          {/* Map scoring_settings to human-readable rows */}
          {/* Non-standard settings highlighted in amber */}
          <ScoringRows scoring={scoring}/>
        </div>
      )}
    </div>
  )
}
```

---

## Get Started section on Overview (no league selected)

The existing DashboardContent.tsx "Get Started" section should:
1. Be a collapsible checklist accordion
2. Auto-collapse (disappear to a settings page link) once all steps are done
3. Steps:
   - Import a league from Sleeper/Yahoo/etc.
   - Set up your profile
   - Invite your league
   - Run your first AI analysis

```tsx
function GetStartedChecklist({ steps }: { steps: ChecklistStep[] }) {
  const [expanded, setExpanded] = useState(true)
  const allDone = steps.every(s => s.done)

  if (allDone) return (
    <div className="text-xs text-white/30 text-right">
      Setup complete · <a href="/settings" className="text-cyan-400 hover:underline">Settings</a>
    </div>
  )

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c1e] overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-bold text-white">Get Started</span>
        <span className="text-white/40 text-lg">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="border-t border-white/6">
          {steps.map(step => (
            <div key={step.id} className={`flex items-center gap-3 px-4 py-3 border-b border-white/4 last:border-0 ${step.done ? 'opacity-50' : ''}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${step.done ? 'border-green-500 bg-green-500' : 'border-white/25'}`}>
                {step.done && <span className="text-[10px] text-white font-black">✓</span>}
              </div>
              <div className="flex-1">
                <div className="text-sm text-white/80">{step.label}</div>
                {step.description && <div className="text-[11px] text-white/40 mt-0.5">{step.description}</div>}
              </div>
              {!step.done && step.ctaHref && (
                <a href={step.ctaHref} className="text-xs text-cyan-400 hover:underline font-semibold">{step.ctaLabel ?? 'Start'}</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Final Checks

```bash
npx tsc --noEmit
```

Verify:
  - Selecting a league replaces center content (not navigation)
  - Right panel switches from Chimmy to league chat
  - League list scrolls independently
  - Center content scrolls independently
  - Mobile: hide sidebar (hamburger to toggle), chat collapses to icon
  - ManagerRoleBadge renders on team rows (C, CC, O)
  - Orphan teams show cyan O badge and "Unclaimed" text
  - Commissioner sees Invite banner + Set Time button
  - Non-commissioner hides those elements

Commit:
```bash
git add app/dashboard/
git add app/api/league/detail/
git add components/
git commit -m "feat: three-panel dashboard with league sidebar, league view tabs, and league chat"
```

---

## Constraints

- No new npm dependencies
- No any / no @ts-ignore
- Left sidebar and right chat are independent scroll containers
- League selection is client-side state — no page navigation
- All API calls use the existing auth pattern (getServerSession)
- DashboardContent.tsx (existing) becomes DashboardOverview for the no-league-selected state
- ChimmyChat stays intact — it just moves to the right panel when no league is selected
- The full-height three-panel layout works at 1024px+ wide
- At < 768px: sidebar collapses, chat hides to a floating button
