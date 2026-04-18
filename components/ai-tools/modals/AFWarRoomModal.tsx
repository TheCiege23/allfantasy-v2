'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronRight, Loader2, MessageSquare, Shield } from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import { AIToolModalShell } from '../AIToolModalShell'
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type {
  WarRoomCommandCenterResult,
  WarRoomStrategyId,
  WarRoomTeamContextId,
  WarRoomTimeHorizonId,
  WarRoomViewTabId,
  WarRoomToggles,
  WarRoomActionItem,
} from '@/lib/war-room-command-center/types'

type SportFilter = 'ALL' | (typeof SUPPORTED_SPORTS)[number]

const TEAM_CONTEXTS: { id: WarRoomTeamContextId; label: string }[] = [
  { id: 'my_team', label: 'My Team' },
  { id: 'specific_team', label: 'Specific Team' },
  { id: 'league_wide', label: 'League-Wide' },
  { id: 'opponent_view', label: 'Opponent View' },
  { id: 'full_portfolio', label: 'Full Portfolio' },
]

const STRATEGIES: { id: WarRoomStrategyId; label: string }[] = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'win_now', label: 'Win Now' },
  { id: 'aggressive', label: 'Aggressive' },
  { id: 'conservative', label: 'Conservative' },
  { id: 'rebuilder', label: 'Rebuilder' },
  { id: 'playoff_push', label: 'Playoff Push' },
  { id: 'streaming_focus', label: 'Streaming Focus' },
  { id: 'prospect_focus', label: 'Prospect Focus' },
  { id: 'dynasty_long_term', label: 'Dynasty Long-Term' },
  { id: 'neutral', label: 'Neutral' },
]

const TIME_HORIZONS: { id: WarRoomTimeHorizonId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'next_2_weeks', label: 'Next 2 Weeks' },
  { id: 'next_month', label: 'Next Month' },
  { id: 'rest_of_season', label: 'Rest of Season' },
  { id: 'playoff_window', label: 'Playoff Window' },
  { id: 'dynasty_long', label: 'Dynasty / Long Term' },
]

const VIEW_TABS: { id: WarRoomViewTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'actions', label: 'Actions' },
  { id: 'start_sit', label: 'Start/Sit' },
  { id: 'waivers', label: 'Waivers' },
  { id: 'trades', label: 'Trades' },
  { id: 'injuries', label: 'Injuries' },
  { id: 'trends', label: 'Trends' },
  { id: 'power', label: 'Power' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'team_outlook', label: 'Team Outlook' },
  { id: 'ai_chat', label: 'AI Chat' },
]

const DEFAULT_TOGGLES: WarRoomToggles = {
  includeNews: true,
  includeInjuries: true,
  includeWaiverSuggestions: true,
  includeTradeSuggestions: true,
  includeStartSitRecommendations: true,
  includePowerRankings: true,
  includeTrendingPlayers: true,
  includeRookieProspectIntel: false,
  includePlayoffImpact: true,
  includeDynastyWeighting: true,
}

function openTool(tool: string) {
  window.dispatchEvent(new CustomEvent('af-open-ai-tool', { detail: { tool } }))
}

