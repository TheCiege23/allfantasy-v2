'use client'

/**
 * Big Brother league homepage mock — house chat rail, neon hero, tabs, and control-room cards.
 * Static demo data; wire to `/api/leagues/[id]/big-brother/summary` and chat when promoting to production.
 */

import { useMemo, useState } from 'react'
import {
  Bell,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crown,
  DoorOpen,
  Eye,
  Home,
  MessageSquare,
  Mic,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  ScrollText,
  Star,
  Vote,
  Zap,
  Link as LinkIcon,
} from 'lucide-react'

type DemoLeague = {
  id: number
  name: string
  phase: string
  players: string
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

export default function BigBrotherLeagueHomepage() {
  const leagues = useMemo<DemoLeague[]>(
    () => [
      { id: 1, name: 'Big Brother: House of Chaos', phase: 'Eviction Week', players: '14/16', active: true },
      { id: 2, name: 'Big Brother: Power Shift', phase: 'HOH Week', players: '16/16', active: false },
      { id: 3, name: 'Big Brother: Jury House', phase: 'Jury', players: '9/16', active: false },
      { id: 4, name: 'Big Brother: Final Four Sim', phase: 'Final 4', players: '4/16', active: false },
      { id: 5, name: 'Big Brother: Finale Night', phase: 'Final 2', players: '2/16', active: false },
    ],
    [],
  )

  const chatMessages = useMemo<DemoChatMessage[]>(
    () => [
      {
        id: 1,
        user: 'KingBuffalo',
        role: 'Host',
        text: 'Eviction voting is open. Houseguests, please submit your vote before Thursday at 8 PM ET. HOH votes only in the event of a tie.',
        pinned: true,
      },
      {
        id: 2,
        user: 'AF Bot',
        role: 'System',
        text: 'Current HOH: Boston. Current nominees: Miami and Atlanta. Veto holder: Philly.',
      },
      {
        id: 3,
        user: 'ConnorDraftsEm',
        role: 'Co-Host',
        text: "Tonight's veto competition opens after SNF lock. @chimmy can process nominations, veto usage, and vote counting.",
      },
      {
        id: 4,
        user: 'TheCiege',
        role: 'Houseguest',
        text: 'Are nomination speeches posting before or after veto is finalized this week?',
      },
    ],
    [],
  )

  const tabs: TabDef[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'draft', label: 'Draft', icon: ClipboardList },
    { id: 'roster', label: 'Roster', icon: Shield },
    { id: 'waivers', label: 'Waivers', icon: Zap },
    { id: 'hoh', label: 'HOH', icon: Crown },
    { id: 'veto', label: 'Veto', icon: ShieldCheck },
    { id: 'voting', label: 'Voting', icon: Vote },
    { id: 'jury', label: 'Jury', icon: ScrollText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const [activeTab, setActiveTab] = useState('home')
  const [isRailCollapsed, setIsRailCollapsed] = useState(false)
  const [selectedLeague, setSelectedLeague] = useState(leagues[0]?.id ?? 1)
  const [message, setMessage] = useState('')

  const selectedLeagueData = leagues.find((l) => l.id === selectedLeague) ?? leagues[0]

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090a16] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.10),transparent_18%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_28%,rgba(0,0,0,0.35)_100%)] opacity-25" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[18%] top-10 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-[16%] top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-8 left-[45%] h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-screen w-full">
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-white/10 bg-black/25 backdrop-blur-xl lg:flex">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-violet-300/80">League Chat</p>
              <h2 className="mt-1 text-lg font-semibold">House Chat</h2>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-2">
              <MessageSquare className="h-4 w-4 text-white/80" />
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
              <Search className="h-4 w-4 shrink-0" />
              <span>Search house chat</span>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-2xl border p-3 ${
                  msg.pinned ? 'border-violet-400/30 bg-violet-400/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <span className="font-medium text-white/90">{msg.user}</span>
                  <span>•</span>
                  <span>{msg.role}</span>
                  {msg.pinned ? (
                    <>
                      <span>•</span>
                      <span className="text-violet-300">Pinned</span>
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
                  placeholder="Message the house..."
                  className="w-full resize-none bg-transparent px-2 py-1 text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
                <button
                  type="button"
                  className="rounded-xl bg-violet-400 px-3 py-2 text-slate-950 transition hover:bg-violet-300"
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
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(168,85,247,0.18)_42%,rgba(236,72,153,0.14)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(255,255,255,0.18),transparent_16%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.10),transparent_18%)] opacity-35" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(9,10,22,0.82))]" />
                <div className="absolute bottom-8 left-8 hidden items-center gap-3 opacity-30 lg:flex">
                  <Camera className="h-10 w-10 text-blue-200" aria-hidden />
                  <Crown className="h-10 w-10 text-violet-200" aria-hidden />
                  <Mic className="h-10 w-10 text-pink-200" aria-hidden />
                </div>

                <div className="relative grid gap-6 px-5 py-6 md:grid-cols-[1.2fr_1fr_auto] md:px-8 md:py-8">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.25em] text-violet-200/80">
                      <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1">Big Brother</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Presented By KingBuffalo</span>
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{selectedLeagueData?.name}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                      Power shifts weekly inside the house. Head of Household, veto ceremonies, nomination pressure, and
                      eviction night are all built into a live fantasy-social control room.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3 text-sm">
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-white/50">Current Phase</p>
                        <p className="mt-1 font-medium">{selectedLeagueData?.phase}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-white/50">Houseguests Left</p>
                        <p className="mt-1 font-medium">{selectedLeagueData?.players}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-white/50">Eviction Night</p>
                        <p className="mt-1 font-medium">Thu • 8:00 PM</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Crown className="h-4 w-4 text-violet-300" />
                        <span>Current HOH</span>
                      </div>
                      <p className="mt-2 text-xl font-semibold">Boston</p>
                      <p className="mt-1 text-sm text-white/55">Safe + nomination power</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <ShieldCheck className="h-4 w-4 text-emerald-300" />
                        <span>Veto Holder</span>
                      </div>
                      <p className="mt-2 text-xl font-semibold">Philly</p>
                      <p className="mt-1 text-sm text-white/55">Replacement rules active</p>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 md:flex-col md:justify-start">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-300"
                    >
                      <Vote className="h-4 w-4" />
                      Open Voting
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Veto Board
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
                            ? 'bg-violet-400 font-semibold text-slate-950'
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
                        <span className="text-sm text-white/60">Nominees</span>
                        <DoorOpen className="h-4 w-4 text-pink-300" />
                      </div>
                      <p className="mt-3 text-3xl font-semibold">2</p>
                      <p className="mt-2 text-sm text-white/60">Miami • Atlanta</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Votes Cast</span>
                        <Vote className="h-4 w-4 text-violet-300" />
                      </div>
                      <p className="mt-3 text-3xl font-semibold">8</p>
                      <p className="mt-2 text-sm text-white/60">Hidden until reveal</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Jury Seats</span>
                        <ScrollText className="h-4 w-4 text-blue-300" />
                      </div>
                      <p className="mt-3 text-3xl font-semibold">5</p>
                      <p className="mt-2 text-sm text-white/60">Final 2 determines winner</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60">House Overview</p>
                        <h3 className="mt-1 text-xl font-semibold">Power Week Snapshot</h3>
                      </div>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                        Live
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <Crown className="h-4 w-4 text-violet-300" />
                          <span>Power Board</span>
                        </div>
                        <ul className="mt-4 space-y-2 text-sm text-white/80">
                          <li className="flex justify-between">
                            <span>HOH</span>
                            <span>Boston</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Nominees</span>
                            <span>Miami / Atlanta</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Veto</span>
                            <span>Philly</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Tie Break</span>
                            <span>HOH decides</span>
                          </li>
                        </ul>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <CalendarDays className="h-4 w-4 text-violet-300" />
                          <span>House Roadmap</span>
                        </div>
                        <div className="mt-4 space-y-3 text-sm">
                          {[
                            'Tuesday • HOH room closes',
                            'Wednesday • Veto ceremony lock',
                            'Thursday 8 PM • Eviction vote reveal',
                            'Thursday 9 PM • New HOH competition',
                            'Weekend • Twist window / secret power check',
                          ].map((item) => (
                            <div key={item} className="flex items-center gap-3">
                              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-300" />
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
                        <p className="text-sm text-white/60">Big Brother Workspace</p>
                        <h3 className="mt-1 text-xl font-semibold">Core Modules</h3>
                      </div>
                      <Eye className="h-5 w-5 text-white/40" aria-hidden />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {(
                        [
                          ['HOH Room', 'Private nomination flow, safety status, and replacement options'],
                          ['Veto Board', 'Competition results, use/hold choice, and renomination state'],
                          ['Eviction Voting', 'Private vote intake with tie handling and reveal flow'],
                          ['Jury House', 'Question prompts, speeches, and finale vote storage'],
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
                        <p className="text-sm text-white/60">Host Activity</p>
                        <h3 className="mt-1 text-xl font-semibold">Control Room</h3>
                      </div>
                      <Bell className="h-5 w-5 text-violet-300" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {[
                        '1 pending veto decision must be resolved before nominations lock',
                        '2 houseguests still have not cast eviction votes',
                        "Power rankings update after tonight's challenge results",
                        'Secret twist window opens if commissioner enables double eviction',
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
                        <p className="text-sm text-white/60">Quick Actions</p>
                        <h3 className="mt-1 text-xl font-semibold">Commissioner Tools</h3>
                      </div>
                      <Sparkles className="h-5 w-5 text-blue-300" />
                    </div>
                    <div className="mt-4 grid gap-3">
                      {(
                        [
                          { icon: Crown, label: 'Open HOH Panel' },
                          { icon: ShieldCheck, label: 'Manage Veto Ceremony' },
                          { icon: Vote, label: 'Review Vote Intake' },
                          { icon: LinkIcon, label: 'Share League Invite' },
                        ] as const
                      ).map(({ icon: Icon, label }) => (
                        <button
                          key={label}
                          type="button"
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:bg-white/10"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Icon className="h-4 w-4 text-violet-300" />
                            {label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-white/40" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60">House Pulse</p>
                        <h3 className="mt-1 text-xl font-semibold">Power Read</h3>
                      </div>
                      <Star className="h-5 w-5 text-pink-300" />
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-white/80">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="font-medium text-white">Backdoor Risk</p>
                        <p className="mt-1 text-white/60">
                          Miami is at the highest risk if veto is used and renom options widen.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="font-medium text-white">Alliance Tension</p>
                        <p className="mt-1 text-white/60">
                          Two blocs appear split 5–4 with one floating vote still unclaimed.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="font-medium text-white">AI Note</p>
                        <p className="mt-1 text-white/60">
                          @chimmy can process HOH results, veto usage, eviction votes, and tie-break handling.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>

        <aside
          className={`hidden shrink-0 flex-col border-l border-white/10 bg-black/25 backdrop-blur-xl transition-all duration-300 xl:flex ${
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
                    isActive ? 'border-violet-300/30 bg-violet-300/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                      <Home className={`h-5 w-5 ${isActive ? 'text-violet-300' : 'text-white/70'}`} />
                    </div>
                    {!isRailCollapsed ? (
                      <div className="min-w-0">
                        <p className="truncate font-medium">{league.name}</p>
                        <p className="mt-1 text-xs text-white/55">
                          {league.phase} • {league.players}
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
