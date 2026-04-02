'use client'

import { useEffect, useState } from 'react'
import { Bot, LayoutGrid, Menu, MessageSquare, X } from 'lucide-react'
import ChimmyChat from '@/app/components/ChimmyChat'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { AFChatPanel } from './components/AFChatPanel'
import { DashboardOverview } from './components/DashboardOverview'
import { LeagueListPanel } from './components/LeagueListPanel'
import type { DashboardConnectedLeague, UserLeague } from './types'

type DashboardShellProps = {
  userId: string
  userName: string
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function toNumberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toBooleanValue(value: unknown): boolean {
  return value === true
}

function mapLeague(rawValue: unknown): DashboardConnectedLeague | null {
  const raw = toRecord(rawValue)
  if (!raw) return null

  const sourceLeagueId = toStringValue(raw.id)
  const selectedLeagueId =
    toStringValue(raw.navigationLeagueId) ||
    toStringValue(raw.unifiedLeagueId) ||
    sourceLeagueId

  if (!selectedLeagueId) return null

  const sport =
    normalizeToSupportedSport(toStringValue(raw.sport) || toStringValue(raw.sport_type)) ?? DEFAULT_SPORT
  const platform = toStringValue(raw.platform, 'allfantasy')
  const platformLeagueId = toStringValue(raw.platformLeagueId) || null

  return {
    id: selectedLeagueId,
    sourceLeagueId: sourceLeagueId || selectedLeagueId,
    name: toStringValue(raw.name, 'Unnamed League'),
    platform,
    sport,
    format:
      toStringValue(raw.leagueVariant) ||
      toStringValue(raw.league_variant) ||
      (toBooleanValue(raw.isDynasty) ? 'dynasty' : 'redraft'),
    scoring: toStringValue(raw.scoring, 'Standard'),
    teamCount: toNumberValue(raw.leagueSize ?? raw.totalTeams),
    season: toStringValue(raw.season) || String(new Date().getFullYear()),
    status: toStringValue(raw.status) || toStringValue(raw.syncStatus),
    isDynasty: toBooleanValue(raw.isDynasty),
    settings: undefined,
    sleeperLeagueId: platform === 'sleeper' ? platformLeagueId ?? undefined : undefined,
    syncStatus: toStringValue(raw.syncStatus) || null,
    avatarUrl: toStringValue(raw.avatarUrl) || null,
    platformLeagueId,
  }
}

function getStatusLabel(status: string | undefined) {
  const value = String(status || '').toLowerCase()
  if (value.includes('draft')) return 'Pre-Draft'
  if (value.includes('season') || value.includes('active') || value.includes('live')) return 'Active'
  if (value.includes('complete') || value.includes('final')) return 'Completed'
  return 'Off-Season'
}

function getLeagueSubtitle(league: UserLeague) {
  const format = league.format ? league.format.replace(/_/g, ' ') : 'league'
  const formatted = format.charAt(0).toUpperCase() + format.slice(1)
  return `${formatted} · ${league.teamCount} teams`
}

function SelectedLeagueCenter({
  league,
  onBack,
}: {
  league: UserLeague
  onBack: () => void
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#07071a] p-4 md:p-5 [scrollbar-gutter:stable]">
      <div className="space-y-4">
        <section className="rounded-[24px] border border-white/[0.07] bg-[#0c0c1e] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.08em] text-white/30">League Workspace</p>
              <h2 className="mt-2 text-2xl font-black text-white">{league.name}</h2>
              <p className="mt-2 text-sm text-white/60">
                {league.season} · {getLeagueSubtitle(league)} · {getStatusLabel(league.status)}
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Overview
            </button>
          </div>
        </section>

        <section className="rounded-[24px] border border-white/[0.07] bg-[#0c0c1e] p-5">
          <p className="text-[10px] uppercase tracking-[0.08em] text-white/30">Phase 1 Center Panel</p>
          <p className="mt-3 text-sm text-white/70">
            The shell is now league-aware. Phase 5 will replace this placeholder with the full
            Draft, Team, League, Players, Trend, Trades, and Scores tabs for the selected league.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {['Draft', 'Team', 'League', 'Players', 'Trend', 'Trades', 'Scores'].map((tab) => (
              <div key={tab} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/75">
                {tab}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export function DashboardShell({ userId, userName }: DashboardShellProps) {
  const [selectedLeague, setSelectedLeague] = useState<UserLeague | null>(null)
  const [leagues, setLeagues] = useState<DashboardConnectedLeague[]>([])
  const [loadingLeagues, setLoadingLeagues] = useState(true)
  const [mobileLeagueListOpen, setMobileLeagueListOpen] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [chatPanelVersion, setChatPanelVersion] = useState(0)

  useEffect(() => {
    let active = true
    fetch('/api/league/list', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load leagues'))))
      .then((payload: unknown) => {
        if (!active) return
        const root = toRecord(payload)
        const rawLeagues =
          Array.isArray(root?.leagues) ? root?.leagues : Array.isArray(payload) ? payload : []
        const nextLeagues = rawLeagues
          .map((league) => mapLeague(league))
          .filter((league): league is DashboardConnectedLeague => Boolean(league))
        setLeagues(nextLeagues)
      })
      .catch(() => {
        if (!active) return
        setLeagues([])
      })
      .finally(() => {
        if (!active) return
        setLoadingLeagues(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedLeague) return
    const stillExists = leagues.some((league) => league.id === selectedLeague.id)
    if (!stillExists) {
      setSelectedLeague(null)
    }
  }, [leagues, selectedLeague])

  const selectedLeagueLabel = selectedLeague?.name ?? 'AF Chat'

  const handleTriggerImport = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('af-dashboard-open-import'))
    window.location.assign('/import')
  }

  const handleOpenChimmy = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('af-dashboard-open-chimmy'))
    }
    setChatPanelVersion((current) => current + 1)
    setMobileChatOpen(true)
  }

  return (
    <div data-dashboard-user-id={userId} className="flex h-screen overflow-hidden bg-[#07071a] text-white">
      <aside className="hidden h-full w-[200px] flex-shrink-0 border-r border-white/[0.07] bg-[#0a0a1f] md:flex">
        <LeagueListPanel
          leagues={leagues}
          selectedId={selectedLeague?.id ?? null}
          onSelect={setSelectedLeague}
          loading={loadingLeagues}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-white/[0.07] bg-[#0a0a1f] px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileLeagueListOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white"
              aria-label="Open league list"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold text-white/85">{selectedLeagueLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileChatOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white"
              aria-label="Open AF Chat"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {selectedLeague ? (
            <SelectedLeagueCenter league={selectedLeague} onBack={() => setSelectedLeague(null)} />
          ) : (
            <DashboardOverview
              userName={userName}
              leagues={leagues}
              onSelectLeague={setSelectedLeague}
              onTriggerImport={handleTriggerImport}
              onOpenChimmy={handleOpenChimmy}
            />
          )}
        </div>
      </div>

      <div className="hidden md:flex">
        <AFChatPanel
          key={`desktop-chat-${chatPanelVersion}`}
          selectedLeague={selectedLeague}
          userId={userId}
          leagues={leagues}
          onSelectLeague={setSelectedLeague}
          loadingLeagues={loadingLeagues}
        />
      </div>

      <button
        type="button"
        onClick={() => setMobileLeagueListOpen(true)}
        className="fixed bottom-4 left-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:hidden"
        aria-label="Open league list"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => setMobileChatOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-black shadow-[0_10px_30px_rgba(6,182,212,0.35)] md:hidden"
        aria-label="Open AF Chat"
      >
        {selectedLeague ? <MessageSquare className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>

      {mobileLeagueListOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden">
          <div className="absolute inset-x-0 bottom-0 flex h-[70vh] flex-col overflow-hidden rounded-t-[24px] border-t border-white/[0.07] bg-[#0a0a1f]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-white/30">League List</p>
              <button
                type="button"
                onClick={() => setMobileLeagueListOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white"
                aria-label="Close league list"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <LeagueListPanel
                leagues={leagues}
                selectedId={selectedLeague?.id ?? null}
                onSelect={(league) => {
                  setSelectedLeague(league)
                  setMobileLeagueListOpen(false)
                }}
                loading={loadingLeagues}
              />
            </div>
          </div>
        </div>
      ) : null}

      {mobileChatOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden">
          <div className="absolute inset-x-0 bottom-0 h-[75vh] overflow-hidden rounded-t-[24px] border-t border-white/[0.07] bg-[#0a0a1f]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-white/30">AF Chat</p>
                <p className="mt-1 text-sm font-semibold text-white/80">
                  {selectedLeague ? selectedLeague.name : 'Chimmy'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileChatOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white"
                aria-label="Close AF Chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 h-[calc(75vh-73px)] overflow-hidden p-2">
              {selectedLeague ? (
                <div className="h-full overflow-y-auto rounded-3xl border border-white/[0.07] bg-[#0c0c1e] p-4 [scrollbar-gutter:stable]">
                  <p className="text-sm font-semibold text-white">League chat context ready</p>
                  <p className="mt-2 text-sm text-white/60">
                    AF Chat tabs and live league messaging arrive in Phase 3. The shell and mobile
                    chat entry point are in place now.
                  </p>
                </div>
              ) : (
                <ChimmyChat />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {loadingLeagues ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center py-2">
          <div className="rounded-full border border-white/[0.07] bg-[#0c0c1e] px-3 py-1 text-xs text-white/60">
            Loading leagues...
          </div>
        </div>
      ) : null}
    </div>
  )
}
