'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Clock,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import { AIToolModalShell } from '../AIToolModalShell'
import type { UrgencyLevel } from '../types'
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { buildLeagueFormatLabel } from '@/lib/leagues/leagueFormatLabel'

type SportFilter = 'ALL' | (typeof SUPPORTED_SPORTS)[number]

type WaiverTeamContext = 'my_team' | 'specific_team' | 'league_wide' | 'neutral'
type WaiverStrategy =
  | 'best_available'
  | 'win_now'
  | 'safe_floor'
  | 'upside'
  | 'rebuilder'
  | 'streamers'
  | 'stash'
  | 'injury_replacement'
  | 'prospect_build'
  | 'neutral'
type WaiverTimeHorizon = 'this_week' | 'two_weeks' | 'month' | 'ros' | 'dynasty'
type AnalysisTab =
  | 'best_adds'
  | 'team_fit'
  | 'streamers'
  | 'stashes'
  | 'drops'
  | 'rookies'
  | 'risk'
  | 'outlook'

type ApiPick = {
  sport: string
  rank: number
  positionRank: number
  recordId: string | null
  playerId: string
  name: string
  position: string
  team: string
  headshotUrl: string | null
  imageUrl: string | null
  waiverScore: number
  composite: number
  marketValue: number
  faabPct: number
  urgency: UrgencyLevel
  confidence: number
  tier: string
  tag: string
  why: string
  shortTerm: boolean
  longTerm: boolean
  injuryStatus: string | null
  trendingAdds: number
  isRookie: boolean
  suggestedDrop: { name: string; playerId: string; reason: string } | null
  rollingFppg?: number | null
}

type ApiSection = { sport: string; picks: ApiPick[]; summary: Record<string, unknown> }

type ApiResult = {
  ok: true
  mode: string
  sport: string
  leagueId: string | null
  leagueName: string | null
  generalAnalysis: boolean
  faabRemaining: number | null
  faabBudget: number
  waiverTypeLabel: string
  summary: {
    priorityAdds: number
    critical: number
    high: number
    medium: number
    faabAvgPct: number
  }
  picks: ApiPick[]
  sections: ApiSection[] | null
  suggestedDrops: Array<{ playerId: string; name: string; position: string; reason: string }>
  dataGaps: string[]
  dataFreshness: string
  chimmyPayload: Record<string, unknown>
  leagueSettingsSnapshot?: Record<string, unknown> | null
}

const URGENCY_STYLES: Record<
  UrgencyLevel,
  { label: string; text: string; bg: string; bar: string }
> = {
  critical: { label: 'Critical', text: 'text-red-200', bg: 'bg-red-500/15 border-red-500/30', bar: 'bg-red-400' },
  high: { label: 'High', text: 'text-amber-200', bg: 'bg-amber-500/15 border-amber-500/25', bar: 'bg-amber-400' },
  medium: { label: 'Medium', text: 'text-cyan-200', bg: 'bg-cyan-500/10 border-cyan-500/20', bar: 'bg-cyan-400' },
  low: { label: 'Low', text: 'text-white/60', bg: 'bg-white/[0.04] border-white/[0.08]', bar: 'bg-white/30' },
}

const TIER_LABEL: Record<string, string> = {
  must_add: 'Must add',
  strong_add: 'Strong add',
  stream: 'Stream',
  stash: 'Stash',
  deep: 'Deep',
  watchlist: 'Watchlist',
}

