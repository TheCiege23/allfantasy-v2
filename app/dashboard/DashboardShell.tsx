'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, LayoutGrid, Menu, MessageSquare, X } from 'lucide-react'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { DashboardOverview } from './components/DashboardOverview'
import { LeftChatPanel } from './components/LeftChatPanel'
import { RightControlPanel } from './components/RightControlPanel'
import type { DashboardConnectedLeague, UserLeague } from './types'

type DashboardShellProps = {
  userId: string
  userName: string
  /** When set (e.g. /league/[id]), shell highlights this league in left + right panels */
  activeLeagueId?: string | null
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

function LeagueCenterContent({
  leagueId,
  league,
  leaguesLoading,
}: {
  leagueId: string
  league: UserLeague | null
  leaguesLoading: boolean
}) {
  if (leaguesLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-[#07071a] px-6">
        <p className="text-sm text-white/50">Loading league…</p>
      </div>
    )
  }

  if (!league) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-[#07071a] px-6 text-center">
        <p className="text-sm font-semibold text-white/70">League not found</p>
        <p className="mt-2 text-xs text-white/35">No league with id &quot;{leagueId}&quot; in your connected list.</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#07071a] [scrollbar-gutter:stable]">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-6 py-6">
        <p className="text-[10px] uppercase tracking-widest text-white/30">League workspace</p>
        <h1 className="text-2xl font-black text-white">{league.name}</h1>
        <p className="text-sm text-white/45">
          Draft, Team, League, Players, Trend, Trades, and Scores tabs will appear here (LEAGUE_PAGE_TASK).
        </p>
      </div>
    </div>
  )
}

export function DashboardShell({ userId, userName, activeLeagueId = null }: DashboardShellProps) {
  const router = useRouter()
  const [leagues, setLeagues] = useState<DashboardConnectedLeague[]>([])
  const [leaguesLoading, setLeaguesLoading] = useState(true)
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false)
  const [mobileRightOpen, setMobileRightOpen] = useState(false)

  const selectedLeague = useMemo((): UserLeague | null => {
    if (!activeLeagueId) return null
    const found = leagues.find((l) => l.id === activeLeagueId)
    return found ?? null
  }, [leagues, activeLeagueId])

  const handleSelectLeague = useCallback(
    (league: UserLeague | null) => {
      if (league) {
        router.push(`/league/${league.id}`)
      } else {
        router.push('/dashboard')
      }
    },
    [router]
  )

  useEffect(() => {
    const openMobileLeft = () => {
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
        setMobileLeftOpen(true)
      }
    }
    window.addEventListener('af-dashboard-open-mobile-left', openMobileLeft)
    return () => window.removeEventListener('af-dashboard-open-mobile-left', openMobileLeft)
  }, [])

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
        setLeaguesLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleTriggerImport = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('af-dashboard-open-import'))
    window.location.assign('/import')
  }

  const handleOpenChimmy = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('af-dashboard-open-chimmy'))
      window.dispatchEvent(new CustomEvent('af-dashboard-focus-left-chimmy'))
    }
    setMobileLeftOpen(true)
  }

  const isLeagueRoute = Boolean(activeLeagueId)

  return (
    <div data-dashboard-user-id={userId} className="flex h-screen w-full overflow-hidden bg-[#07071a] text-white">
      <aside className="hidden h-full md:flex">
        <LeftChatPanel
          selectedLeague={selectedLeague}
          userId={userId}
          rootId="dashboard-left-chat"
          leagues={leagues}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-white/[0.07] bg-[#0a0a1f] px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileLeftOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white"
              aria-label="Open chat"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold text-white/85">
                {isLeagueRoute ? selectedLeague?.name ?? 'League' : 'Dashboard'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileRightOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white"
              aria-label="Open AF Chat and leagues"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {isLeagueRoute && activeLeagueId ? (
            <LeagueCenterContent
              leagueId={activeLeagueId}
              league={selectedLeague}
              leaguesLoading={leaguesLoading}
            />
          ) : (
            <DashboardOverview
              userName={userName}
              leagues={leagues}
              onTriggerImport={handleTriggerImport}
              onOpenChimmy={handleOpenChimmy}
            />
          )}
        </div>
      </div>

      <aside className="hidden h-full min-w-0 overflow-hidden md:flex md:w-[300px] md:max-w-[300px] md:flex-shrink-0">
        <RightControlPanel
          leagues={leagues}
          leaguesLoading={leaguesLoading}
          selectedId={selectedLeague?.id ?? null}
          onSelectLeague={handleSelectLeague}
          userId={userId}
          onImport={handleTriggerImport}
        />
      </aside>

      <button
        type="button"
        onClick={() => setMobileLeftOpen(true)}
        className="fixed bottom-4 left-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:hidden"
        aria-label="Open chat"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => setMobileRightOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-black shadow-[0_10px_30px_rgba(6,182,212,0.35)] md:hidden"
        aria-label="Open AF Chat and leagues"
      >
        <Bot className="h-5 w-5" />
      </button>

      {mobileLeftOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden">
          <div className="absolute inset-x-0 bottom-0 flex h-[80vh] flex-col overflow-hidden rounded-t-[24px] border-t border-white/[0.07] bg-[#0a0a1f]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-white/30">Chat</p>
              <button
                type="button"
                onClick={() => setMobileLeftOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <LeftChatPanel
                selectedLeague={selectedLeague}
                userId={userId}
                rootId={null}
                leagues={leagues}
              />
            </div>
          </div>
        </div>
      ) : null}

      {mobileRightOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden">
          <div className="absolute inset-x-0 bottom-0 flex h-[85vh] flex-col overflow-hidden rounded-t-[24px] border-t border-white/[0.07] bg-[#0a0a1f]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-white/30">AF Chat &amp; Leagues</p>
              <button
                type="button"
                onClick={() => setMobileRightOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white"
                aria-label="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="h-full w-full max-w-none">
                <RightControlPanel
                  leagues={leagues}
                  leaguesLoading={leaguesLoading}
                  selectedId={selectedLeague?.id ?? null}
                  onSelectLeague={handleSelectLeague}
                  userId={userId}
                  onImport={handleTriggerImport}
                  onAfterLeagueNavigate={() => setMobileRightOpen(false)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {leaguesLoading ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center py-2">
          <div className="rounded-full border border-white/[0.07] bg-[#0c0c1e] px-3 py-1 text-xs text-white/60">
            Loading leagues...
          </div>
        </div>
      ) : null}
    </div>
  )
}
