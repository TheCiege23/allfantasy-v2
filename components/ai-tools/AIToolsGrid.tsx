'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeftRight,
  Crosshair,
  Crown,
  Flame,
  Shield,
  ShieldAlert,
  Swords,
  Target,
  Sparkles,
} from 'lucide-react'
import { getChimmyChatHref } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import type { UserLeague } from '@/app/dashboard/types'
import { formatInjuryAvailabilitySummary } from '@/lib/injury-impact-dashboard/formatAvailabilitySummary'
import type { InjuryImpactDashboardResult } from '@/lib/injury-impact-dashboard/types'
import type { WarRoomCommandCenterResult } from '@/lib/war-room-command-center/types'
import type { MatchupPrepDashboardResult } from '@/lib/matchup-prep-dashboard/types'
import { isSupportedSport } from '@/lib/sport-scope'
import { AIToolCard } from './AIToolCard'
import type { AIToolCardConfig, FreshnessBadge } from './types'
import { StartSitModal } from './modals/StartSitModal'
import { TradeValueModal } from './modals/TradeValueModal'
import { WaiverWireModal } from './modals/WaiverWireModal'
import { TrendingPlayersModal } from './modals/TrendingPlayersModal'
import { PowerRankingsModal } from './modals/PowerRankingsModal'
import { InjuryImpactModal } from './modals/InjuryImpactModal'
import { AFWarRoomModal } from './modals/AFWarRoomModal'
import { MatchupPrepModal } from './modals/MatchupPrepModal'
import type { AIToolGridId } from './ai-tool-ids'
import { isAiToolGridId } from './ai-tool-ids'

type ToolId = AIToolGridId

function formatShortAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'Updated'
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

/**
 * Tool card configs. `insight` is a realistic placeholder preview — when
 * real data is available per tool, swap these out for live values. Same
 * for `freshness` — these are currently static "Ready" states; wire to
 * real recency signals per tool as backends come online.
 */
const TOOL_CONFIGS: (AIToolCardConfig & { id: ToolId })[] = [
  {
    id: 'startSit',
    title: 'Start/Sit',
    subtitle: 'Tactical lineup decisions',
    icon: <Crosshair className="h-[18px] w-[18px]" />,
    accent: 'cyan',
    insight: 'Flex swap flagged · 2 lineup issues',
    freshness: { status: 'live', label: 'Live' },
  },
  {
    id: 'trade',
    title: 'Trade Value',
    subtitle: 'Evaluate and rebalance any deal',
    icon: <ArrowLeftRight className="h-[18px] w-[18px]" />,
    accent: 'purple',
    insight: 'Market trending +3 · fairness 52/100',
    freshness: { status: 'recent', label: '6m ago' },
  },
  {
    id: 'waiver',
    title: 'Waiver Wire',
    subtitle: 'Best pickups ranked by urgency',
    icon: <Target className="h-[18px] w-[18px]" />,
    accent: 'emerald',
    insight: '3 high-value adds · $14 FAAB median',
    freshness: { status: 'recent', label: '12m ago' },
  },
  {
    id: 'trending',
    title: 'Trending',
    subtitle: "Who's hot, who's cold",
    icon: <Flame className="h-[18px] w-[18px]" />,
    accent: 'amber',
    insight: '5 risers · 4 fallers this week',
    freshness: { status: 'live', label: 'Live' },
  },
  {
    id: 'power',
    title: 'Power Rankings',
    subtitle: 'League standings and momentum',
    icon: <Crown className="h-[18px] w-[18px]" />,
    accent: 'violet',
    insight: "You're #4 · ↑2 from last week",
    freshness: { status: 'recent', label: '1h ago' },
  },
  {
    id: 'injury',
    title: 'Injury Impact',
    subtitle: 'Roster availability risk',
    icon: <ShieldAlert className="h-[18px] w-[18px]" />,
    accent: 'red',
    insight: '2 questionable · 1 IR candidate',
    freshness: { status: 'live', label: 'Live' },
  },
  {
    id: 'warRoom',
    title: 'AF War Room',
    subtitle: 'Season strategy command center',
    icon: <Shield className="h-[18px] w-[18px]" />,
    accent: 'rose',
    status: 'new',
    insight: 'Contender read · 4 action items',
    freshness: { status: 'recent', label: 'New' },
  },
  {
    id: 'matchupPrep',
    title: 'Matchup Prep',
    subtitle: 'Opponent scouting + game plan',
    icon: <Swords className="h-[18px] w-[18px]" />,
    accent: 'sky',
    insight: 'Synced league data · projected edge & win chance',
    freshness: { status: 'recent', label: 'Ready' },
  },
]

