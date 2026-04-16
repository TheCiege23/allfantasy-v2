'use client'

/**
 * Tournament league homepage mock — chat rail, championship hero, tabs, and workspace cards.
 * Static demo data; connect to tournament + league APIs when promoting to production.
 */

import { useMemo, useState } from 'react'
import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Crown,
  Eye,
  Flame,
  MessageSquare,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
  Link as LinkIcon,
} from 'lucide-react'

type DemoLeague = {
  id: number
  name: string
  phase: string
  teams: string
  active: boolean
}

type DemoChatMessage = {
  id: number
  user: string
  role: string
  text: string
  pinned?: boolean
}

type TabDef = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export default function TournamentLeagueHomepage() {
  const leagues = useMemo<DemoLeague[]>(
    () => [
      { id: 1, name: 'Black North', phase: 'Qualifier', teams: '10/12', active: true },
      { id: 2, name: 'Black South', phase: 'Qualifier', teams: '12/12', active: false },
      { id: 3, name: 'Gold East', phase: 'Qualifier', teams: '11/12', active: false },
      { id: 4, name: 'Gold West', phase: 'Qualifier', teams: '12/12', active: false },
      { id: 5, name: 'Elite Eight', phase: 'Locked', teams: '0/8', active: false },
    ],
    [],
  )

  const chatMessages = useMemo<DemoChatMessage[]>(
    () => [
      {
        id: 1,
        user: 'KingBuffalo',
        role: 'Commissioner',
        text: 'Welcome to Tournament Mode. Startup draft countdown is live. Please check your invite links and draft rooms.',
        pinned: true,
      },
      {
        id: 2,
        user: 'AF Bot',
        role: 'System',
        text: 'Top 64 per conference will advance after Week 9. W-L is primary, Points For is the tiebreaker.',
      },
      {
        id: 3,
        user: 'TheCiege',
        role: 'Manager',
        text: 'Can we get all Gold conference draft times posted in one card?',
      },
      {
        id: 4,
        user: 'KingBuffalo',
        role: 'Commissioner',
        text: 'Yep — grouped scheduling controls are coming. Use the Drafts tab to preview startup, redraft, and finals windows.',
      },
    ],
    [],
  )

  const tabs: TabDef[] = [
    { id: 'home', label: 'Home', icon: Trophy },
    { id: 'draft', label: 'Draft', icon: ClipboardList },
    { id: 'roster', label: 'Roster', icon: Shield },
    { id: 'waivers', label: 'Waivers', icon: Zap },
    { id: 'matchups', label: 'Matchups', icon: Swords },
    { id: 'standings', label: 'Standings', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const [activeTab, setActiveTab] = useState('home')
  const [isRailCollapsed, setIsRailCollapsed] = useState(false)
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]?.id ?? 1)
  const [message, setMessage] = useState('')

  const selectedLeagueData = leagues.find((l) => l.id === selectedLeague) ?? leagues[0]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_22%),radial-gradient(circle_at_top_right,rgba(239,68,68,0.14),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_18%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_45%,transparent_100%)] opacity-30" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[24%] top-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute right-[16%] top-24 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute bottom-10 left-[40%] h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-screen w-full">
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl lg:flex">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">League Chat</p>
              <h2 className="mt-1 text-lg font-semibold">Tournament Channel</h2>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2">
              <MessageSquare className="h-4 w-4 text-white/80" />
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
              <Search className="h-4 w-4 shrink-0" />
              <span>Search messages</span>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-2xl border p-3 ${
                  msg.pinned ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <span className="font-medium text-white/90">{msg.user}</span>
                  <span>•</span>
                  <span>{msg.role}</span>
                  {msg.pinned ? (
                    <>
                      <span>•</span>
                      <span className="text-amber-300">Pinned</span>
                    </>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-white/85">{msg.text}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
              <div className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Message tournament chat..."
                  className="w-full resize-none bg-transparent px-2 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
                <button
                  type="button"
                  className="rounded-xl bg-amber-400 px-3 py-2 text-slate-900 transition hover:bg-amber-300"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="relative overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(239,68,68,0.14)_38%,rgba(37,99,235,0.14)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.22),transparent_18%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.12),transparent_16%)] opacity-40" />
                <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/10 md:block" />

                <div className="relative grid gap-6 px-5 py-6 md:grid-cols-[1.2fr_1fr_auto] md:px-8 md:py-8">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-200/80">
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1">Tournament</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Presented By KingBuffalo</span>
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{selectedLeagueData?.name}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                      Championship battlefield mode with phased cuts, redrafts, league-wide standings, and bracket
                      progression. Startup shells, chat, standings, and draft boards are all live.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3 text-sm">
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-white/50">Current Phase</p>
                        <p className="mt-1 font-medium">{selectedLeagueData?.phase}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-white/50">Teams Filled</p>
                        <p className="mt-1 font-medium">{selectedLeagueData?.teams}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-white/50">Next Cut</p>
                        <p className="mt-1 font-medium">Week 9</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Clock3 className="h-4 w-4 text-amber-300" />
                        <span>Startup Draft</span>
                      </div>
                      <p className="mt-2 text-xl font-semibold">Aug 30 • 8:00 PM</p>
                      <p className="mt-1 text-sm text-white/55">Grouped with Black Conference</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Flame className="h-4 w-4 text-red-300" />
                        <span>Redraft Window</span>
                      </div>
                      <p className="mt-2 text-xl font-semibold">Week 10</p>
                      <p className="mt-1 text-sm text-white/55">Top conference qualifiers only</p>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 md:flex-col md:justify-start">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300"
                    >
                      <ClipboardList className="h-4 w-4" />
                      View Draft
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Standings
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-b border-white/10 px-3 py-2 sm:px-5">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm transition ${
                          isActive
                            ? 'bg-amber-400 font-semibold text-slate-900'
                            : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1.2fr_0.9fr]">
                <section className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Conference Rank</span>
                        <Crown className="h-4 w-4 text-amber-300" />
                      </div>
                      <p className="mt-3 text-3xl font-semibold">#3</p>
                      <p className="mt-2 text-sm text-emerald-300">Inside projected cut line</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Record</span>
                        <Shield className="h-4 w-4 text-blue-300" />
                      </div>
                      <p className="mt-3 text-3xl font-semibold">7–2</p>
                      <p className="mt-2 text-sm text-white/60">Primary sort = W-L</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Points For</span>
                        <Zap className="h-4 w-4 text-red-300" />
                      </div>
                      <p className="mt-3 text-3xl font-semibold">1,482.4</p>
                      <p className="mt-2 text-sm text-white/60">Tiebreaker priority</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60">League Overview</p>
                        <h3 className="mt-1 text-xl font-semibold">Operations Snapshot</h3>
                      </div>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                        Live
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <Users className="h-4 w-4 text-blue-300" />
                          <span>League Composition</span>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm text-white/80">
                          <li className="flex justify-between">
                            <span>Managers</span>
                            <span>12</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Conference</span>
                            <span>Black</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Invite Link</span>
                            <span className="text-amber-300">Active</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Draft Shell</span>
                            <span className="text-emerald-300">Built</span>
                          </li>
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <CalendarDays className="h-4 w-4 text-amber-300" />
                          <span>Phase Roadmap</span>
                        </div>
                        <div className="mt-4 space-y-3 text-sm">
                          {[
                            'Weeks 1–9 • Qualifier Phase',
                            'Week 10 • Redraft Window',
                            'Weeks 11–14 • Elimination Bracket',
                            'Week 15 • Finals League Draft',
                          ].map((item) => (
                            <div key={item} className="flex items-center gap-3">
                              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300" />
                              <span className="text-white/80">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60">League Tabs Preview</p>
                        <h3 className="mt-1 text-xl font-semibold">Homepage Workspace</h3>
                      </div>
                      <Eye className="h-5 w-5 text-white/40" aria-hidden />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {(
                        [
                          ['Draft Board', 'Startup room built and ready'],
                          ['Roster View', 'Starter + bench breakdown'],
                          ['Waiver Wire', 'FAAB and claim settings'],
                          ['Matchups', 'Live weekly game cards'],
                        ] as const
                      ).map(([title, desc]) => (
                        <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <p className="font-medium">{title}</p>
                          <p className="mt-2 text-sm leading-6 text-white/60">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60">Commissioner Activity</p>
                        <h3 className="mt-1 text-xl font-semibold">Action Center</h3>
                      </div>
                      <Bell className="h-5 w-5 text-amber-300" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        '3 leagues still need startup draft times assigned',
                        '2 invite links have open slots available',
                        '1 co-commissioner change request is waiting for approval',
                        'Universal tournament chat has 18 unread messages',
                      ].map((item, idx) => (
                        <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60">Quick Links</p>
                        <h3 className="mt-1 text-xl font-semibold">Commissioner Tools</h3>
                      </div>
                      <Sparkles className="h-5 w-5 text-blue-300" />
                    </div>
                    <div className="mt-4 grid gap-3">
                      {(
                        [
                          { icon: LinkIcon, label: 'Manage Invite Links' },
                          { icon: ClipboardList, label: 'Draft Scheduling' },
                          { icon: Users, label: 'League Assignments' },
                          { icon: Settings, label: 'Universal Settings' },
                        ] as const
                      ).map(({ icon: Icon, label }) => (
                        <button
                          key={label}
                          type="button"
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:bg-white/10"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Icon className="h-4 w-4 text-amber-300" />
                            {label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-white/40" />
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>

        <aside
          className={`hidden shrink-0 flex-col border-l border-white/10 bg-black/20 backdrop-blur-xl transition-all duration-300 xl:flex ${
            isRailCollapsed ? 'w-[72px]' : 'w-[300px]'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            {!isRailCollapsed ? (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">My Leagues</p>
                <h2 className="mt-1 text-lg font-semibold">League Rail</h2>
              </div>
            ) : (
              <span className="sr-only">My Leagues</span>
            )}
            <button
              type="button"
              onClick={() => setIsRailCollapsed((prev) => !prev)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
              aria-label={isRailCollapsed ? 'Expand league rail' : 'Collapse league rail'}
            >
              {isRailCollapsed ? (
                <ChevronLeft className="h-4 w-4 text-white/80" />
              ) : (
                <ChevronRight className="h-4 w-4 text-white/80" />
              )}
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {leagues.map((league) => {
              const isActive = league.id === selectedLeague
              return (
                <button
                  key={league.id}
                  type="button"
                  onClick={() => setSelectedLeague(league.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    isActive ? 'border-amber-300/30 bg-amber-300/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                      <Trophy className={`h-5 w-5 ${isActive ? 'text-amber-300' : 'text-white/70'}`} />
                    </div>
                    {!isRailCollapsed ? (
                      <div className="min-w-0">
                        <p className="truncate font-medium">{league.name}</p>
                        <p className="mt-1 text-xs text-white/55">
                          {league.phase} • {league.teams}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