function positionsForSport(s: SportFilter): string[] {
  if (s === 'ALL') return ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST', 'IDP']
  if (s === 'NFL') return ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST', 'IDP']
  if (s === 'NBA' || s === 'NCAAB')
    return ['ALL', 'G', 'PG', 'SG', 'SF', 'PF', 'C', 'UTIL']
  if (s === 'MLB')
    return ['ALL', 'SP', 'RP', 'P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'UTIL']
  if (s === 'NHL') return ['ALL', 'C', 'W', 'LW', 'RW', 'D', 'G']
  if (s === 'SOCCER') return ['ALL', 'F', 'M', 'D', 'GK']
  if (s === 'NCAAF') return ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST']
  return ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST']
}

function streamerPositions(s: SportFilter): Set<string> {
  if (s === 'NHL') return new Set(['G'])
  if (s === 'NBA' || s === 'NCAAB') return new Set(['PG', 'SG', 'G'])
  return new Set(['QB', 'TE', 'K', 'DST', 'DEF'])
}

function urgencyWidth(u: UrgencyLevel): string {
  return u === 'critical' ? '95%' : u === 'high' ? '72%' : u === 'medium' ? '45%' : '20%'
}

function filterByTab(picks: ApiPick[], tab: AnalysisTab, sport: SportFilter): ApiPick[] {
  if (tab === 'best_adds') return picks
  if (tab === 'team_fit') {
    const withDrop = picks.filter((p) => p.suggestedDrop)
    return withDrop.length > 0 ? withDrop : picks
  }
  if (tab === 'streamers')
    return picks.filter((p) => streamerPositions(sport).has(p.position) || p.tag.includes('STREAM'))
  if (tab === 'stashes')
    return picks.filter((p) => ['stash', 'deep', 'watchlist'].includes(p.tier) || p.tag === 'STASH')
  if (tab === 'rookies') return picks.filter((p) => p.isRookie)
  if (tab === 'risk')
    return [...picks].sort((a, b) => a.confidence - b.confidence)
  if (tab === 'outlook') return picks.filter((p) => p.longTerm || p.tier === 'stash')
  return picks
}

export function WaiverWireModal({
  open,
  onClose,
  leagues,
  initialLeagueId = '',
  initialSport = 'NFL',
}: {
  open: boolean
  onClose: () => void
  leagues: UserLeague[]
  initialLeagueId?: string
  initialSport?: string
}) {
  const [sportFilter, setSportFilter] = useState<SportFilter>('ALL')
  const [leagueId, setLeagueId] = useState('')
  const [rookiesOnly, setRookiesOnly] = useState(false)
  const [teamContext, setTeamContext] = useState<WaiverTeamContext>('neutral')
  const [strategy, setStrategy] = useState<WaiverStrategy>('neutral')
  const [timeHorizon, setTimeHorizon] = useState<WaiverTimeHorizon>('this_week')
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('best_adds')
  const [position, setPosition] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApiResult | null>(null)
  const [queue, setQueue] = useState<Array<{ playerId: string; name: string; bid: number }>>([])
  const [detailPick, setDetailPick] = useState<ApiPick | null>(null)
  const [detailBody, setDetailBody] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const s = (initialSport || 'NFL').toUpperCase()
    const match = SUPPORTED_SPORTS.includes(s as (typeof SUPPORTED_SPORTS)[number])
    setSportFilter(match ? (s as SportFilter) : 'ALL')
    setLeagueId(initialLeagueId || '')
  }, [open, initialLeagueId, initialSport])

  useEffect(() => {
    if (!open) {
      setResult(null)
      setError(null)
      setQueue([])
      setDetailPick(null)
      setDetailBody(null)
    }
  }, [open])

  const selectedLeague = useMemo(
    () => leagues.find((l) => l.id === leagueId) ?? null,
    [leagues, leagueId],
  )

  const filteredLeagues = useMemo(() => {
    if (sportFilter === 'ALL') return leagues
    return leagues.filter((l) => String(l.sport).toUpperCase() === sportFilter)
  }, [leagues, sportFilter])

  const formatLine = useMemo(() => {
    if (!selectedLeague)
      return 'General analysis — pick a league for roster-specific waiver scoring.'
    return buildLeagueFormatLabel({
      format: selectedLeague.format,
      scoring: selectedLeague.scoring,
      isDynasty: selectedLeague.isDynasty,
      leagueVariant: selectedLeague.leagueVariant,
      teamCount: selectedLeague.teamCount,
      season: selectedLeague.season,
    })
  }, [selectedLeague])

  const posOptions = useMemo(() => {
    const eff =
      sportFilter === 'ALL'
        ? selectedLeague
          ? (String(selectedLeague.sport).toUpperCase() as SportFilter)
          : 'NFL'
        : sportFilter
    return positionsForSport(eff === 'ALL' ? 'NFL' : eff)
  }, [sportFilter, selectedLeague])

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/ai-tools/waiver-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportFilter,
          leagueId: leagueId || null,
          position,
          rookiesOnly,
          strategy,
          teamContext,
          timeHorizon,
        }),
      })
      const j = (await r.json()) as ApiResult & { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        setError(j.error || 'Could not load waiver intelligence.')
        setResult(null)
        return
      }
      setResult(j)
    } catch {
      setError('Network error.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [sportFilter, leagueId, position, rookiesOnly, strategy, teamContext, timeHorizon])

  useEffect(() => {
    if (!open) return
    void runAnalysis()
  }, [open, runAnalysis])

  const rawPicks = result?.picks ?? []
  const tabFiltered = useMemo(() => {
    const effSport: SportFilter =
      sportFilter === 'ALL'
        ? ((result?.sport || 'NFL') as SportFilter)
        : sportFilter
    let list: ApiPick[]
    if (analysisTab === 'drops') {
      list = []
    } else {
      list = filterByTab(rawPicks, analysisTab, effSport)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q) ||
          p.tag.toLowerCase().includes(q),
      )
    }
    return list
  }, [rawPicks, analysisTab, search, sportFilter, result?.sport])

  const chimmyPayload = result?.chimmyPayload
  const chimmyHref = getChimmyChatHrefWithPrompt(
    chimmyPayload
      ? 'Review my waiver intelligence context (structured payload attached).'
      : 'Open Chimmy for waiver help',
    {
      leagueId: leagueId || undefined,
      leagueName: selectedLeague?.name,
      sport: sportFilter === 'ALL' ? undefined : sportFilter,
      insightType: 'waiver',
      source: 'waiver_tool',
    },
  )

  const openDetail = async (p: ApiPick) => {
    setDetailPick(p)
    setDetailBody(null)
    const id = p.recordId || p.playerId
    setDetailLoading(true)
    try {
      const r = await fetch(`/api/trade-value/player-detail?id=${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (r.ok) setDetailBody((await r.json()) as Record<string, unknown>)
    } catch {
      setDetailBody(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const faabRem = result?.faabRemaining
  const faabBudget = result?.faabBudget ?? 100
  const queueFaabTotal = queue.reduce((s, q) => s + q.bid, 0)

  const analysisTabs: { id: AnalysisTab; label: string }[] = [
    { id: 'best_adds', label: 'Best adds' },
    { id: 'team_fit', label: 'Team fit' },
    { id: 'streamers', label: 'Streamers' },
    { id: 'stashes', label: 'Stashes' },
    { id: 'drops', label: 'Drops' },
    { id: 'rookies', label: 'Rookies' },
    { id: 'risk', label: 'Risk' },
    { id: 'outlook', label: 'Outlook' },
  ]

  return (
    <>
      <AIToolModalShell
        open={open}
        onClose={onClose}
        title="Waiver Wire"
        subtitle="Opportunity scanner"
        accentColor="emerald"
        wide
        icon={<Target className="h-5 w-5" />}
        headerBadge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Rolling Insights · live
          </span>
        }
        loading={false}
        error={error}
        empty={false}
        emptyMessage="No waiver candidates matched. Try another sport, league, or position."
        onRefresh={() => void runAnalysis()}
        refreshing={loading}
        chimmyPrompt={
          chimmyPayload
            ? 'Explain waiver recommendations using the structured AllFantasy payload only.'
            : 'Open Chimmy for waiver help'
        }
        chimmyContext={chimmyPayload ?? { source: 'waiver_wire_modal' }}
        actions={
          <button
            type="button"
            disabled={!chimmyPayload}
            onClick={async () => {
              if (!chimmyPayload) return
              const r = await fetch('/api/ai-tools/waiver-intelligence/chimmy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload: chimmyPayload }),
              })
              const j = (await r.json()) as { chimmy?: unknown }
              if (j?.chimmy) window.alert(JSON.stringify(j.chimmy, null, 2))
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[#3d4460] bg-[#242838] px-2.5 py-1.5 text-[11px] font-semibold text-[#9ba3bf] hover:border-[#5c6480] disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" /> Chimmy JSON
          </button>
        }
      >
        {/* Controls */}
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-white/40">
              Sport
              <select
                value={sportFilter}
                onChange={(e) => {
                  setSportFilter(e.target.value as SportFilter)
                  setPosition('ALL')
                }}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0f141d] px-2 py-1.5 text-[12px] text-white/90"
              >
                <option value="ALL">All</option>
                {SUPPORTED_SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-white/40">
              League
              <select
                value={leagueId}
                onChange={(e) => {
                  const v = e.target.value
                  setLeagueId(v)
                  const lg = leagues.find((l) => l.id === v)
                  if (lg) setSportFilter(String(lg.sport).toUpperCase() as SportFilter)
                }}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0f141d] px-2 py-1.5 text-[12px] text-white/90"
              >
                <option value="">— All leagues / general —</option>
                {sportFilter === 'ALL'
                  ? SUPPORTED_SPORTS.map((sp) => {
                      const group = leagues.filter((l) => String(l.sport).toUpperCase() === sp)
                      if (group.length === 0) return null
                      return (
                        <optgroup key={sp} label={sp}>
                          {group.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </optgroup>
                      )
                    })
                  : filteredLeagues.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-white/40">
              Rookies
              <button
                type="button"
                onClick={() => setRookiesOnly((v) => !v)}
                className={`rounded-lg border px-2 py-1.5 text-left text-[12px] font-semibold ${
                  rookiesOnly ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/[0.08] bg-[#0f141d] text-white/70'
                }`}
              >
                {rookiesOnly ? 'On' : 'Off'}
              </button>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-white/40">
              Team context
              <select
                value={teamContext}
                onChange={(e) => setTeamContext(e.target.value as WaiverTeamContext)}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0f141d] px-2 py-1.5 text-[12px] text-white/90"
              >
                <option value="my_team">My team</option>
                <option value="specific_team">Specific team</option>
                <option value="league_wide">League-wide</option>
                <option value="neutral">Neutral / general</option>
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-white/40">
              Strategy
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as WaiverStrategy)}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0f141d] px-2 py-1.5 text-[12px] text-white/90"
              >
                <option value="best_available">Best available</option>
                <option value="win_now">Win now</option>
                <option value="safe_floor">Safe floor</option>
                <option value="upside">Upside</option>
                <option value="rebuilder">Rebuilder</option>
                <option value="streamers">Streamers</option>
                <option value="stash">Stash</option>
                <option value="injury_replacement">Injury replacement</option>
                <option value="prospect_build">Prospect build</option>
                <option value="neutral">Neutral</option>
              </select>
            </label>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-white/40">
              Horizon
              <select
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value as WaiverTimeHorizon)}
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0f141d] px-2 py-1.5 text-[12px] text-white/90"
              >
                <option value="this_week">This week</option>
                <option value="two_weeks">Next 2 weeks</option>
                <option value="month">Next month</option>
                <option value="ros">Rest of season</option>
                <option value="dynasty">Dynasty / long term</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-1 overflow-x-auto rounded-xl bg-white/[0.03] p-1">
            {analysisTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAnalysisTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                  analysisTab === t.id ? 'bg-emerald-500/15 text-emerald-200' : 'text-white/35 hover:text-white/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players, team, position…"
                className="w-full rounded-lg border border-white/[0.08] bg-[#0f141d] py-1.5 pl-8 pr-2 text-[12px] text-white/90 placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {posOptions.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(p)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  position === p ? 'bg-emerald-500/15 text-emerald-200' : 'text-white/35 hover:text-white/60'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-white/45">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" /> Loading waiver intelligence…
          </div>
        ) : null}

        {result ? (
          <div className="mb-3 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.06] to-transparent px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">
              {result.generalAnalysis ? 'Trending / FA pool · ' : ''}
              {selectedLeague?.name ?? 'AllFantasy leagues'}
            </p>
            <p className="mt-1 text-[12px] text-white/55">{formatLine}</p>
            {result.leagueSettingsSnapshot &&
            Array.isArray((result.leagueSettingsSnapshot as { quickModeBadges?: string[] }).quickModeBadges) ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {(result.leagueSettingsSnapshot as { quickModeBadges: string[] }).quickModeBadges.map((b) => (
                  <span key={b} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">
                    {b}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-1 text-[13px] font-semibold text-white/85">
              {result.summary.priorityAdds} priority adds · {result.summary.faabAvgPct}% FAAB avg ·{' '}
              <span className="text-emerald-300/90">{result.waiverTypeLabel}</span>
              {faabRem != null ? (
                <span className="ml-2 rounded-md bg-cyan-500/15 px-2 py-0.5 text-[11px] font-bold text-cyan-200">
                  ${faabRem} / ${faabBudget} FAAB
                </span>
              ) : null}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
              <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-red-200">{result.summary.critical} critical</span>
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-200">{result.summary.high} high</span>
              <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-cyan-200">{result.summary.medium} medium</span>
            </div>
            {result.dataGaps.length > 0 ? (
              <p className="mt-2 text-[10px] text-amber-200/80">
                Data gaps: {result.dataGaps.slice(0, 3).join(' · ')}
                {result.dataGaps.length > 3 ? '…' : ''}
              </p>
            ) : null}
            <p className="mt-1 text-[9px] text-white/35">Updated {new Date(result.dataFreshness).toLocaleString()}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-2">
            {analysisTab === 'drops' ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[12px] font-semibold text-white/85">Suggested drops (your roster)</p>
                <p className="mt-1 text-[11px] text-white/45">
                  Based on lowest composite value from your synced roster when &quot;My team&quot; is selected and a league is chosen.
                </p>
                <ul className="mt-3 space-y-2">
                  {(result?.suggestedDrops ?? []).map((d) => (
                    <li
                      key={d.playerId}
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0f141d] px-3 py-2 text-[12px]"
                    >
                      <span className="font-semibold text-white/85">
                        {d.name}{' '}
                        <span className="text-white/40">
                          {d.position}
                        </span>
                      </span>
                      <span className="max-w-[55%] text-right text-[10px] text-white/45">{d.reason}</span>
                    </li>
                  ))}
                  {(result?.suggestedDrops ?? []).length === 0 ? (
                    <li className="text-[11px] text-white/40">No drop candidates — select a league and My team, or your roster data is not linked yet.</li>
                  ) : null}
                </ul>
              </div>
            ) : tabFiltered.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-8 text-center text-[11px] text-white/40">
                No picks for this tab/filter.
              </div>
            ) : (
              tabFiltered.map((pick) => (
                <div
                  key={`${pick.playerId}-${pick.rank}`}
                  className="block w-full cursor-pointer text-left"
                  onClick={() => void openDetail(pick)}
                >
                  <WaiverPickRow
                    pick={pick}
                    sportFilter={sportFilter}
                    onQueue={() => {
                      setQueue((q) => {
                        if (q.some((x) => x.playerId === pick.playerId)) return q
                        return [...q, { playerId: pick.playerId, name: pick.name, bid: pick.faabPct }]
                      })
                    }}
                  />
                </div>
              ))
            )}
          </div>

          {/* Queue */}
          <div className="w-full shrink-0 rounded-xl border border-white/[0.08] bg-[#080b11] p-3 lg:w-64">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">Waiver queue</p>
              <span className="text-[10px] text-cyan-200/90">
                {queue.length} · ${queueFaabTotal} bid
              </span>
            </div>
            <p className="mt-1 text-[10px] text-white/35">
              Local plan only — submit claims in your host platform (Sleeper/Yahoo/ESPN).
            </p>
            <ul className="mt-3 space-y-2">
              {queue.map((q) => (
                <li key={q.playerId} className="rounded-lg border border-white/[0.06] bg-[#0f141d] p-2">
                  <p className="truncate text-[11px] font-semibold text-white/85">{q.name}</p>
                  <label className="mt-1 flex items-center gap-2 text-[10px] text-white/45">
                    FAAB %
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={q.bid}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        setQueue((list) =>
                          list.map((x) => (x.playerId === q.playerId ? { ...x, bid: Number.isFinite(n) ? n : 0 } : x)),
                        )
                      }}
                      className="w-full rounded border border-white/[0.08] bg-[#0b0e14] px-1 py-0.5 text-[12px] text-white/90"
                    />
                  </label>
                </li>
              ))}
            </ul>
            {queue.length > 0 ? (
              <button
                type="button"
                disabled
                className="mt-3 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 text-[11px] font-semibold text-white/35"
              >
                Submit via host app
              </button>
            ) : null}
          </div>
        </div>

        {/* Sections (All sports) */}
        {result?.sections && result.sections.length > 0 ? (
          <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">By sport (All mode)</p>
            {result.sections.map((sec) => (
              <div key={sec.sport} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[12px] font-bold text-emerald-200/90">{sec.sport}</p>
                <ul className="mt-2 space-y-1 text-[11px] text-white/70">
                  {sec.picks.slice(0, 5).map((p) => (
                    <li key={p.playerId}>
                      {p.rank}. {p.name} · {p.position} · {Math.round(p.waiverScore)} score
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-[#2e3347] bg-[#0a0d12] p-3">
          <p className="text-[11px] font-semibold text-emerald-200/90">Ask Chimmy</p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/45">
            Chimmy reasons from the waiver payload (trending counts, composites, FAAB, league context). Use JSON for a full
            structured interpretation.
          </p>
          <Link
            href={chimmyHref}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"
          >
            Open in Messages AI →
          </Link>
        </div>
      </AIToolModalShell>

      {detailPick ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={() => setDetailPick(null)} />
          <div className="relative z-[61] max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-[#2e3347] bg-[#0b0e14] p-4 sm:rounded-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[15px] font-bold text-white/90">{detailPick.name}</p>
                <p className="text-[11px] text-white/45">
                  {detailPick.position} · {detailPick.team} · #{detailPick.positionRank} at position
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailPick(null)}
                className="rounded-md border border-white/[0.08] p-1 text-white/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {detailPick.imageUrl || detailPick.headshotUrl ? (
              <div className="relative mx-auto mt-3 h-24 w-24 overflow-hidden rounded-full border border-white/[0.08]">
                <Image
                  src={(detailPick.imageUrl || detailPick.headshotUrl) as string}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : null}
            {detailLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : detailBody ? (
              <div className="mt-3 space-y-2 text-[11px] text-white/65">
                <p>Injury: {String(detailBody.injuryStatus ?? '—')}</p>
                <p>Last updated: {String(detailBody.lastUpdated ?? '—')}</p>
                <p className="text-white/45">Source: {String(detailBody.dataSource ?? '—')}</p>
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-amber-200/80">
                No detailed `sports_players` row for this id yet — waiver card fields above are from live trending + pool
                data.
              </p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-white/55">{detailPick.why}</p>
          </div>
        </div>
      ) : null}
    </>
  )
}

function WaiverPickRow({
  pick,
  sportFilter,
  onQueue,
}: {
  pick: ApiPick
  sportFilter: SportFilter
  onQueue: () => void
}) {
  const s = URGENCY_STYLES[pick.urgency]
  const showSport = sportFilter === 'ALL'
  return (
    <div className={`rounded-xl border p-3 transition hover:border-emerald-500/25 ${s.bg}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0b1020]/80 text-[13px] font-black text-white/80">
          {pick.rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-[13px] font-bold text-white/90">{pick.name}</p>
            {showSport ? (
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-white/50">{pick.sport}</span>
            ) : null}
            {pick.trendingAdds > 500 ? <Zap className="h-3 w-3 shrink-0 text-amber-400" /> : null}
            {pick.trendingAdds > 2000 ? <Activity className="h-3 w-3 shrink-0 text-orange-400" /> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-white/40">
            <span className="font-bold text-white/60">{pick.position}</span>
            <span>·</span>
            <span>{pick.team}</span>
            <span>·</span>
            <span>Pos rank {pick.positionRank}</span>
            {pick.injuryStatus ? (
              <>
                <span>·</span>
                <span className="font-semibold text-amber-200/90">{pick.injuryStatus}</span>
              </>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">
              {TIER_LABEL[pick.tier] ?? pick.tier}
            </span>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-200/90">
              {pick.tag}
            </span>
          </div>
          {pick.rollingFppg != null ? (
            <p className="mt-1 text-[10px] font-semibold text-sky-300/90">Rolling Insights FPPG {pick.rollingFppg.toFixed(1)}</p>
          ) : null}
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/60">{pick.why}</p>
          {pick.suggestedDrop ? (
            <p className="mt-1 text-[10px] text-rose-200/80">
              Drop candidate: {pick.suggestedDrop.name} — {pick.suggestedDrop.reason}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">FAAB %</p>
          <p className={`text-[15px] font-black tabular-nums ${s.text}`}>{pick.faabPct}%</p>
          <p className="text-[9px] text-white/35">conf {pick.confidence}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onQueue()
            }}
            className="mt-1 inline-flex items-center gap-0.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-200"
          >
            <Plus className="h-3 w-3" /> Queue
          </button>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Clock className="h-3 w-3 text-white/30" />
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className={`h-full rounded-full ${s.bar}`} style={{ width: urgencyWidth(pick.urgency) }} />
        </div>
        <span className={`text-[8px] font-bold uppercase tracking-widest ${s.text}`}>{s.label}</span>
      </div>
    </div>
  )
}