export function AFWarRoomModal({
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
  const [teamContext, setTeamContext] = useState<WarRoomTeamContextId>('my_team')
  const [strategyMode, setStrategyMode] = useState<WarRoomStrategyId>('balanced')
  const [timeHorizon, setTimeHorizon] = useState<WarRoomTimeHorizonId>('this_week')
  const [specificTeamExternalId, setSpecificTeamExternalId] = useState('')
  const [opponentTeamExternalId, setOpponentTeamExternalId] = useState('')
  const [toggles, setToggles] = useState<WarRoomToggles>(DEFAULT_TOGGLES)
  const [viewTab, setViewTab] = useState<WarRoomViewTabId>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WarRoomCommandCenterResult | null>(null)
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
    if (!open || !leagueId || teamContext === 'full_portfolio') {
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
  }, [open, leagueId, teamContext])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/ai-tools/war-room/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportFilter,
          leagueId: leagueId.trim() || null,
          teamContext,
          strategyMode,
          timeHorizon,
          specificTeamExternalId:
            teamContext === 'specific_team' && specificTeamExternalId.trim()
              ? specificTeamExternalId.trim()
              : null,
          opponentTeamExternalId:
            teamContext === 'opponent_view' && opponentTeamExternalId.trim()
              ? opponentTeamExternalId.trim()
              : null,
          skipAi: false,
          toggles,
        }),
      })
      const json = (await r.json()) as WarRoomCommandCenterResult | { ok: false; error?: string }
      if (!r.ok || !json.ok) {
        setData(null)
        setError((json as { error?: string }).error || 'War Room could not load.')
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
    strategyMode,
    timeHorizon,
    specificTeamExternalId,
    opponentTeamExternalId,
    toggles,
  ])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  const chimmyHref = useMemo(() => {
    const lid = typeof data?.chimmyPayload?.leagueId === 'string' ? data.chimmyPayload.leagueId : undefined
    const prompt = data?.aiSummary
      ? `War Room summary (facts only):\n${data.aiSummary}\n\nHelp me prioritize the next roster moves.`
      : 'War Room: what should I do first with my synced league data?'
    return getChimmyChatHrefWithPrompt(prompt, {
      source: 'war_room',
      leagueId: lid,
    })
  }, [data?.aiSummary, data?.chimmyPayload])

  const headerBadge =
    data?.overview.degraded || data?.dataGaps?.length ? (
      <span className="rounded border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-200">
        Partial data
      </span>
    ) : (
      <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-200">
        Live
      </span>
    )

  const scopeNote =
    !leagueId.trim() || teamContext === 'full_portfolio' ? (
      <p className="text-[10px] text-amber-200/90">
        General / portfolio scope — pick a league for roster-specific orchestration.
      </p>
    ) : null

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="AF War Room"
      subtitle="Season strategy command center · AI orchestration"
      accentColor="rose"
      icon={<Shield className="h-5 w-5" />}
      wide
      loading={loading && !data}
      error={error}
      empty={false}
      headerBadge={headerBadge}
      onRefresh={() => void load()}
      refreshing={loading}
      chimmyPrompt="War Room: synthesize my prioritized actions from live AllFantasy modules."
      chimmyContext={data?.chimmyPayload}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value as SportFilter)}
            className="rounded-lg border border-white/10 bg-[#121725] px-2 py-1.5 text-[11px] text-white"
          >
            <option value="ALL">All sports</option>
            {SUPPORTED_SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="min-w-[160px] rounded-lg border border-white/10 bg-[#121725] px-2 py-1.5 text-[11px] text-white"
          >
            <option value="">All leagues / general</option>
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
          <select
            value={teamContext}
            onChange={(e) => setTeamContext(e.target.value as WarRoomTeamContextId)}
            className="rounded-lg border border-white/10 bg-[#121725] px-2 py-1.5 text-[11px] text-white"
          >
            {TEAM_CONTEXTS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={strategyMode}
            onChange={(e) => setStrategyMode(e.target.value as WarRoomStrategyId)}
            className="rounded-lg border border-white/10 bg-[#121725] px-2 py-1.5 text-[11px] text-white"
          >
            {STRATEGIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value as WarRoomTimeHorizonId)}
            className="rounded-lg border border-white/10 bg-[#121725] px-2 py-1.5 text-[11px] text-white"
          >
            {TIME_HORIZONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {teamContext === 'specific_team' && leagueId ? (
          <select
            value={specificTeamExternalId}
            onChange={(e) => setSpecificTeamExternalId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#121725] px-2 py-1.5 text-[11px] text-white"
          >
            <option value="">Select team…</option>
            {leagueTeams.map((t) => (
              <option key={t.externalId} value={t.externalId}>
                {t.teamName} {t.isYou ? '(you)' : ''}
              </option>
            ))}
          </select>
        ) : null}
        {teamContext === 'opponent_view' && leagueId ? (
          <select
            value={opponentTeamExternalId}
            onChange={(e) => setOpponentTeamExternalId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#121725] px-2 py-1.5 text-[11px] text-white"
          >
            <option value="">Opponent team…</option>
            {leagueTeams.map((t) => (
              <option key={t.externalId} value={t.externalId}>
                {t.teamName}
              </option>
            ))}
          </select>
        ) : null}

        {scopeNote}

        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(toggles) as (keyof WarRoomToggles)[]).map((k) => (
            <label
              key={k}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[9px] text-white/70"
            >
              <input
                type="checkbox"
                checked={toggles[k]}
                onChange={(e) => setToggles((prev) => ({ ...prev, [k]: e.target.checked }))}
                className="rounded border-white/20"
              />
              <span className="leading-tight">{k.replace(/include/g, '').replace(/([A-Z])/g, ' $1').trim()}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 border-b border-white/[0.06] pb-2">
          {VIEW_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setViewTab(t.id)}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                viewTab === t.id ? 'bg-rose-500/20 text-rose-100' : 'text-white/45 hover:text-white/75'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && !data ? (
          <div className="flex items-center gap-2 py-8 text-[12px] text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Orchestrating live modules…
          </div>
        ) : data ? (
          <WarRoomTabBody viewTab={viewTab} data={data} chimmyHref={chimmyHref} />
        ) : null}
      </div>
    </AIToolModalShell>
  )
}

function WarRoomTabBody({
  viewTab,
  data,
  chimmyHref,
}: {
  viewTab: WarRoomViewTabId
  data: WarRoomCommandCenterResult
  chimmyHref: string
}) {
  const ss = data.modules.startSit as
    | {
        recommendations?: {
          bestStart?: { player: { name: string }; reason: string }
          bestSit?: { player: { name: string }; reason: string }
        }
        matchupNotes?: string[]
        opponent?: { name: string | null }
      }
    | null
  const inj = data.modules.injury as { players?: Array<{ name: string; statusRaw: string; impactScore: number }> } | null
  const wav = data.modules.waiver as { picks?: Array<{ name: string; why: string; waiverScore: number }> } | null
  const tr = data.modules.trending as {
    risers?: Array<{ name: string; snippet: string; trendScore: number }>
    fallers?: Array<{ name: string; snippet: string }>
  } | null
  const pow = data.modules.power as { teams?: Array<{ teamName: string; rank: number; powerScore: number; isCurrentUser?: boolean }> } | null

  if (viewTab === 'overview') {
    return (
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-4">
          <MetricTile label="Command priority" value={String(data.scores.commandPriority)} sub="/100" accent="rose" />
          <MetricTile
            label="Injury risk"
            value={data.scores.teamRisk != null ? String(Math.round(data.scores.teamRisk)) : '—'}
            sub="/100"
            accent="red"
          />
          <MetricTile
            label="Waiver opportunity"
            value={data.scores.waiverOpportunity != null ? String(Math.round(data.scores.waiverOpportunity)) : '—'}
            sub="/100"
            accent="emerald"
          />
          <MetricTile
            label="Contender signal"
            value={data.scores.contenderSignal != null ? String(Math.round(data.scores.contenderSignal)) : '—'}
            sub="pwr"
            accent="violet"
          />
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0d111a] p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Command overview</p>
          <p className="mt-1 text-[13px] font-bold text-white/90">
            {data.overview.teamName || 'Your team'}{' '}
            <span className="text-white/40">·</span> {data.leagueName || 'General scope'}
          </p>
          <p className="mt-1 text-[11px] text-white/55">
            Record {data.overview.record ?? '—'} · Standings #{data.overview.standingRank ?? '—'} ·{' '}
            {data.overview.nextMatchupNote ?? 'Matchup context loads with Start/Sit sync.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.overview.topActions.map((a) => (
              <span key={a} className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-100">
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (viewTab === 'actions') {
    return <ActionQueueList actions={data.actions} conflicts={data.conflicts} />
  }

  if (viewTab === 'start_sit') {
    return (
      <div className="space-y-2">
        <ToolJumpRow tool="startSit" label="Open Start/Sit workspace" />
        {ss?.recommendations?.bestStart ? (
          <InfoRow
            title={`Start: ${ss.recommendations.bestStart.player.name}`}
            body={ss.recommendations.bestStart.reason}
          />
        ) : (
          <p className="text-[11px] text-white/45">No Start/Sit recommendation loaded — enable the module and ensure roster sync.</p>
        )}
        {ss?.recommendations?.bestSit ? (
          <InfoRow title={`Sit: ${ss.recommendations.bestSit.player.name}`} body={ss.recommendations.bestSit.reason} />
        ) : null}
      </div>
    )
  }

  if (viewTab === 'waivers') {
    return (
      <div className="space-y-2">
        <ToolJumpRow tool="waiver" label="Open Waiver Wire" />
        {(wav?.picks ?? []).slice(0, 6).map((p, i) => (
          <InfoRow key={i} title={p.name} body={`${p.why} · score ${Math.round(p.waiverScore)}`} />
        ))}
        {(wav?.picks?.length ?? 0) === 0 ? (
          <p className="text-[11px] text-white/45">No waiver picks returned for this scope.</p>
        ) : null}
      </div>
    )
  }

  if (viewTab === 'trades') {
    return (
      <div className="space-y-2">
        <ToolJumpRow tool="trade" label="Open Trade Value" />
        <p className="text-[11px] leading-relaxed text-white/55">
          Trade targets are analyzed in the Trade Value workspace using your synced roster values. War Room surfaces roster imbalance
          signals via Power + Waiver modules when enabled.
        </p>
      </div>
    )
  }

  if (viewTab === 'injuries') {
    return (
      <div className="space-y-2">
        <ToolJumpRow tool="injury" label="Open Injury Impact" />
        {(inj?.players ?? [])
          .sort((a, b) => b.impactScore - a.impactScore)
          .slice(0, 8)
          .map((p, i) => (
            <InfoRow key={i} title={`${p.name} — ${p.statusRaw}`} body={`Impact score ${Math.round(p.impactScore)}`} />
          ))}
        {(inj?.players?.length ?? 0) === 0 ? (
          <p className="text-[11px] text-white/45">No injury rows for this filter — feed may be empty.</p>
        ) : null}
      </div>
    )
  }

  if (viewTab === 'trends') {
    return (
      <div className="space-y-2">
        <ToolJumpRow tool="trending" label="Open Trending Players" />
        {(tr?.risers ?? []).slice(0, 6).map((p, i) => (
          <InfoRow key={i} title={p.name} body={p.snippet} />
        ))}
        {(tr?.risers?.length ?? 0) === 0 ? (
          <p className="text-[11px] text-white/45">No risers in this window — try a longer horizon.</p>
        ) : null}
      </div>
    )
  }

  if (viewTab === 'power') {
    return (
      <div className="space-y-2">
        <ToolJumpRow tool="power" label="Open Power Rankings" />
        <div className="max-h-[220px] overflow-y-auto rounded-xl border border-white/[0.06]">
          {(pow?.teams ?? []).map((t) => (
            <div
              key={t.teamName + t.rank}
              className={`flex justify-between border-b border-white/[0.04] px-2 py-1.5 text-[11px] ${
                t.isCurrentUser ? 'bg-amber-500/10 text-amber-100' : 'text-white/70'
              }`}
            >
              <span>
                #{t.rank} {t.teamName}
              </span>
              <span className="tabular-nums text-white/50">{t.powerScore.toFixed(1)}</span>
            </div>
          ))}
        </div>
        {(pow?.teams?.length ?? 0) === 0 ? (
          <p className="text-[11px] text-white/45">Power data not available — check league sync.</p>
        ) : null}
      </div>
    )
  }

  if (viewTab === 'schedule') {
    return (
      <div className="space-y-2">
        <p className="text-[11px] text-white/70">
          Opponent: {ss?.opponent?.name ?? '—'} · Notes: {ss?.matchupNotes?.[0] ?? '—'}
        </p>
        <ToolJumpRow tool="matchupPrep" label="Matchup Prep (league page)" />
      </div>
    )
  }

  if (viewTab === 'team_outlook') {
    return (
      <div className="space-y-2 text-[11px] leading-relaxed text-white/65">
        <p>
          Power momentum: <span className="text-white/90">{data.overview.momentumLabel ?? '—'}</span> · Injury risk{' '}
          {data.overview.injuryRisk != null ? Math.round(data.overview.injuryRisk) : '—'}
        </p>
        {data.aiSummary ? <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-white/75">{data.aiSummary}</p> : null}
        <p className="text-[10px] text-white/35">Data gaps: {data.dataGaps.join('; ') || 'none'}</p>
      </div>
    )
  }

  if (viewTab === 'ai_chat') {
    return (
      <div className="space-y-3">
        {data.aiSummary ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-[12px] leading-relaxed text-white/85">
            {data.aiSummary}
          </div>
        ) : (
          <p className="text-[11px] text-white/45">AI summary unavailable — check provider configuration.</p>
        )}
        <Link
          href={chimmyHref}
          className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-[12px] font-semibold text-rose-100"
        >
          <MessageSquare className="h-4 w-4" />
          Continue in Chimmy with War Room context
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return null
}

function MetricTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent: 'rose' | 'red' | 'emerald' | 'violet'
}) {
  const ring =
    accent === 'rose'
      ? 'border-rose-500/25'
      : accent === 'red'
        ? 'border-red-500/25'
        : accent === 'emerald'
          ? 'border-emerald-500/25'
          : 'border-violet-500/25'
  return (
    <div className={`rounded-xl border ${ring} bg-[#0d111a] px-2 py-2`}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-0.5 text-[20px] font-black tabular-nums text-white">
        {value}
        <span className="text-[11px] font-semibold text-white/35">{sub}</span>
      </p>
    </div>
  )
}

function ActionQueueList({
  actions,
  conflicts,
}: {
  actions: WarRoomActionItem[]
  conflicts: WarRoomCommandCenterResult['conflicts']
}) {
  return (
    <div className="space-y-2">
      {conflicts.length > 0 ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-2">
          <p className="text-[10px] font-bold uppercase text-amber-200/90">Conflicts</p>
          {conflicts.map((c) => (
            <p key={c.id} className="mt-1 text-[10px] text-amber-100/80">
              {c.summary}
            </p>
          ))}
        </div>
      ) : null}
      {actions.map((a) => (
        <div
          key={a.id}
          className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.06] bg-[#0d111a] px-2 py-2"
        >
          <div>
            <p className="text-[11px] font-bold text-white/90">{a.title}</p>
            <p className="text-[10px] text-white/45">{a.detail}</p>
            <p className="mt-1 text-[9px] uppercase text-white/30">
              {a.source} · urgency {a.urgency} · conf {a.confidence}
            </p>
          </div>
          {a.linkTool ? (
            <button
              type="button"
              onClick={() => openTool(a.linkTool!)}
              className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[9px] font-bold uppercase text-cyan-200"
            >
              Open
            </button>
          ) : null}
        </div>
      ))}
      {actions.length === 0 ? <p className="text-[11px] text-white/45">No actions — toggle modules or add league context.</p> : null}
    </div>
  )
}

function ToolJumpRow({ tool, label }: { tool: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => openTool(tool)}
      className="flex w-full items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-2 py-2 text-[11px] font-semibold text-cyan-100"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  )
}

function InfoRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
      <p className="text-[11px] font-semibold text-white/85">{title}</p>
      <p className="text-[10px] text-white/50">{body}</p>
    </div>
  )
}
