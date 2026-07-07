'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LineChart, ShieldAlert, TrendingUp } from 'lucide-react'
import type { UserLeague } from '../../types'
import { WarRoomCard } from './WarRoomCard'
import { ChampionshipGauge } from './ChampionshipGauge'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import type { TrajectorySummary } from '@/lib/trajectory/summarize'
import type { TeamForecastTrajectory } from '@/lib/trajectory/consumers/seasonForecast'

type ForecastRow = {
  teamId: string
  playoffProbability: number
  championshipProbability: number
  expectedWins: number
  expectedFinalSeed: number
  eliminationRisk: number
}

function hasLiveSeason(league: UserLeague): boolean {
  const stage = league.lifecycleState || league.status
  return stage === 'in_season' || stage === 'playoffs'
}

/**
 * Dashboard V2 Phase 3 — Team Focus "Season Outlook". Complements the This-Week's-Matchup card with
 * season-long trajectory from the real season-forecast engine (GET /api/leagues/[id]/season-forecast):
 * playoff + championship odds, expected wins, projected final seed, elimination risk. All values are
 * real, server-computed (Monte-Carlo forecast snapshot) — nothing is fabricated. Honest empty states
 * cover pre-season leagues and leagues whose forecast snapshot hasn't been generated yet.
 */
