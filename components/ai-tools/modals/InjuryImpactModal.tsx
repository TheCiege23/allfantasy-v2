'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Clock, ShieldAlert, Sparkles, X } from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import { AIToolModalShell } from '../AIToolModalShell'
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type {
  InjuryImpactDashboardResult,
  InjuryPlayerIntelRow,
  InjuryStatusFilterId,
  InjuryTeamContextId,
  InjuryTimeHorizonId,
  InjuryViewTabId,
} from '@/lib/injury-impact-dashboard/types'

type SportFilter = 'ALL' | (typeof SUPPORTED_SPORTS)[number]

const TEAM_CONTEXTS: { id: InjuryTeamContextId; label: string }[] = [
  { id: 'my_team', label: 'My Team' },
  { id: 'specific_team', label: 'Specific Team' },
  { id: 'full_league', label: 'Full League' },
  { id: 'opponent_team', label: 'Opponent Team' },
  { id: 'league_wide_risk', label: 'League-Wide Risk' },
  { id: 'neutral', label: 'Neutral / General' },
]

const STATUS_FILTERS: { id: InjuryStatusFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'healthy_monitoring', label: 'Healthy Monitoring' },
  { id: 'questionable', label: 'Questionable' },
  { id: 'doubtful', label: 'Doubtful' },
  { id: 'out', label: 'Out' },
  { id: 'ir', label: 'IR' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'gtd', label: 'Game-Time Decision' },
  { id: 'day_to_day', label: 'Day-to-Day' },
  { id: 'week_to_week', label: 'Week-to-Week' },
  { id: 'long_term', label: 'Long-Term' },
  { id: 'returning_soon', label: 'Returning Soon' },
]

const TIME_HORIZONS: { id: InjuryTimeHorizonId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'next_2_weeks', label: 'Next 2 Weeks' },
  { id: 'next_month', label: 'Next Month' },
  { id: 'rest_of_season', label: 'Rest of Season' },
  { id: 'playoff_window', label: 'Playoff Window' },
  { id: 'dynasty_long', label: 'Dynasty / Long Term' },
]

const VIEW_TABS: { id: InjuryViewTabId; label: string }[] = [
  { id: 'live', label: 'Live Updates' },
  { id: 'team_impact', label: 'Team Impact' },
  { id: 'league_impact', label: 'League Impact' },
  { id: 'replacements', label: 'Replacements' },
  { id: 'start_sit_risk', label: 'Start/Sit Risk' },
  { id: 'waiver', label: 'Waiver Targets' },
  { id: 'trade', label: 'Trade Impact' },
  { id: 'return_tracker', label: 'Return Tracker' },
  { id: 'ai', label: 'AI Insights' },
]

