'use client'

import { Bot, ChevronDown, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ChimmyChat from '@/app/components/ChimmyChat'
import { DASHBOARD_LEFT_PANEL_WIDTH } from '../types'
import type { LeftChatPanelLayoutProps, UserLeague } from '../types'
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

  const label = active.name.length > 12 ? `${active.name.slice(0, 12)}…` : active.name

  return (
    <div ref={wrapRef} className="relative">
      <p className="mb-1 text-[8px] text-white/30">Asking about:</p>
      <button
        type="button"
        onClick={() => {
          if (leagues.length > 1) setOpen((o) => !o)
        }}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/90"
      >
        <span className="truncate">{label}</span>
        {leagues.length > 1 ? (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-white/45 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        ) : null}
      </button>
      {open && leagues.length > 1 ? (
        <div
          className="absolute left-0 top-full z-20 mt-1 max-h-48 min-w-[160px] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#0c0c1e] py-1 shadow-lg"
          role="listbox"
        >
          {leagues.map((l) => (
            <button
              key={l.id}
              type="button"
              role="option"
              onClick={() => {
                onSelect(l.id)
                setOpen(false)
              }}
              className={`block w-full truncate px-3 py-2 text-left text-[11px] hover:bg-white/[0.06] ${
                l.id === activeLeagueId ? 'text-cyan-300' : 'text-white/80'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

type LeftTab = 'league' | 'chimmy' | 'groups'

const TABS: Array<{ id: LeftTab; label: string }> = [
  { id: 'league', label: '🏈 League' },
  { id: 'chimmy', label: '🤖 Chimmy' },
  { id: 'groups', label: '👥 Groups' },
]

export function LeftChatPanel({
  selectedLeague,
  userId,
  width = DASHBOARD_LEFT_PANEL_WIDTH,
  rootId = 'dashboard-left-chat',
  leagues = [],
}: LeftChatPanelLayoutProps) {
  const [activeTab, setActiveTab] = useState<LeftTab>('chimmy')
  const [activeChimmyLeagueId, setActiveChimmyLeagueId] = useState<string | null>(null)

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
    setActiveChimmyLeagueId((prev) => {
      if (prev && leagues.some((l) => l.id === prev)) return prev
      return leagues[0]?.id ?? null
    })
  }, [leagues])

  const modeDashboard = selectedLeague === null
  const activeChimmyLeague =
    leagues.find((l) => l.id === activeChimmyLeagueId) ?? leagues[0] ?? null

  return (
    <div
      id={rootId ?? undefined}
      className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.07] bg-[#0a0a1f]"
      style={{ maxWidth: width }}
    >
      {modeDashboard ? (
        <div className="flex min-h-0 flex-1 flex-col p-2">
          <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-1 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                <Bot className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">Chimmy</p>
                <p className="text-[10px] text-white/35">AI assistant</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('af-chimmy-new-conversation'))}
              className="shrink-0 rounded-lg border border-white/[0.08] bg-transparent px-2 py-1 text-[10px] font-semibold text-white/50 transition hover:bg-white/[0.06] hover:text-white/90"
              title="New conversation"
            >
              New
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden pt-2">
            <div data-chimmy-league-id={activeChimmyLeagueId ?? undefined}>
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
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-shrink-0 border-b border-white/[0.07]">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 text-center text-[11px] font-semibold transition-colors ${
                    isActive ? 'border-b-2 border-cyan-500 bg-white/[0.04] text-white' : 'text-white/40 hover:text-white/65'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {activeTab === 'league' && selectedLeague ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-shrink-0 items-center justify-between border-b border-white/[0.07] px-3 py-2">
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
                <div className="min-h-0 flex-1 overflow-hidden">
                  <LeagueChatInPanel
                    selectedLeague={selectedLeague}
                    userId={userId}
                    onAskChimmy={() => setActiveTab('chimmy')}
                  />
                </div>
              </div>
            ) : null}

            {activeTab === 'chimmy' ? (
              <div className="flex h-full min-h-0 flex-col p-2">
                <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-1 pb-2">
                  <p className="text-xs font-semibold text-white/85">Chimmy</p>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('af-chimmy-new-conversation'))}
                    className="shrink-0 rounded-lg border border-white/[0.08] bg-transparent px-2 py-1 text-[10px] font-semibold text-white/50 transition hover:bg-white/[0.06] hover:text-white/90"
                    title="New conversation"
                  >
                    New
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden pt-2">
                  <div data-chimmy-league-id={activeChimmyLeagueId ?? undefined}>
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
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'groups' ? (
              <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center">
                <p className="text-[12px] text-white/35">No group chats yet</p>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
