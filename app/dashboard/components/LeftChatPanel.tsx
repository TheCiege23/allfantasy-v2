'use client'

import { ChevronDown, ChevronRight, Inbox, MessageCircle, Users, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ChimmyChat from '@/app/components/ChimmyChat'
import { DiscordIcon } from '@/app/components/icons/DiscordIcon'
import type { LeftChatPanelLayoutProps, UserLeague } from '../types'
import { LeagueAvatar } from './LeagueAvatar'
import { LeagueChatInPanel } from './LeagueChatInPanel'

function ChimmyLeagueContextBar({
  leagues,
  activeLeagueId,
  onSelect,
}: {
  leagues: UserLeague[]
  activeLeagueId: string | null
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const active = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0]
  if (!active) return null

  return (
    <div ref={wrapRef} className="relative">
      <p className="mb-1 text-[8px] text-white/30">Asking about:</p>
      <button
        type="button"
        onClick={() => {
          if (leagues.length > 1) setOpen((o) => !o)
        }}
        className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/90"
      >
        <LeagueAvatar league={active} size={22} />
        <span className="min-w-0 flex-1 truncate text-left">{active.name}</span>
        {leagues.length > 1 ? (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-white/45 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        ) : null}
      </button>
      {open && leagues.length > 1 ? (
        <div
          className="absolute bottom-full left-0 z-50 mb-1 max-h-64 min-w-[200px] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0c0c1e] py-1 shadow-lg"
          role="listbox"
        >
          {leagues.map((l) => (
            <button
              key={l.id}
              type="button"
              role="option"
              aria-selected={l.id === activeLeagueId}
              onClick={() => {
                onSelect(l.id)
                setOpen(false)
              }}
              className={`flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors hover:bg-white/[0.06] ${
                l.id === activeLeagueId
                  ? 'bg-cyan-500/15 text-cyan-200'
                  : 'text-white/80'
              }`}
            >
              <LeagueAvatar league={l} size={22} />
              <span className="min-w-0 flex-1 truncate">{l.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

type LeftTab = 'league' | 'chimmy' | 'af_huddle' | 'dms'

/** Position-style avatar fallback colors (aligned with `PlayerImage` positionBgClass). */
function dmAvatarBgClass(name: string, index: number): string {
  const p = name.trim()
  let h = 0
  for (let i = 0; i < p.length; i++) h = (h + p.charCodeAt(i) * (i + 1)) % 7
  h = (h + index) % 7
  const classes = [
    'bg-red-500/80',
    'bg-green-500/80',
    'bg-blue-500/80',
    'bg-orange-500/80',
    'bg-purple-500/80',
    'bg-indigo-500/80',
    'bg-slate-500/80',
  ]
  return classes[h] ?? 'bg-slate-500/80'
}

function initialsFromDisplayName(name: string): string {
  const n = name.trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  if (n.length >= 2) return n.slice(0, 2).toUpperCase()
  return (n[0]! + n[0]!).toUpperCase()
}

const DM_STUB_ROWS = [
  {
    name: 'TheCiege24',
    preview: 'You seeing these waiver moves?',
    time: '2m ago',
    unread: 2 as number | null,
  },
  {
    name: 'PoloGlizzy',
    preview: 'Bro that trade was robbery',
    time: '1h ago',
    unread: null as number | null,
  },
  {
    name: 'tomwh',
    preview: 'Running it back next year 🔥',
    time: 'Yesterday',
    unread: null as number | null,
  },
] as const

export function LeftChatPanel({
  selectedLeague,
  activeLeagueId: activeLeagueIdProp = null,
  userId,
  userDisplayName,
  userImage,
  rootId = 'dashboard-left-chat',
  leagues = [],
  discordConnected = false,
}: LeftChatPanelLayoutProps) {
  const [activeTab, setActiveTab] = useState<LeftTab>('chimmy')
  const [activeChimmyLeagueId, setActiveChimmyLeagueId] = useState<string | null>(null)
  /** Tracks last right-panel/route league we synced so `leagues` refetches do not override a manual Chimmy pick */
  const lastSyncedRightPanelLeagueRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedLeague) {
      setActiveTab('league')
    } else {
      setActiveTab('chimmy')
    }
  }, [selectedLeague?.id])

  useEffect(() => {
    const focusChimmy = () => setActiveTab('chimmy')
    window.addEventListener('af-dashboard-focus-left-chimmy', focusChimmy)
    return () => window.removeEventListener('af-dashboard-focus-left-chimmy', focusChimmy)
  }, [])

  useEffect(() => {
    if (leagues.length === 0) {
      setActiveChimmyLeagueId(null)
      return
    }
    if (activeLeagueIdProp) return
    setActiveChimmyLeagueId((prev) => {
      if (prev && leagues.some((l) => l.id === prev)) return prev
      return leagues[0]?.id ?? null
    })
  }, [leagues, activeLeagueIdProp])

  useEffect(() => {
    if (activeLeagueIdProp == null || activeLeagueIdProp === '') {
      lastSyncedRightPanelLeagueRef.current = null
      return
    }
    if (!leagues.some((l) => l.id === activeLeagueIdProp)) return
    if (lastSyncedRightPanelLeagueRef.current === activeLeagueIdProp) return
    lastSyncedRightPanelLeagueRef.current = activeLeagueIdProp
    setActiveChimmyLeagueId(activeLeagueIdProp)
  }, [activeLeagueIdProp, leagues])

  const activeChimmyLeague =
    leagues.find((l) => l.id === activeChimmyLeagueId) ?? leagues[0] ?? null

  return (
    <div
      id={rootId ?? undefined}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0a0a1f]"
    >
      <div className="flex shrink-0 border-b border-white/[0.07]">
        <button
          type="button"
          onClick={() => setActiveTab('league')}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 py-2.5 text-center text-[11px] font-semibold transition-colors ${
            activeTab === 'league'
              ? 'border-b-2 border-cyan-500 bg-white/[0.03] text-white'
              : 'border-b-2 border-transparent text-white/40 hover:text-white/60'
          }`}
          aria-label="League chat tab"
        >
          🏈 League
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chimmy')}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 py-2.5 text-center text-[11px] font-semibold transition-colors ${
            activeTab === 'chimmy'
              ? 'border-b-2 border-cyan-500 bg-white/[0.03] text-white'
              : 'border-b-2 border-transparent text-white/40 hover:text-white/60'
          }`}
          aria-label="Chimmy tab"
        >
          🤖 Chimmy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('af_huddle')}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 py-2.5 text-center text-[11px] font-semibold transition-colors ${
            activeTab === 'af_huddle'
              ? 'border-b-2 border-cyan-500 bg-white/[0.03] text-white'
              : 'border-b-2 border-transparent text-white/40 hover:text-white/60'
          }`}
          aria-label="AF Huddle tab"
        >
          <Users className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
          AF Huddle
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dms')}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 py-2.5 text-center text-[11px] font-semibold transition-colors ${
            activeTab === 'dms'
              ? 'border-b-2 border-cyan-500 bg-white/[0.03] text-white'
              : 'border-b-2 border-transparent text-white/40 hover:text-white/60'
          }`}
          aria-label="Direct messages tab"
        >
          <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
          DMs
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'league' && selectedLeague ? (
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-3 py-2">
              <p className="text-[11px] font-semibold text-white/90">League Chat</p>
              <button
                type="button"
                title="Mute (coming soon)"
                className="rounded-lg p-1.5 text-white/35 transition hover:bg-white/[0.06] hover:text-white/55"
                aria-label="Mute league chat"
              >
                <VolumeX className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <LeagueChatInPanel
                selectedLeague={selectedLeague}
                userId={userId}
                userDisplayName={userDisplayName}
                userImage={userImage}
                onAskChimmy={() => setActiveTab('chimmy')}
              />
            </div>
          </div>
        ) : null}

        {activeTab === 'league' && !selectedLeague ? (
          <div className="flex min-h-[140px] flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
            <ChevronRight className="h-5 w-5 text-white/25" aria-hidden />
            <p className="text-[13px] text-white/40">Select a league to view chat</p>
          </div>
        ) : null}

        {activeTab === 'chimmy' ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-1">
            <div className="flex shrink-0 justify-end pb-1">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('af-chimmy-new-conversation'))}
                className="rounded-lg border border-white/[0.08] bg-transparent px-2 py-1 text-[10px] font-semibold text-white/50 transition hover:bg-white/[0.06] hover:text-white/90"
                title="New conversation"
              >
                New
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden" data-chimmy-league-id={activeChimmyLeagueId ?? undefined}>
              <ChimmyChat
                embedded
                parentControlsNew
                chipContextLeagueName={activeChimmyLeague?.name ?? null}
                footerSlot={
                  leagues.length > 0 ? (
                    <ChimmyLeagueContextBar
                      leagues={leagues}
                      activeLeagueId={activeChimmyLeagueId}
                      onSelect={setActiveChimmyLeagueId}
                    />
                  ) : null
                }
                panelFill
              />
            </div>
          </div>
        ) : null}

        {activeTab === 'af_huddle' ? (
          <div className="flex h-full min-h-0 items-center justify-center px-4 text-center">
            <p className="text-[12px] text-white/35">No group chats yet</p>
          </div>
        ) : null}

        {activeTab === 'dms' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 [scrollbar-gutter:stable]">
            <div className="space-y-0">
              {DM_STUB_ROWS.map((row, index) => (
                <div
                  key={row.name}
                  className="flex cursor-default items-center gap-2.5 border-b border-white/[0.05] py-3 last:border-b-0"
                >
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white ${dmAvatarBgClass(row.name, index)}`}
                      aria-hidden
                    >
                      {initialsFromDisplayName(row.name)}
                    </div>
                    {row.unread != null ? (
                      <span
                        className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
                        aria-label={`${row.unread} unread`}
                      >
                        {row.unread}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[12px] font-semibold text-white/90">{row.name}</p>
                    <p className="truncate text-[10px] text-white/40">{row.preview}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-white/30">{row.time}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center">
              <Inbox className="mb-2 h-8 w-8 text-white/25" strokeWidth={1.5} aria-hidden />
              <p className="text-[13px] font-semibold text-white/45">No other DMs yet</p>
              <p className="mt-1 max-w-[220px] text-[11px] text-white/30">Start a conversation with a league member</p>
            </div>

            {discordConnected ? (
              <div className="mt-3 border-t border-white/[0.05] pt-3">
                <p className="mb-2 text-center text-[10px] text-white/30">Message league managers directly on Discord</p>
                <a
                  href="https://discord.com/channels/@me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#5865F2]/10 py-2 text-[11px] font-semibold text-[#5865F2] transition-colors hover:bg-[#5865F2]/20"
                >
                  <DiscordIcon size={12} />
                  Open Discord DMs
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
