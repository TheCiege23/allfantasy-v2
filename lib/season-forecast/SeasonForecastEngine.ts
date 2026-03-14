/**
 * SeasonForecastEngine
 *
 * Orchestrates loading league context, running many season simulations,
 * aggregating playoff/championship odds, and persisting SeasonForecastSnapshot.
 */

import { prisma } from '@/lib/prisma'
import { getRemainingSchedule } from './RemainingScheduleSimulator'
import { runOneSimulation } from './StandingsProjectionCalculator'
import { calculatePlayoffOdds } from './PlayoffOddsCalculator'
import { calculateChampionshipOdds } from './ChampionshipOddsCalculator'
import { scoreForecastConfidence, scoreTeamConfidence } from './ForecastConfidenceScorer'
import type { LeagueForecastContext, TeamSeasonForecast } from './types'

const DEFAULT_SIMULATIONS = 2000
const DEFAULT_TOTAL_WEEKS = 14
const DEFAULT_PLAYOFF_SPOTS_RATIO = 0.5
const DEFAULT_BYE_SPOTS = 0

export interface SeasonForecastEngineInput {
  leagueId: string
  season: number
  week: number
  /** Override total regular season weeks (default 14) */
  totalWeeks?: number
  /** Override playoff spots (default half of teams) */
  playoffSpots?: number
  /** Bye spots for top seeds (default 0) */
  byeSpots?: number
  simulations?: number
}

/**
 * Load standings and team projections from DB (RankingsSnapshot + LeagueTeam or LegacyRoster).
 */
async function loadContext(input: SeasonForecastEngineInput): Promise<LeagueForecastContext | null> {
  const { leagueId, season, week } = input
  const totalWeeks = input.totalWeeks ?? DEFAULT_TOTAL_WEEKS
  const playoffSpots = input.playoffSpots ?? undefined
  const byeSpots = input.byeSpots ?? DEFAULT_BYE_SPOTS

  const snap = await prisma.rankingsSnapshot.findMany({
    where: { leagueId, season: String(season), week },
  })
  if (!snap.length) return null

  const teamIds = [...new Set(snap.map((s) => s.rosterId))]

  const standings = new Map<string, { wins: number; losses: number; ties: number; pointsFor: number }>()
  const teamProjections = new Map<string, { mean: number; stdDev: number }>()

  const league = await prisma.league.findFirst({
    where: { platformLeagueId: leagueId },
    include: { teams: true },
  })

  const legacyLeague = await prisma.legacyLeague.findFirst({
    where: { sleeperLeagueId: leagueId, season },
    include: { rosters: true },
  })

  for (const row of snap) {
    const tid = row.rosterId
    const composite = Number(row.composite ?? 0)
    const expectedWins = row.expectedWins != null ? Number(row.expectedWins) : 7
    let wins = 0
    let losses = 0
    let ties = 0
    let pointsFor = 0

    const lt = league?.teams.find((t) => t.externalId === tid)
    if (lt) {
      wins = lt.wins ?? 0
      losses = lt.losses ?? 0
      ties = lt.ties ?? 0
      pointsFor = lt.pointsFor ?? 0
    } else {
      const lr = legacyLeague?.rosters.find((r) => String(r.rosterId) === tid)
      if (lr) {
        wins = lr.wins ?? 0
        losses = lr.losses ?? 0
        ties = lr.ties ?? 0
        pointsFor = Number(lr.pointsFor ?? 0)
      }
    }

    standings.set(tid, { wins, losses, ties, pointsFor })
    const mean = composite > 0 ? 80 + (composite / 100) * 40 : 90 + (expectedWins / totalWeeks) * 20
    teamProjections.set(tid, { mean, stdDev: 12 })
  }

  const remainingSchedule = await getRemainingSchedule({
    leagueId,
    season,
    currentWeek: week,
    totalWeeks,
    teamIds,
  })

  const teamCount = teamIds.length
  const playoffSpotsFinal =
    playoffSpots ?? Math.max(2, Math.floor(teamCount * (DEFAULT_PLAYOFF_SPOTS_RATIO)))

  return {
    leagueId,
    season,
    currentWeek: week,
    totalWeeks,
    playoffSpots: playoffSpotsFinal,
    byeSpots: Math.min(byeSpots, playoffSpotsFinal),
    teamCount,
    standings,
    teamProjections,
    remainingSchedule,
  }
}

/**
 * Run the full forecast pipeline and persist snapshot.
 */
export async function runSeasonForecast(
  input: SeasonForecastEngineInput
): Promise<{ snapshotId: string; teamForecasts: TeamSeasonForecast[] } | null> {
  const ctx = await loadContext(input)
  if (!ctx || ctx.remainingSchedule.length === 0) return null

  const simCount = input.simulations ?? DEFAULT_SIMULATIONS
  const results: ReturnType<typeof runOneSimulation>[] = []

  for (let i = 0; i < simCount; i++) {
    results.push(
      runOneSimulation({
        standings: ctx.standings,
        teamProjections: ctx.teamProjections,
        remainingSchedule: ctx.remainingSchedule,
      })
    )
  }

  const playoffOdds = calculatePlayoffOdds({
    simulationResults: results,
    playoffSpots: ctx.playoffSpots,
    byeSpots: ctx.byeSpots,
    teamIds: Array.from(ctx.standings.keys()),
  })

  const champCount = calculateChampionshipOdds({
    simulationResults: results,
    playoffSpots: ctx.playoffSpots,
    teamProjections: ctx.teamProjections,
  })

  const baseConfidence = scoreForecastConfidence({
    simulationCount: simCount,
    dataWeeksUsed: ctx.currentWeek,
    totalWeeksInSeason: ctx.totalWeeks,
  })

  const teamForecasts: TeamSeasonForecast[] = playoffOdds.map((po) => {
    const champPct = (champCount.get(po.teamId) ?? 0) / simCount * 100
    const confidence = scoreTeamConfidence(baseConfidence)
    return {
      teamId: po.teamId,
      playoffProbability: po.playoffProbability,
      firstPlaceProbability: po.firstPlaceProbability,
      championshipProbability: Math.round(champPct * 10) / 10,
      expectedWins: po.expectedWins,
      expectedFinalSeed: po.expectedFinalSeed,
      finishRange: po.finishRange,
      eliminationRisk: po.eliminationRisk,
      byeProbability: po.byeProbability,
      confidenceScore: confidence,
    }
  })

  const snapshot = await prisma.seasonForecastSnapshot.upsert({
    where: {
      uniq_season_forecast_league_season_week: {
        leagueId: ctx.leagueId,
        season: ctx.season,
        week: ctx.currentWeek,
      },
    },
    create: {
      leagueId: ctx.leagueId,
      season: ctx.season,
      week: ctx.currentWeek,
      teamForecasts: teamForecasts as unknown as object,
    },
    update: {
      teamForecasts: teamForecasts as unknown as object,
    },
  })

  return { snapshotId: snapshot.id, teamForecasts }
}

/**
 * Fetch latest forecast for a league/season/week (read-only).
 */
export async function getSeasonForecast(
  leagueId: string,
  season: number,
  week: number
): Promise<TeamSeasonForecast[] | null> {
  const row = await prisma.seasonForecastSnapshot.findUnique({
    where: {
      uniq_season_forecast_league_season_week: { leagueId, season, week },
    },
  })
  if (!row?.teamForecasts) return null
  return row.teamForecasts as unknown as TeamSeasonForecast[]
}
