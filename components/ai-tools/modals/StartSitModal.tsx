'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  Crosshair,
  Loader2,
  Newspaper,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'
import type { UserLeague } from '@/app/dashboard/types'
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

type SportFilter = 'ALL' | (typeof SUPPORTED_SPORTS)[number]

type StartSitMode = 'balanced' | 'safe' | 'upside'

type PlayerRow = {
  playerId: string
  recordId: string | null
  name: string
  position: string
  team: string
  projectedPoints: number | null
  floor: number | null
  ceiling: number | null
  recentFantasyAvg: number | null
  injuryStatus: string | null
  rollingFppg: number | null
  headshotUrl: string | null
}

type Rec = {
  player: PlayerRow
  reason: string
  confidence: number
}

type AnalyzeResult = {
  ok: true
  sport: string
  leagueId: string
  leagueName: string
  week: number
  weekLabel: string
  mode: StartSitMode
  leagueSettingsSnapshot: Record<string, unknown> | null
  teamContext: {
    teamName: string | null
    record: string | null
    rank: number | null
    pointsFor: number | null
  }
  opponent: { name: string | null; notes: string[] } | null
  recommendations: {
    bestStart: Rec | null
    bestSit: Rec | null
    safest: Rec | null
    upside: Rec | null
    floorOption: Rec | null
  }
  matchupNotes: string[]
  injuryNewsNotes: string[]
  reasoning: { league: string; team: string }
  confidenceScore: number
  players: PlayerRow[]
  dataGaps: string[]
  dataFreshness: string
  chimmyPayload: Record<string, unknown>
}

const MODES: { id: StartSitMode; label: string; icon: React.ReactNode; tone: string }[] = [
  { id: 'balanced', label: 'Balanced', icon: <Crosshair className="h-3 w-3" />, tone: 'Median EV' },
  { id: 'safe', label: 'Safe floor', icon: <Shield className="h-3 w-3" />, tone: 'Limit variance' },
  { id: 'upside', label: 'Upside', icon: <TrendingUp className="h-3 w-3" />, tone: 'Ceiling' },
]