export function SeasonOutlook({ league, userId }: { league: UserLeague; userId: string | null }) {
  const { t, tInterpolate } = useLanguage()
  const [myExternalId, setMyExternalId] = useState<string | null>(null)
  const [rows, setRows] = useState<ForecastRow[] | null>(null)
  const [trajMap, setTrajMap] = useState<Record<string, TeamForecastTrajectory> | null>(null)
  const [ready, setReady] = useState(false)

  const live = hasLiveSeason(league)

  useEffect(() => {
    if (!live) {
      setReady(true)
      return
    }
    let cancelled = false

    void fetch(`/api/league/detail?leagueId=${encodeURIComponent(league.id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { teams?: Array<{ externalId: string; claimedByUserId: string | null }> } | null) => {
        if (cancelled || !data?.teams || !userId) return
        const mine = data.teams.find((tm) => tm.claimedByUserId === userId)
        if (mine) setMyExternalId(mine.externalId)
      })
      .catch(() => {})

    const season = typeof league.season === 'number' ? league.season : new Date().getFullYear()
    const week = league.currentWeek ?? 1
    void fetch(`/api/leagues/${encodeURIComponent(league.id)}/season-forecast?season=${season}&week=${week}`, {
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data:
            | { teamForecasts?: ForecastRow[] | null; trajectories?: Record<string, TeamForecastTrajectory> | null }
            | null,
        ) => {
          if (cancelled) return
          setRows(data?.teamForecasts ?? null)
          setTrajMap(data?.trajectories ?? null)
        },
      )
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [live, league.id, league.season, league.currentWeek, userId])

  const mine = useMemo(() => {
    if (!rows?.length) return null
    if (myExternalId) {
      const found = rows.find((r) => r.teamId === myExternalId)
      if (found) return found
    }
    return null
  }, [rows, myExternalId])

  // Pre-season: no season-long trajectory to project yet.
  if (!live) {
    return (
      <WarRoomCard className="flex items-start gap-3 p-4" accentBorder="rgba(52,211,153,0.14)">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300/70">
          <LineChart className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white/80">{t('dashboard.warroom.seasonOutlook.emptyPreseasonTitle')}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/40">{t('dashboard.warroom.seasonOutlook.emptyPreseasonDesc')}</p>
        </div>
      </WarRoomCard>
    )
  }

  // In-season but no forecast snapshot resolvable for this team yet.
  if (ready && !mine) {
    return (
      <WarRoomCard className="flex items-start gap-3 p-4" accentBorder="rgba(52,211,153,0.14)">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300/70">
          <LineChart className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white/80">{t('dashboard.warroom.seasonOutlook.emptyPendingTitle')}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/40">{t('dashboard.warroom.seasonOutlook.emptyPendingDesc')}</p>
        </div>
      </WarRoomCard>
    )
  }

  if (!mine) {
    // Still loading the first fetch — keep a quiet placeholder, no fabricated numbers.
    return (
      <WarRoomCard className="h-[132px] animate-pulse p-4" accentBorder="rgba(52,211,153,0.10)">
        <span className="sr-only">{t('dashboard.warroom.seasonOutlook.title')}</span>
      </WarRoomCard>
    )
  }

  const playoff = Math.round(mine.playoffProbability)
  const champ = Math.round(mine.championshipProbability)
  const elimRisk = Math.round(mine.eliminationRisk)
  const expWins = Math.round(mine.expectedWins * 10) / 10
  const seed = Math.round(mine.expectedFinalSeed)

  // Phase 3.4 — trajectory (real week-over-week movement from the Trajectory
  // Foundation). Only rendered when the metric is supported AND a real prior
  // snapshot exists; otherwise every helper returns null and the card is
  // visually identical to before. Never fabricates movement.
  const myTraj = myExternalId ? trajMap?.[myExternalId] : null

  /**
   * A subtle delta chip tied to the DISPLAYED (rounded) values, so it never
   * disagrees with the numbers on the card and stays silent for sub-display
   * movement. `invert` flips the good/bad color for metrics where lower is
   * better (projected seed). Returns null when there's nothing honest to show.
   */
  const deltaChip = (summary: TrajectorySummary | undefined, decimals: number, invert: boolean): ReactNode => {
    if (!summary || !summary.supported || !summary.hasChange) return null
    const { currentValue, previousValue } = summary
    if (currentValue == null || previousValue == null) return null
    const factor = 10 ** decimals
    const displayDelta = Math.round(currentValue * factor) / factor - Math.round(previousValue * factor) / factor
    if (displayDelta === 0) return null
    const up = displayDelta > 0
    const good = invert ? !up : up
    const magnitude = Math.abs(displayDelta)
    const magStr = decimals > 0 ? magnitude.toFixed(decimals) : String(magnitude)
    const aria = tInterpolate(
      up ? 'dashboard.warroom.seasonOutlook.changeUp' : 'dashboard.warroom.seasonOutlook.changeDown',
      { value: magStr },
    )
    return (
      <span
        className={`ml-1 inline-flex items-center gap-0.5 align-middle text-[9px] font-bold tabular-nums ${good ? 'text-emerald-300' : 'text-red-300'}`}
        aria-label={aria}
      >
        <span aria-hidden>{up ? '▲' : '▼'}</span>
        {magStr}
      </span>
    )
  }

  const playoffChip = deltaChip(myTraj?.playoffProbability, 0, false)
  const champChip = deltaChip(myTraj?.championshipProbability, 0, false)
  const winsChip = deltaChip(myTraj?.expectedWins, 1, false)
  const seedChip = deltaChip(myTraj?.expectedFinalSeed, 0, true)

  // Source-provided confidence (0–1), only when the engine reports one.
  const confidence = myTraj?.playoffProbability?.confidence ?? null
  const confidencePct = confidence != null ? Math.round(confidence * 100) : null

  return (
    <WarRoomCard className="warroom-fade-in-stagger overflow-hidden p-4" accentBorder="rgba(52,211,153,0.2)">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-300/70">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          {t('dashboard.warroom.seasonOutlook.title')}
        </p>
        {confidencePct != null ? (
          <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white/45">
            {tInterpolate('dashboard.warroom.seasonOutlook.confidence', { pct: confidencePct })}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-around gap-2">
        <ChampionshipGauge percent={playoff} label={t('dashboard.warroom.seasonOutlook.playoffOdds')} accent="#22d3ee" size={72} />
        <ChampionshipGauge percent={champ} label={t('dashboard.warroom.seasonOutlook.championshipOdds')} accent="#fbbf24" size={72} />
      </div>

      {playoffChip || champChip ? (
        <div className="mt-1 flex items-center justify-around gap-2 text-center">
          <span className="flex-1 leading-none">{playoffChip}</span>
          <span className="flex-1 leading-none">{champChip}</span>
        </div>
      ) : null}

      <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-2">
          <p className="text-[15px] font-black leading-tight text-white">
            {expWins}
            {winsChip}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35">
            {t('dashboard.warroom.seasonOutlook.expectedWins')}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-2">
          <p className="text-[15px] font-black leading-tight text-white">
            {tInterpolate('dashboard.warroom.seasonOutlook.seedValue', { seed })}
            {seedChip}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35">
            {t('dashboard.warroom.seasonOutlook.projectedSeed')}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-2">
          <p className={`flex items-center justify-center gap-1 text-[15px] font-black leading-tight ${elimRisk >= 50 ? 'text-red-300' : 'text-white'}`}>
            {elimRisk >= 50 ? <ShieldAlert className="h-3 w-3" aria-hidden /> : null}
            {elimRisk}%
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35">
            {t('dashboard.warroom.seasonOutlook.eliminationRisk')}
          </p>
        </div>
      </div>
    </WarRoomCard>
  )
}