const SEV_STYLES: Record<
  string,
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  out: { label: 'Out', text: 'text-red-200', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400' },
  ir: { label: 'IR', text: 'text-rose-200', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  doubtful: { label: 'Doubtful', text: 'text-amber-200', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  questionable: { label: 'Q', text: 'text-sky-200', bg: 'bg-sky-500/10', border: 'border-sky-500/25', dot: 'bg-sky-400' },
  probable: { label: 'Probable', text: 'text-emerald-200', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  gtd: { label: 'GTD', text: 'text-orange-200', bg: 'bg-orange-500/10', border: 'border-orange-500/25', dot: 'bg-orange-400' },
  suspended: { label: 'Susp.', text: 'text-red-300', bg: 'bg-red-600/10', border: 'border-red-600/30', dot: 'bg-red-500' },
  other: { label: 'Status', text: 'text-white/60', bg: 'bg-white/[0.04]', border: 'border-white/10', dot: 'bg-white/40' },
}

export function InjuryImpactModal({
  open,
  onClose,
  leagues,
  initialLeagueId = '',
  initialSport = 'ALL',
}: {
  open: boolean
  onClose: () => void
  leagues: UserLeague[]
  initialLeagueId?: string
  initialSport?: string
}) {
  const [sportFilter, setSportFilter] = useState<SportFilter>('ALL')
  const [leagueId, setLeagueId] = useState('')
  const [teamContext, setTeamContext] = useState<InjuryTeamContextId>('my_team')
  const [specificTeamExternalId, setSpecificTeamExternalId] = useState('')
  const [opponentTeamExternalId, setOpponentTeamExternalId] = useState('')
  const [statusFilter, setStatusFilter] = useState<InjuryStatusFilterId>('all')
  const [timeHorizon, setTimeHorizon] = useState<InjuryTimeHorizonId>('this_week')
  const [viewTab, setViewTab] = useState<InjuryViewTabId>('live')
  const [toggles, setToggles] = useState({
    includePractice: true,
    includeNews: true,
    includeReturnTimelines: true,
    includeHandcuffs: true,
    includePlayoffImpact: true,
    includeDynastyImpact: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<InjuryImpactDashboardResult | null>(null)
  const [detail, setDetail] = useState<InjuryPlayerIntelRow | null>(null)
  const [leagueTeams, setLeagueTeams] = useState<
    Array<{ externalId: string; teamName: string; ownerName: string; isYou?: boolean }>
  >([])

  useEffect(() => {
    if (!open) return
    const s = (initialSport || 'ALL').toUpperCase()
    if (s === 'ALL') setSportFilter('ALL')
    else if (SUPPORTED_SPORTS.includes(s as (typeof SUPPORTED_SPORTS)[number])) {
      setSportFilter(s as SportFilter)
    }
    setLeagueId(initialLeagueId || '')
  }, [open, initialLeagueId, initialSport])

  const filteredLeagues = useMemo(() => {
    if (sportFilter === 'ALL') return leagues
    return leagues.filter((l) => String(l.sport).toUpperCase() === sportFilter)
  }, [leagues, sportFilter])

  useEffect(() => {
    if (!open || !leagueId) {
      setLeagueTeams([])
      return
    }
    let cancelled = false
    fetch(`/api/trade-value/league-teams?leagueId=${encodeURIComponent(leagueId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setLeagueTeams(Array.isArray(j.teams) ? j.teams : [])
      })
      .catch(() => {
        if (!cancelled) setLeagueTeams([])
      })
    return () => {
      cancelled = true
    }
  }, [open, leagueId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/ai-tools/injury-impact/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportFilter,
          leagueId: leagueId.trim() || null,
          teamContext,
          specificTeamExternalId:
            teamContext === 'specific_team' && specificTeamExternalId.trim()
              ? specificTeamExternalId.trim()
              : null,
          opponentTeamExternalId:
            teamContext === 'opponent_team' && opponentTeamExternalId.trim()
              ? opponentTeamExternalId.trim()
              : null,
          statusFilter,
          timeHorizon,
          skipAi: false,
          toggles,
        }),
      })
      const json = (await r.json()) as InjuryImpactDashboardResult | { ok: false; error?: string }
      if (!r.ok || !json.ok) {
        setData(null)
        setError((json as { error?: string }).error || 'Failed to load injury intelligence')
        return
      }
      setData(json)
    } catch {
      setData(null)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [
    sportFilter,
    leagueId,
    teamContext,
    specificTeamExternalId,
    opponentTeamExternalId,
    statusFilter,
    timeHorizon,
    toggles,
  ])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  const filteredPlayers = useMemo(() => {
    if (!data?.ok) return []
    const p = data.players
    switch (viewTab) {
      case 'team_impact':
        return p.filter((x) => x.onRoster)
      case 'league_impact':
        return p
      case 'start_sit_risk':
        return p.filter((x) => x.isStarter && x.impactScore >= 35)
      case 'return_tracker':
        return p.filter((x) => x.severity === 'probable' || x.statusRaw.toLowerCase().includes('return'))
      case 'live':
      default:
        return p
    }
  }, [data, viewTab])

  const chimmyPrompt = useMemo(() => {
    const ln = data?.leagueName || 'my leagues'
    return `Injury impact for ${ln}: prioritize real roster risk and cite only structured data.`
  }, [data?.leagueName])

  const headerBadge =
    data?.ok ? (
      <div className="flex flex-wrap items-center gap-1">
        {data.degraded ? (
          <span className="rounded border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-200">
            Partial data
          </span>
        ) : (
          <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-200">
            Live DB
          </span>
        )}
        <span className="rounded border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-red-200/90">
          {data.analysisScope === 'league' ? 'League-aware' : 'General'}
        </span>
      </div>
    ) : null

  return (
    <>
      <AIToolModalShell
        open={open}
        onClose={onClose}
        title="Injury Impact"
        subtitle="Availability risk from injury reports & player records — league-aware when selected"
        accentColor="red"
        icon={<ShieldAlert className="h-5 w-5" />}
        wide
        showApiPills={false}
        loading={loading}
        error={error}
        onRefresh={load}
        refreshing={loading}
        headerBadge={headerBadge}
        chimmyPrompt={data?.ok ? chimmyPrompt : undefined}
        chimmyContext={data?.chimmyPayload ?? {}}
        actions={
          data?.ok ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={getChimmyChatHrefWithPrompt('Open Start/Sit with my current injury context', {
                  source: 'injury_impact',
                  leagueId,
                })}
                className="text-[11px] font-semibold text-red-300/90 underline-offset-2 hover:underline"
              >
                Start/Sit
              </Link>
              <Link
                href={getChimmyChatHrefWithPrompt('Waiver targets for injury holes in my roster', {
                  source: 'injury_impact',
                  leagueId,
                })}
                className="text-[11px] font-semibold text-red-300/90 underline-offset-2 hover:underline"
              >
                Waiver Wire
              </Link>
              <Link
                href={getChimmyChatHrefWithPrompt('Trade impact for injured players on my roster', {
                  source: 'injury_impact',
                  leagueId,
                })}
                className="text-[11px] font-semibold text-red-300/90 underline-offset-2 hover:underline"
              >
                Trade value
              </Link>
            </div>
          ) : null
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-white/[0.08] bg-[#0a0f18] p-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[#5c6480]">
                Sport
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value as SportFilter)}
                  className="mt-1 w-full rounded-lg border border-[#2e3347] bg-[#121725] px-2 py-1.5 text-[12px] text-[#e8eaf6]"
                >
                  <option value="ALL">All</option>
                  {SUPPORTED_SPORTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[#5c6480] sm:col-span-2">
                League
                <select
                  value={leagueId}
                  onChange={(e) => setLeagueId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#2e3347] bg-[#121725] px-2 py-1.5 text-[12px] text-[#e8eaf6]"
                >
                  <option value="">— All / general —</option>
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
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[#5c6480]">
                Team context
                <select
                  value={teamContext}
                  onChange={(e) => setTeamContext(e.target.value as InjuryTeamContextId)}
                  className="mt-1 w-full rounded-lg border border-[#2e3347] bg-[#121725] px-2 py-1.5 text-[11px] text-[#e8eaf6]"
                >
                  {TEAM_CONTEXTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[#5c6480]">
                Status filter
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InjuryStatusFilterId)}
                  className="mt-1 w-full rounded-lg border border-[#2e3347] bg-[#121725] px-2 py-1.5 text-[11px] text-[#e8eaf6]"
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[#5c6480]">
                Time horizon
                <select
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(e.target.value as InjuryTimeHorizonId)}
                  className="mt-1 w-full rounded-lg border border-[#2e3347] bg-[#121725] px-2 py-1.5 text-[11px] text-[#e8eaf6]"
                >
                  {TIME_HORIZONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {(teamContext === 'specific_team' || teamContext === 'opponent_team') && leagueId ? (
              <label className="block text-[10px] font-bold uppercase tracking-wide text-[#5c6480]">
                {teamContext === 'opponent_team' ? 'Opponent team' : 'Team'}
                <select
                  value={teamContext === 'opponent_team' ? opponentTeamExternalId : specificTeamExternalId}
                  onChange={(e) =>
                    teamContext === 'opponent_team'
                      ? setOpponentTeamExternalId(e.target.value)
                      : setSpecificTeamExternalId(e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-[#2e3347] bg-[#121725] px-2 py-1.5 text-[12px] text-[#e8eaf6]"
                >
                  <option value="">— Select —</option>
                  {leagueTeams.map((t) => (
                    <option key={t.externalId} value={t.externalId}>
                      {t.teamName} ({t.ownerName})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <details className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
              <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-[#7a8199]">
                Optional toggles
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ['includePractice', 'Practice reports'],
                    ['includeNews', 'News merge'],
                    ['includeReturnTimelines', 'Return timelines'],
                    ['includeHandcuffs', 'Handcuffs / replacements'],
                    ['includePlayoffImpact', 'Playoff impact'],
                    ['includeDynastyImpact', 'Dynasty / prospect'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-[11px] text-[#c4c9dc]">
                    <input
                      type="checkbox"
                      checked={toggles[key]}
                      onChange={(e) => setToggles((t) => ({ ...t, [key]: e.target.checked }))}
                      className="rounded border-[#3d4460]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </details>

            {!leagueId.trim() ? (
              <p className="text-[10px] text-amber-200/85">No league selected — analysis is general and not roster-specific.</p>
            ) : null}
            {data?.computedAt ? (
              <p className="text-[10px] text-[#5c6480]">Updated {new Date(data.computedAt).toLocaleString()}</p>
            ) : null}
          </div>

          {data?.ok ? (
            <>
              <div className="rounded-2xl border border-red-500/15 bg-gradient-to-br from-red-500/[0.06] to-transparent px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-300/70">Availability risk</p>
                    <p className="mt-1 text-[13px] font-semibold text-white/85">
                      {data.players.length} surfaced {data.players.length === 1 ? 'player' : 'players'}
                    </p>
                  </div>
                  <p className="text-[24px] font-black tabular-nums text-white/95">
                    {Math.round(data.overallRisk)}
                    <span className="text-[11px] font-bold text-white/30">/100</span>
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all"
                    style={{ width: `${Math.min(100, data.overallRisk)}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 text-[10px]">
                  <CountPill label="Out / IR" value={data.summaryCounts.outIr} tone="red" />
                  <CountPill label="Doubtful" value={data.summaryCounts.doubtful} tone="amber" />
                  <CountPill label="Q / GTD" value={data.summaryCounts.questionable} tone="sky" />
                  <CountPill label="Limited" value={data.summaryCounts.limited} tone="slate" />
                  <CountPill label="Full" value={data.summaryCounts.fullPractice} tone="emerald" />
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {VIEW_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setViewTab(t.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                      viewTab === t.id
                        ? 'border border-red-500/35 bg-red-500/15 text-red-100'
                        : 'border border-transparent text-[#7a8199] hover:bg-white/[0.04]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <ViewPanel
                tab={viewTab}
                players={filteredPlayers}
                allPlayers={data.players}
                onOpen={setDetail}
                aiNarrative={data.aiNarrative}
              />

              {data.dataGaps.length > 0 ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
                  <p className="text-[9px] font-bold uppercase text-amber-200/90">Data notes</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-amber-100/85">
                    {data.dataGaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </AIToolModalShell>

      {detail ? <InjuryDetailDrawer row={detail} onClose={() => setDetail(null)} /> : null}
    </>
  )
}

function CountPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  const cls =
    tone === 'red'
      ? 'border-red-500/25 text-red-200'
      : tone === 'amber'
        ? 'border-amber-500/25 text-amber-200'
        : tone === 'sky'
          ? 'border-sky-500/25 text-sky-200'
          : tone === 'emerald'
            ? 'border-emerald-500/25 text-emerald-200'
            : 'border-white/10 text-white/55'
  return (
    <div className={`rounded-lg border px-2 py-1 ${cls}`}>
      <p className="text-[8px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-[15px] font-black tabular-nums">{value}</p>
    </div>
  )
}

function ViewPanel({
  tab,
  players,
  allPlayers,
  onOpen,
  aiNarrative,
}: {
  tab: InjuryViewTabId
  players: InjuryPlayerIntelRow[]
  allPlayers: InjuryPlayerIntelRow[]
  onOpen: (r: InjuryPlayerIntelRow) => void
  aiNarrative: string | null
}) {
  if (tab === 'ai') {
    return (
      <div className="rounded-xl border border-red-500/15 bg-red-500/[0.04] px-3 py-3">
        <div className="mb-2 flex items-center gap-2 text-red-200/90">
          <Sparkles className="h-4 w-4" />
          <p className="text-[11px] font-bold uppercase tracking-wide">Chimmy summary</p>
        </div>
        {aiNarrative ? (
          <p className="text-[12px] leading-relaxed text-white/75">{aiNarrative}</p>
        ) : (
          <p className="text-[12px] text-white/55">No AI narrative (OpenAI or data). Use Ask Chimmy with the payload.</p>
        )}
      </div>
    )
  }

  if (tab === 'replacements' || tab === 'waiver' || tab === 'trade') {
    return (
      <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[12px] text-white/65">
        <p>
          Replacement names are not auto-generated here — use{' '}
          <span className="text-red-200/90">Waiver Wire</span> and{' '}
          <span className="text-red-200/90">Trade Value</span> with the same league for real add/drop options.
        </p>
        <p className="text-[11px] text-[#5c6480]">
          {tab === 'trade'
            ? 'Trade impact follows real injury status changes to player value; confirm in the trade tool.'
            : 'Waiver targets depend on your league scoring and free agents — open the waiver tool after reviewing flagged players below.'}
        </p>
        <div className="space-y-1.5 pt-2">
          {allPlayers.slice(0, 8).map((p) => (
            <button
              key={p.playerKey}
              type="button"
              onClick={() => onOpen(p)}
              className="flex w-full items-center justify-between rounded-lg border border-white/[0.05] px-2 py-1.5 text-left text-[11px] text-white/75 hover:border-red-500/20"
            >
              <span>
                {p.name} · {p.statusRaw}
              </span>
              <span className="tabular-nums text-red-200/80">{p.impactScore.toFixed(0)}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-6 text-center">
        <Activity className="mx-auto h-6 w-6 text-emerald-400" />
        <p className="mt-2 text-[13px] font-semibold text-emerald-300">No rows in this view</p>
        <p className="mt-1 text-[11px] text-white/45">Adjust filters or status — underlying feed may be sparse.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {players.map((a) => (
        <InjuryAlertCard key={a.playerKey} alert={a} onOpen={() => onOpen(a)} />
      ))}
    </div>
  )
}

function InjuryAlertCard({ alert, onOpen }: { alert: InjuryPlayerIntelRow; onOpen: () => void }) {
  const s = SEV_STYLES[alert.severity] ?? SEV_STYLES.other
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-xl border p-3 text-left transition hover:brightness-110 ${s.border} ${s.bg}`}
    >
      <div className="flex items-start gap-2.5">
        {alert.headshotUrl ? (
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10">
            <Image src={alert.headshotUrl} alt="" fill className="object-cover" sizes="40px" />
          </span>
        ) : (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[10px] font-bold text-white/50`}>
            {alert.position.slice(0, 2)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[12px] font-bold text-white/90">{alert.name}</p>
            <AlertTriangle className={`h-3 w-3 shrink-0 ${s.text}`} />
            {alert.onRoster ? (
              <span className="rounded bg-red-500/20 px-1 text-[8px] font-bold uppercase text-red-100">Roster</span>
            ) : null}
            {alert.isStarter ? (
              <span className="rounded bg-amber-500/15 px-1 text-[8px] font-bold uppercase text-amber-100">Starter</span>
            ) : null}
          </div>
          <p className="truncate text-[10px] text-white/40">
            {alert.position} · {alert.team} · {alert.sport}
          </p>
          <p className="mt-1 text-[11px] text-white/65">{alert.statusRaw}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-semibold text-white/40">
            {alert.reportDate ? (
              <span>
                <Clock className="mr-0.5 inline h-2.5 w-2.5" />
                Report {new Date(alert.reportDate).toLocaleDateString()}
              </span>
            ) : null}
            {alert.lastUpdated ? (
              <span>Rec {new Date(alert.lastUpdated).toLocaleDateString()}</span>
            ) : null}
            <span className="text-white/30">Conf {alert.confidence}%</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest ${s.text} ${s.bg}`}>
            {s.label}
          </span>
          <p className="mt-1 text-[14px] font-black tabular-nums text-white/85">{alert.impactScore.toFixed(0)}</p>
          <p className="text-[7px] font-bold uppercase tracking-widest text-white/30">impact</p>
        </div>
      </div>
    </button>
  )
}

function InjuryDetailDrawer({ row, onClose }: { row: InjuryPlayerIntelRow; onClose: () => void }) {
  const s = SEV_STYLES[row.severity] ?? SEV_STYLES.other
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#2e3347] bg-[#0b0e14] p-4 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {row.headshotUrl ? (
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10">
                <Image src={row.headshotUrl} alt="" fill className="object-cover" sizes="48px" />
              </span>
            ) : null}
            <div>
              <p className="text-[16px] font-bold text-white/95">{row.name}</p>
              <p className="text-[11px] text-white/45">
                {row.position} · {row.team}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#3d4460] p-1.5 text-[#9ba3bf]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={`mt-3 rounded-lg border px-3 py-2 ${s.border} ${s.bg}`}>
          <p className={`text-[11px] font-bold ${s.text}`}>{row.statusRaw}</p>
          <p className="mt-1 text-[11px] text-white/65">{row.notes || 'No notes on file.'}</p>
          {row.practice ? <p className="mt-1 text-[10px] text-white/45">Practice: {row.practice}</p> : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
            <p className="text-[9px] uppercase text-[#5c6480]">Impact score</p>
            <p className="font-semibold text-white/90">{row.impactScore.toFixed(1)}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
            <p className="text-[9px] uppercase text-[#5c6480]">Lineup disruption</p>
            <p className="font-semibold text-white/90">{row.lineupDisruption.toFixed(1)}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
            <p className="text-[9px] uppercase text-[#5c6480]">Replacement urgency</p>
            <p className="font-semibold text-white/90">{row.replacementUrgency.toFixed(1)}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
            <p className="text-[9px] uppercase text-[#5c6480]">Source</p>
            <p className="font-semibold text-white/90">{row.source}</p>
          </div>
        </div>
        <Link
          href={getChimmyChatHrefWithPrompt(`Injury outlook for ${row.name} (${row.team}) — use only real DB injury data.`, {
            source: 'injury_player',
            player: { name: row.name, team: row.team },
          })}
          className="mt-4 inline-flex items-center gap-1 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-100"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Ask Chimmy
        </Link>
      </div>
    </div>
  )
}