function RecCard({ title, rec, accent }: { title: string; rec: Rec | null; accent: string }) {
  if (!rec) {
    return (
      <div className="rounded-[10px] border border-[#2e3347] bg-[#161b22] px-3 py-3 text-[11px] text-[#5c6480]">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#5c6480]">{title}</p>
        <p className="mt-2">Not enough projected data for this pick.</p>
      </div>
    )
  }
  const p = rec.player
  return (
    <div className={`rounded-[10px] border border-[#2e3347] bg-[#161b22] px-3 py-3 ${accent}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#5c6480]">{title}</p>
      <div className="mt-2 flex items-start gap-2">
        {p.headshotUrl ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#2e3347]">
            <Image src={p.headshotUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#2e3347] bg-[#242838] text-[10px] font-bold text-[#5c6480]">
            {p.position}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-[#e8eaf6]">{p.name}</p>
          <p className="text-[10px] text-[#5c6480]">
            {p.position} · {p.team}
          </p>
          <div className="mt-1 grid grid-cols-3 gap-1 text-center">
            <div className="rounded-[6px] bg-[#242838] px-1 py-1">
              <p className="text-[8px] text-[#5c6480]">Proj</p>
              <p className="text-[12px] font-bold text-[#e8eaf6]">{p.projectedPoints != null ? p.projectedPoints.toFixed(1) : '—'}</p>
            </div>
            <div className="rounded-[6px] bg-[#242838] px-1 py-1">
              <p className="text-[8px] text-[#5c6480]">Floor</p>
              <p className="text-[12px] font-bold text-[#e8eaf6]">{p.floor != null ? p.floor.toFixed(1) : '—'}</p>
            </div>
            <div className="rounded-[6px] bg-[#242838] px-1 py-1">
              <p className="text-[8px] text-[#5c6480]">Ceil</p>
              <p className="text-[12px] font-bold text-[#e8eaf6]">{p.ceiling != null ? p.ceiling.toFixed(1) : '—'}</p>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[#9ba3bf]">{rec.reason}</p>
          <p className="mt-1 text-[9px] text-[#5c6480]">Confidence {rec.confidence}%</p>
        </div>
      </div>
    </div>
  )
}

export function StartSitModal({
  open,
  onClose,
  leagueId,
  leagueName,
  leagues = [],
  initialSport = 'NFL',
}: {
  open: boolean
  onClose: () => void
  leagueId: string
  leagueName: string
  leagues?: UserLeague[]
  initialSport?: string
}) {
  const [sportFilter, setSportFilter] = useState<SportFilter>('ALL')
  const [activeLeagueId, setActiveLeagueId] = useState(leagueId)
  const [teamExternalId, setTeamExternalId] = useState('')
  const [week, setWeek] = useState('current')
  const [mode, setMode] = useState<StartSitMode>('balanced')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [leagueTeams, setLeagueTeams] = useState<
    Array<{ externalId: string; teamName: string; ownerName: string; isYou?: boolean }>
  >([])

  useEffect(() => {
    if (!open) return
    const s = (initialSport || 'NFL').toUpperCase()
    const match = SUPPORTED_SPORTS.includes(s as (typeof SUPPORTED_SPORTS)[number])
    setSportFilter(match ? (s as SportFilter) : 'ALL')
    setActiveLeagueId(leagueId)
  }, [open, leagueId, initialSport])

  useEffect(() => {
    if (!open || !activeLeagueId) {
      setLeagueTeams([])
      return
    }
    let cancelled = false
    fetch(`/api/trade-value/league-teams?leagueId=${encodeURIComponent(activeLeagueId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.teams) return
        setLeagueTeams(j.teams)
      })
      .catch(() => {
        if (!cancelled) setLeagueTeams([])
      })
    return () => {
      cancelled = true
    }
  }, [open, activeLeagueId])

  const activeLeague = useMemo(
    () => leagues.find((l) => l.id === activeLeagueId) ?? null,
    [leagues, activeLeagueId],
  )
  const displayLeagueName = activeLeague?.name ?? leagueName

  const filteredLeagues = useMemo(() => {
    if (sportFilter === 'ALL') return leagues
    return leagues.filter((l) => String(l.sport).toUpperCase() === sportFilter)
  }, [leagues, sportFilter])

  const runAnalyze = useCallback(async () => {
    if (!activeLeagueId) {
      setResult(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/ai-tools/start-sit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportFilter,
          leagueId: activeLeagueId,
          week,
          mode,
          teamExternalId: teamExternalId || null,
        }),
      })
      const j = (await r.json()) as AnalyzeResult & { ok?: boolean; error?: string; code?: string }
      if (!r.ok || !j.ok) {
        setError(j.error || 'Analysis failed.')
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
  }, [activeLeagueId, sportFilter, week, mode, teamExternalId])

  useEffect(() => {
    if (open && activeLeagueId) void runAnalyze()
  }, [open, activeLeagueId, runAnalyze])

  const chimmyHref = getChimmyChatHrefWithPrompt(
    result?.chimmyPayload
      ? 'Explain Start/Sit using only the attached structured league and roster payload.'
      : `Start/Sit help for ${displayLeagueName}`,
    {
      leagueId: activeLeagueId || undefined,
      leagueName: displayLeagueName,
      sport: sportFilter === 'ALL' ? undefined : sportFilter,
      insightType: 'matchup',
      source: 'lineup_tool',
    },
  )

  const badges = result?.leagueSettingsSnapshot?.quickModeBadges
  const quickBadges = Array.isArray(badges) ? (badges as string[]) : []

  return (
    <AIToolModalShell
      open={open}
      onClose={onClose}
      title="Start/Sit"
      subtitle="AI decision engine · live roster data"
      accentColor="cyan"
      icon={<Crosshair className="h-5 w-5" />}
      wide
      loading={false}
      error={error}
      empty={!activeLeagueId}
      emptyMessage="Choose a league to load your synced roster and scoring context."
      onRefresh={() => void runAnalyze()}
      refreshing={loading}
      chimmyPrompt={
        result?.chimmyPayload
          ? 'Review Start/Sit with Chimmy — structured context is ready.'
          : `Start/Sit in ${displayLeagueName}`
      }
      chimmyContext={result?.chimmyPayload ?? { source: 'start_sit_modal' }}
      headerBadge={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-200">
          <Activity className="h-3 w-3" />
          Live data
        </span>
      }
    >
      <div className="at-panel mb-3 p-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="at-section-title !mb-0">Sport</span>
            <select
              value={sportFilter}
              onChange={(e) => {
                setSportFilter(e.target.value as SportFilter)
                setActiveLeagueId('')
              }}
              className="at-select w-full px-2 py-2"
            >
              <option value="ALL">All</option>
              {SUPPORTED_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="at-section-title !mb-0">League</span>
            <select
              value={activeLeagueId}
              onChange={(e) => {
                const v = e.target.value
                setActiveLeagueId(v)
                const lg = leagues.find((l) => l.id === v)
                if (lg) setSportFilter(String(lg.sport).toUpperCase() as SportFilter)
                setTeamExternalId('')
              }}
              className="at-select w-full px-2 py-2"
              disabled={filteredLeagues.length === 0 && leagues.length === 0}
            >
              <option value="">— Select league —</option>
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
          <label className="flex flex-col gap-1">
            <span className="at-section-title !mb-0">Team</span>
            <select
              value={teamExternalId}
              onChange={(e) => setTeamExternalId(e.target.value)}
              className="at-select w-full px-2 py-2"
              disabled={!activeLeagueId || leagueTeams.length === 0}
            >
              <option value="">My team (default)</option>
              {leagueTeams.map((t) => (
                <option key={t.externalId} value={t.externalId}>
                  {t.teamName || t.ownerName}
                  {t.isYou ? ' (you)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="at-section-title !mb-0">Week</span>
            <select value={week} onChange={(e) => setWeek(e.target.value)} className="at-select w-full px-2 py-2">
              <option value="current">Current</option>
              <option value="next">Next</option>
              {Array.from({ length: 18 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  Week {i + 1}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`at-lens-btn flex min-w-[100px] flex-1 flex-col items-center gap-0.5 py-2 sm:flex-row sm:justify-center ${
              mode === m.id ? 'at-lens-btn--active' : ''
            }`}
          >
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold">
              {m.icon} {m.label}
            </span>
            <span className={`text-[10px] opacity-80 ${mode === m.id ? 'text-[#5b8ef0]' : 'text-[#5c6480]'}`}>
              {m.tone}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-[#5c6480]">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" /> Building lineup intelligence…
        </div>
      ) : null}

      {result && !loading ? (
        <>
          <div className="at-panel mb-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#5c6480]">{result.weekLabel}</p>
              <p className="text-[14px] font-semibold text-[#e8eaf6]">{result.leagueName}</p>
              <p className="mt-1 text-[11px] text-[#9ba3bf]">{result.reasoning.league}</p>
              {quickBadges.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {quickBadges.map((b) => (
                    <span
                      key={b}
                      className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#9ba3bf]"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="text-right">
              <p className="at-section-title !mb-0 text-right">Confidence</p>
              <p className="text-[22px] font-bold tabular-nums text-[#00d4aa]">{result.confidenceScore}%</p>
            </div>
          </div>

          <div className="at-panel mb-3 px-4 py-3">
            <p className="at-section-title mb-2 flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-cyan-400" /> Team context
            </p>
            <p className="text-[12px] text-[#9ba3bf]">{result.reasoning.team}</p>
            {result.opponent?.name ? (
              <p className="mt-2 text-[12px] font-semibold text-[#e8eaf6]">
                Opponent: <span className="text-cyan-300">{result.opponent.name}</span>
              </p>
            ) : null}
            {result.matchupNotes.map((n, i) => (
              <p key={i} className="mt-1 text-[11px] text-[#5c6480]">
                {n}
              </p>
            ))}
          </div>

          <p className="at-section-title mb-2">AI recommendations (data-grounded)</p>
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <RecCard title="Primary start" rec={result.recommendations.bestStart} accent="border-l-[3px] border-l-cyan-500/70" />
            <RecCard title="Sit candidate" rec={result.recommendations.bestSit} accent="border-l-[3px] border-l-rose-500/50" />
            <RecCard title="Safest" rec={result.recommendations.safest} accent="border-l-[3px] border-l-emerald-500/50" />
            <RecCard title="Upside" rec={result.recommendations.upside} accent="border-l-[3px] border-l-amber-500/50" />
            <RecCard title="Floor play" rec={result.recommendations.floorOption} accent="border-l-[3px] border-l-sky-500/50" />
          </div>

          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <div className="at-panel p-3">
              <div className="mb-2 flex items-center gap-2">
                <Newspaper className="h-3.5 w-3.5 text-[#f06060]" />
                <p className="at-section-title !mb-0">Injury & news (real feeds)</p>
              </div>
              <ul className="max-h-[140px] space-y-2 overflow-y-auto text-[11px] text-[#9ba3bf] [scrollbar-width:thin]">
                {result.injuryNewsNotes.length === 0 ? (
                  <li className="text-[#5c6480]">No headlines returned for this snapshot.</li>
                ) : (
                  result.injuryNewsNotes.map((line, i) => (
                    <li key={i} className="border-b border-[#2e3347]/80 pb-2 last:border-0">
                      {line}
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="at-panel p-3">
              <p className="at-section-title mb-2">Matchup notes</p>
              <ul className="text-[11px] text-[#9ba3bf]">
                {result.matchupNotes.length === 0 ? (
                  <li className="text-[#5c6480]">No extra matchup notes.</li>
                ) : (
                  result.matchupNotes.map((n, i) => <li key={i}>{n}</li>)
                )}
              </ul>
            </div>
          </div>

          <p className="at-section-title mb-2">Roster (live DB)</p>
          <div className="at-panel overflow-x-auto p-0">
            <table className="w-full min-w-[520px] text-left text-[11px]">
              <thead className="border-b border-[#2e3347] bg-[#161b22] text-[9px] font-bold uppercase tracking-wide text-[#5c6480]">
                <tr>
                  <th className="px-2 py-2">Player</th>
                  <th className="px-2 py-2">Pos</th>
                  <th className="px-2 py-2">Proj</th>
                  <th className="px-2 py-2">Floor</th>
                  <th className="px-2 py-2">Ceil</th>
                  <th className="px-2 py-2">RI FPPG</th>
                  <th className="px-2 py-2">Injury</th>
                </tr>
              </thead>
              <tbody>
                {result.players.map((p) => (
                  <tr key={p.playerId} className="border-b border-[#2e3347]/60">
                    <td className="px-2 py-2 font-semibold text-[#e8eaf6]">{p.name}</td>
                    <td className="px-2 py-2 text-[#9ba3bf]">{p.position}</td>
                    <td className="px-2 py-2 tabular-nums">{p.projectedPoints != null ? p.projectedPoints.toFixed(1) : '—'}</td>
                    <td className="px-2 py-2 tabular-nums">{p.floor != null ? p.floor.toFixed(1) : '—'}</td>
                    <td className="px-2 py-2 tabular-nums">{p.ceiling != null ? p.ceiling.toFixed(1) : '—'}</td>
                    <td className="px-2 py-2 tabular-nums">{p.rollingFppg != null ? p.rollingFppg.toFixed(1) : '—'}</td>
                    <td className="px-2 py-2 text-[10px] text-amber-200/90">{p.injuryStatus ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.dataGaps.length > 0 ? (
            <p className="mt-3 text-[10px] text-amber-200/85">
              Data gaps: {result.dataGaps.slice(0, 4).join(' · ')}
              {result.dataGaps.length > 4 ? '…' : ''}
            </p>
          ) : null}
          <p className="mt-1 text-[9px] text-[#5c6480]">Updated {new Date(result.dataFreshness).toLocaleString()}</p>
        </>
      ) : null}

      <div className="at-panel mt-4 border-[#2e3347] bg-[#161b22] p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#a78bfa]/50 bg-[rgba(167,139,250,0.12)] text-[11px] font-bold text-[#a78bfa]">
            C
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#a78bfa]">Ask Chimmy</p>
            <p className="text-[9px] text-[#5c6480]">Uses structured roster + league payload when analysis has run</p>
          </div>
        </div>
        <Link
          href={chimmyHref}
          className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#a78bfa]/40 bg-[rgba(167,139,250,0.1)] px-3 py-2 text-[11px] font-semibold text-[#a78bfa] no-underline hover:bg-[rgba(167,139,250,0.18)]"
        >
          <Sparkles className="h-3.5 w-3.5" /> Open in Messages AI
        </Link>
        <p className="mt-2 text-[11px] text-[#5c6480]">
          Projections and floors use your `sports_players` row and league scoring hints — nothing is invented.
        </p>
      </div>
    </AIToolModalShell>
  )
}
