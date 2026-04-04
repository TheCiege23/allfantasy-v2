/**
 * C2C (Campus 2 Canton) scoring — extends redraft scoring with dual-side campus/canton totals.
 */

import type { C2CMatchupScore } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function leagueUsesC2CEngine(leagueId: string): Promise<boolean> {
  const row = await prisma.c2CLeague.findUnique({ where: { leagueId }, select: { id: true } })
  return !!row
}

export function getScoringEligibility(playerSide: string, bucketState: string, devyScoringEnabled: boolean): string {
  if (bucketState === 'campus_starter' && playerSide === 'campus') return 'counts_campus'
  if (bucketState === 'canton_starter' && playerSide === 'canton') return 'counts_canton'
  if (bucketState === 'devy' && devyScoringEnabled && playerSide === 'campus') return 'none'
  if (['bench', 'taxi', 'ir', 'devy'].includes(bucketState)) return 'display_only'
  return 'display_only'
}

async function fantasyPtsForPlayer(playerId: string, sport: string, week: number, season: number): Promise<number> {
  const row = await prisma.playerWeeklyScore.findUnique({
    where: {
      playerId_week_season_sport: { playerId, week, season, sport },
    },
  })
  return row?.fantasyPts ?? 0
}

function computeOfficialScore(
  cfg: { scoringMode: string; campusScoreWeight: number; cantonScoreWeight: number },
  campus: number,
  canton: number,
): number {
  if (cfg.scoringMode === 'weighted_combined') {
    return campus * cfg.campusScoreWeight + canton * cfg.cantonScoreWeight
  }
  return campus + canton
}

export type C2CTeamScoreComputed = {
  campusStarterScore: number
  cantonStarterScore: number
  benchDisplayScore: number
  taxiDisplayScore: number
  devyDisplayScore: number
  officialTeamScore: number
}

async function sumByBuckets(
  cfg: { scoringMode: string; campusScoreWeight: number; cantonScoreWeight: number; devyScoringEnabled: boolean },
  rows: Array<{
    playerId: string
    sport: string
    playerSide: string
    bucketState: string
  }>,
  week: number,
  season: number,
): Promise<C2CTeamScoreComputed> {
  let campusStarterScore = 0
  let cantonStarterScore = 0
  let benchDisplayScore = 0
  let taxiDisplayScore = 0
  let devyDisplayScore = 0

  for (const r of rows) {
    const elig = getScoringEligibility(r.playerSide, r.bucketState, cfg.devyScoringEnabled)
    const pts = await fantasyPtsForPlayer(r.playerId, r.sport, week, season)

    if (elig === 'counts_campus') campusStarterScore += pts
    else if (elig === 'counts_canton') cantonStarterScore += pts
    else if (elig === 'display_only') {
      if (r.bucketState === 'bench') benchDisplayScore += pts
      else if (r.bucketState === 'taxi') taxiDisplayScore += pts
      else if (r.bucketState === 'devy') devyDisplayScore += pts
      else if (r.bucketState === 'ir') benchDisplayScore += pts
      else benchDisplayScore += pts
    }
  }

  const officialTeamScore = computeOfficialScore(cfg, campusStarterScore, cantonStarterScore)
  return {
    campusStarterScore,
    cantonStarterScore,
    benchDisplayScore,
    taxiDisplayScore,
    devyDisplayScore,
    officialTeamScore,
  }
}

export async function calculateC2CTeamScore(
  leagueId: string,
  rosterId: string,
  matchupId: string,
  week: number,
  season: number,
): Promise<C2CMatchupScore> {
  const cfg = await prisma.c2CLeague.findUnique({ where: { leagueId } })
  if (!cfg) throw new Error('C2C league config not found')

  const rows = await prisma.c2CPlayerState.findMany({ where: { leagueId, rosterId } })
  const parts = await sumByBuckets(cfg, rows, week, season)

  return prisma.c2CMatchupScore.upsert({
    where: {
      leagueId_matchupId_rosterId: { leagueId, matchupId, rosterId },
    },
    create: {
      leagueId,
      matchupId,
      rosterId,
      week,
      season,
      campusStarterScore: parts.campusStarterScore,
      cantonStarterScore: parts.cantonStarterScore,
      benchDisplayScore: parts.benchDisplayScore,
      taxiDisplayScore: parts.taxiDisplayScore,
      devyDisplayScore: parts.devyDisplayScore,
      officialTeamScore: parts.officialTeamScore,
    },
    update: {
      campusStarterScore: parts.campusStarterScore,
      cantonStarterScore: parts.cantonStarterScore,
      benchDisplayScore: parts.benchDisplayScore,
      taxiDisplayScore: parts.taxiDisplayScore,
      devyDisplayScore: parts.devyDisplayScore,
      officialTeamScore: parts.officialTeamScore,
    },
  })
}

/** Recalculate both teams for a redraft matchup and persist RedraftMatchup scores. */
export async function updateC2CMatchupScores(matchupId: string): Promise<void> {
  const m = await prisma.redraftMatchup.findFirst({
    where: { id: matchupId },
    include: { season: true },
  })
  if (!m || !m.awayRosterId) return

  const cfg = await prisma.c2CLeague.findUnique({ where: { leagueId: m.leagueId } })
  if (!cfg) return

  const week = m.week
  const season = m.season.season

  const home = await calculateC2CTeamScore(m.leagueId, m.homeRosterId, matchupId, week, season)
  const away = await calculateC2CTeamScore(m.leagueId, m.awayRosterId, matchupId, week, season)

  await prisma.redraftMatchup.update({
    where: { id: matchupId },
    data: {
      homeScore: home.officialTeamScore,
      awayScore: away.officialTeamScore,
      status: 'active',
    },
  })
}