export function AIToolsGrid({ leagues }: { leagues: UserLeague[] }) {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const [injuryPreviewLoading, setInjuryPreviewLoading] = useState(false)
  const [injuryPreview, setInjuryPreview] = useState<{
    insight: string
    freshness: FreshnessBadge
  } | null>(null)
  const [warRoomPreviewLoading, setWarRoomPreviewLoading] = useState(false)
  const [warRoomPreview, setWarRoomPreview] = useState<{
    insight: string
    freshness: FreshnessBadge
  } | null>(null)
  const [matchupPreviewLoading, setMatchupPreviewLoading] = useState(false)
  const [matchupPreview, setMatchupPreview] = useState<{
    insight: string
    freshness: FreshnessBadge
  } | null>(null)

  useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<{ tool?: string }>
      const id = ce.detail?.tool
      if (isAiToolGridId(id)) setActiveTool(id)
    }
    window.addEventListener('af-open-ai-tool', handler)
    return () => window.removeEventListener('af-open-ai-tool', handler)
  }, [])

  const activeLeague = useMemo(() => leagues[0] ?? null, [leagues])
  const leagueId = activeLeague?.id ?? ''
  const leagueName = activeLeague?.name ?? 'my league'
  const sport = String(activeLeague?.sport ?? 'NFL')

  const loadInjuryGridPreview = useCallback(async () => {
    if (!leagueId) {
      setInjuryPreview(null)
      return
    }
    setInjuryPreviewLoading(true)
    try {
      const sportFilter =
        activeLeague && isSupportedSport(activeLeague.sport) ? String(activeLeague.sport).toUpperCase() : 'ALL'
      const res = await fetch('/api/ai-tools/injury-impact/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportFilter,
          leagueId,
          teamContext: 'my_team',
          specificTeamExternalId: null,
          opponentTeamExternalId: null,
          statusFilter: 'all',
          timeHorizon: 'this_week',
          skipAi: true,
          toggles: {
            includePractice: true,
            includeNews: true,
            includeReturnTimelines: true,
            includeHandcuffs: true,
            includePlayoffImpact: true,
            includeDynastyImpact: true,
          },
        }),
      })
      const json = (await res.json()) as InjuryImpactDashboardResult | { ok: false; error?: string }
      if (!res.ok || !json.ok) {
        return
      }
      const risk = Math.round(Math.min(100, Math.max(0, json.overallRisk)))
      const summary = formatInjuryAvailabilitySummary(json.summaryCounts)
      const insight = `${summary} · Risk ${risk}/100`
      const freshness: FreshnessBadge = json.degraded
        ? { status: 'stale', label: 'Partial data' }
        : { status: 'recent', label: formatShortAgo(json.computedAt) }
      setInjuryPreview({ insight, freshness })
    } catch {
      // keep prior preview if any
    } finally {
      setInjuryPreviewLoading(false)
    }
  }, [leagueId, activeLeague])

  const loadWarRoomGridPreview = useCallback(async () => {
    if (!leagueId) {
      setWarRoomPreview(null)
      return
    }
    setWarRoomPreviewLoading(true)
    try {
      const sportFilter =
        activeLeague && isSupportedSport(activeLeague.sport) ? String(activeLeague.sport).toUpperCase() : 'ALL'
      const res = await fetch('/api/ai-tools/war-room/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportFilter,
          leagueId,
          teamContext: 'my_team',
          strategyMode: 'balanced',
          timeHorizon: 'this_week',
          specificTeamExternalId: null,
          opponentTeamExternalId: null,
          skipAi: true,
          toggles: {
            includeNews: true,
            includeInjuries: true,
            includeWaiverSuggestions: true,
            includeTradeSuggestions: false,
            includeStartSitRecommendations: true,
            includePowerRankings: true,
            includeTrendingPlayers: true,
            includeRookieProspectIntel: false,
            includePlayoffImpact: true,
            includeDynastyWeighting: true,
          },
        }),
      })
      const json = (await res.json()) as WarRoomCommandCenterResult | { ok: false; error?: string }
      if (!res.ok || !json.ok) {
        return
      }
      const n = json.actions.length
      const pri = Math.round(json.scores.commandPriority)
      const insight = `${n} queued action${n === 1 ? '' : 's'} · Command ${pri}/100`
      const freshness: FreshnessBadge = json.overview.degraded
        ? { status: 'stale', label: 'Partial data' }
        : { status: 'recent', label: formatShortAgo(json.computedAt) }
      setWarRoomPreview({ insight, freshness })
    } catch {
      /* keep prior preview */
    } finally {
      setWarRoomPreviewLoading(false)
    }
  }, [leagueId, activeLeague])

  const loadMatchupGridPreview = useCallback(async () => {
    if (!leagueId) {
      setMatchupPreview(null)
      return
    }
    setMatchupPreviewLoading(true)
    try {
      const sportFilter =
        activeLeague && isSupportedSport(activeLeague.sport) ? String(activeLeague.sport).toUpperCase() : 'ALL'
      const res = await fetch('/api/ai-tools/matchup-prep/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportFilter,
          leagueId,
          teamFocus: 'my_team',
          teamExternalId: null,
          opponentExternalId: null,
          timeHorizon: 'this_matchup',
          strategyMode: 'balanced',
          skipAi: true,
          toggles: {
            includeLiveNews: true,
            includeInjuries: true,
            includeScheduleAdjustments: true,
            includeWeather: false,
            includeStreamingRecommendations: true,
            includeOpponentTrendAnalysis: true,
            includePlayoffContext: true,
            includeRookieProspectContext: false,
          },
        }),
      })
      const json = (await res.json()) as MatchupPrepDashboardResult | { ok: false; error?: string }
      if (!res.ok || !json.ok) {
        return
      }
      const edge = json.projectedEdge
      const win = json.winProbability
      const edgeStr = edge != null ? `${edge > 0 ? '+' : ''}${edge.toFixed(1)} pt edge` : 'Edge —'
      const winStr = win != null ? `${win}% win` : 'Win % —'
      const insight = `${edgeStr} · ${winStr}`
      const freshness: FreshnessBadge = json.degraded
        ? { status: 'stale', label: 'Partial data' }
        : { status: 'recent', label: formatShortAgo(json.computedAt) }
      setMatchupPreview({ insight, freshness })
    } catch {
      /* keep prior */
    } finally {
      setMatchupPreviewLoading(false)
    }
  }, [leagueId, activeLeague])

  useEffect(() => {
    setInjuryPreview(null)
    setWarRoomPreview(null)
    setMatchupPreview(null)
  }, [leagueId])

  useEffect(() => {
    void loadInjuryGridPreview()
  }, [loadInjuryGridPreview])

  useEffect(() => {
    void loadWarRoomGridPreview()
  }, [loadWarRoomGridPreview])

  useEffect(() => {
    void loadMatchupGridPreview()
  }, [loadMatchupGridPreview])

  const toolConfigs = useMemo(() => {
    return TOOL_CONFIGS.map((c) => {
      let row = c
      if (c.id === 'injury' && leagueId) {
        if (injuryPreviewLoading && !injuryPreview) {
          row = {
            ...row,
            status: 'loading' as const,
            insight: 'Syncing injury intelligence…',
            freshness: { status: 'live' as const, label: 'Syncing' },
          }
        } else if (injuryPreview) {
          row = {
            ...row,
            status: injuryPreviewLoading ? ('loading' as const) : undefined,
            insight: injuryPreview.insight,
            freshness: injuryPreview.freshness,
          }
        }
      }
      if (c.id === 'warRoom' && leagueId) {
        if (warRoomPreviewLoading && !warRoomPreview) {
          row = {
            ...row,
            status: 'loading' as const,
            insight: 'Building command queue…',
            freshness: { status: 'live' as const, label: 'Syncing' },
          }
        } else if (warRoomPreview) {
          row = {
            ...row,
            status: warRoomPreviewLoading ? ('loading' as const) : undefined,
            insight: warRoomPreview.insight,
            freshness: warRoomPreview.freshness,
          }
        }
      }
      if (c.id === 'matchupPrep' && leagueId) {
        if (matchupPreviewLoading && !matchupPreview) {
          row = {
            ...row,
            status: 'loading' as const,
            insight: 'Computing matchup board…',
            freshness: { status: 'live' as const, label: 'Syncing' },
          }
        } else if (matchupPreview) {
          row = {
            ...row,
            status: matchupPreviewLoading ? ('loading' as const) : undefined,
            insight: matchupPreview.insight,
            freshness: matchupPreview.freshness,
          }
        }
      }
      return row
    })
  }, [
    leagueId,
    injuryPreview,
    injuryPreviewLoading,
    warRoomPreview,
    warRoomPreviewLoading,
    matchupPreview,
    matchupPreviewLoading,
  ])

  return (
    <section className="ai-tools-tactical space-y-4" data-testid="ai-tools-grid">
      {/* Section header — tactical decision room strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#00d4aa] bg-[rgba(0,212,170,0.12)]"
            aria-hidden
          >
            <Sparkles className="h-4 w-4 text-[#00d4aa]" />
          </div>
          <div>
            <p className="text-[16px] font-bold leading-none tracking-tight text-[#e8eaf6]">AI Tools</p>
            <p className="mt-1 text-[11px] leading-none text-[#5c6480]">Mini AI workspaces — tap to open</p>
          </div>
        </div>
        <Link
          href={getChimmyChatHref({ source: 'dashboard' })}
          className="inline-flex items-center gap-1 rounded-[6px] border border-[#00d4aa]/45 bg-[rgba(0,212,170,0.08)] px-3 py-1.5 text-[11px] font-semibold text-[#00d4aa] transition hover:border-[#00d4aa]/70 hover:bg-[rgba(0,212,170,0.14)]"
        >
          Ask Chimmy →
        </Link>
      </div>

      {/* Tool card grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {toolConfigs.map((config) => (
          <AIToolCard
            key={config.id}
            config={config}
            onClick={() => setActiveTool(config.id)}
          />
        ))}
      </div>

      {/* Modals — one per tool, rendered unconditionally; internal `open` gate */}
      <StartSitModal
        open={activeTool === 'startSit'}
        onClose={() => setActiveTool(null)}
        leagueId={leagueId}
        leagueName={leagueName}
        leagues={leagues}
        initialSport={sport}
      />
      <TradeValueModal
        open={activeTool === 'trade'}
        onClose={() => setActiveTool(null)}
        leagues={leagues}
        initialLeagueId={leagueId}
        initialSport={sport}
      />
      <WaiverWireModal
        open={activeTool === 'waiver'}
        onClose={() => setActiveTool(null)}
        leagues={leagues}
        initialLeagueId={leagueId}
        initialSport={sport}
      />
      <TrendingPlayersModal
        open={activeTool === 'trending'}
        onClose={() => setActiveTool(null)}
        leagues={leagues}
        initialLeagueId={leagueId}
        initialSport={activeLeague ? String(activeLeague.sport) : 'ALL'}
      />
      <PowerRankingsModal
        open={activeTool === 'power'}
        onClose={() => setActiveTool(null)}
        leagues={leagues}
        initialLeagueId={leagueId}
        initialSport={activeLeague ? String(activeLeague.sport) : 'ALL'}
      />
      <InjuryImpactModal
        open={activeTool === 'injury'}
        onClose={() => setActiveTool(null)}
        leagues={leagues}
        initialLeagueId={leagueId}
        initialSport={activeLeague ? String(activeLeague.sport) : 'ALL'}
      />
      <AFWarRoomModal
        open={activeTool === 'warRoom'}
        onClose={() => setActiveTool(null)}
        leagues={leagues}
        initialLeagueId={leagueId}
        initialSport={activeLeague ? String(activeLeague.sport) : 'ALL'}
      />
      <MatchupPrepModal
        open={activeTool === 'matchupPrep'}
        onClose={() => setActiveTool(null)}
        leagues={leagues}
        initialLeagueId={leagueId}
        initialSport={activeLeague ? String(activeLeague.sport) : 'ALL'}
      />
    </section>
  )
}
