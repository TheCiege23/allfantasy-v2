'use client'

import { useEffect, useMemo, useState } from 'react'
import { LineChart, ShieldAlert, TrendingUp } from 'lucide-react'
import type { UserLeague } from '../../types'
import { WarRoomCard } from './WarRoomCard'
import { ChampionshipGauge } from './ChampionshipGauge'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { DeltaChip, ConfidenceChip, computeDisplayDelta } from './trajectory'
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

  // Phase 3.4/3.5 — trajectory (real week-over-week movement from the Trajectory
  // Foundation), rendered via the shared trajectory visual-language primitives.
  // Chips self-gate silently when a metric is unsupported or has no prior
  // snapshot, so the card stays visually identical until real history exists.
  const myTraj = myExternalId ? trajMap?.[myExternalId] : null
  const playoffTraj = myTraj?.playoffProbability
  const champTraj = myTraj?.championshipProbability
  // Gate the odds delta row on the same display-visibility the chip itself uses.
  const hasOddsChip = Boolean(
    computeDisplayDelta(playoffTraj, 0)?.visible || computeDisplayDelta(champTraj, 0)?.visible,
  )
  // Source-provided confidence (0–1), only when the engine reports one.
  const confidence = playoffTraj?.confidence ?? null

  return (
    <WarRoomCard className="warroom-fade-in-stagger overflow-hidden p-4" accentBorder="rgba(52,211,153,0.2)">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-300/70">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          {t('dashboard.warroom.seasonOutlook.title')}
        </p>
        <ConfidenceChip confidence={confidence} />
      </div>

      <div className="flex items-center justify-around gap-2">
        <ChampionshipGauge percent={playoff} label={t('dashboard.warroom.seasonOutlook.playoffOdds')} accent="#22d3ee" size={72} />
        <ChampionshipGauge percent={champ} label={t('dashboard.warroom.seasonOutlook.championshipOdds')} accent="#fbbf24" size={72} />
      </div>

      {hasOddsChip ? (
        <div className="mt-1 flex items-center justify-around gap-2 text-center">
          <span className="flex-1 leading-none">
            <DeltaChip summary={playoffTraj} decimals={0} />
          </span>
          <span className="flex-1 leading-none">
            <DeltaChip summary={champTraj} decimals={0} />
          </span>
        </div>
      ) : null}

      <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-2">
          <p className="text-[15px] font-black leading-tight text-white">
            {expWins}
            <DeltaChip summary={myTraj?.expectedWins} decimals={1} className="ml-1 align-middle" />
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35">
            {t('dashboard.warroom.seasonOutlook.expectedWins')}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-2">
          <p className="text-[15px] font-black leading-tight text-white">
            {tInterpolate('dashboard.warroom.seasonOutlook.seedValue', { seed })}
            <DeltaChip summary={myTraj?.expectedFinalSeed} decimals={0} invert className="ml-1 align-middle" />
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
