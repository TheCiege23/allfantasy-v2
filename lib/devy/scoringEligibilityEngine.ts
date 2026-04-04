import { prisma } from '@/lib/prisma'

export type ScoringEligibility = 'counts' | 'display_only' | 'none'

export type TeamScoreResult = {
  officialScore: number
  displayBenchScore: number
  displayTaxiScore: number
  devyScore: number
}

export function getScoringEligibility(bucketState: string, _playerType: string): ScoringEligibility {
  if (bucketState === 'active_starter') return 'counts'
  if (bucketState === 'devy') return 'none'
  if (bucketState === 'taxi') return 'display_only'
  if (bucketState === 'active_bench') return 'display_only'
  if (bucketState === 'ir') return 'display_only'
  return 'display_only'
}

async function sumWeeklyPointsForPlayers(
  playerRows: { playerId: string; sport: string }[],
  week: number,
  season: number,
): Promise<number> {
  let pts = 0
  for (const p of playerRows) {
    const row = await prisma.playerWeeklyScore.findUnique({
      where: {
        playerId_week_season_sport: {
          playerId: p.playerId,
          week,
          season,
          sport: p.sport,
        },
      },
    })
    pts += row?.fantasyPts ?? 0
  }
  return pts
}

/** Fallback when `DevyPlayerState` rows are not yet synced: mirror redraft slot scoring (starters only). */
async function scoreFromRedraftRoster(
  rosterId: string,
  week: number,
  season: number,
): Promise<TeamScoreResult> {
  const starters = await prisma.redraftRosterPlayer.findMany({
    where: {
      rosterId,
      droppedAt: null,
      slotType: { notIn: ['bench', 'taxi', 'devy'] },
    },
  })
  const bench = await prisma.redraftRosterPlayer.findMany({
    where: {
      rosterId,
      droppedAt: null,
      slotType: 'bench',
    },
  })
  const taxi = await prisma.redraftRosterPlayer.findMany({
    where: {
      rosterId,
      droppedAt: null,
      slotType: 'taxi',
    },
  })
  const officialScore = await sumWeeklyPointsForPlayers(starters, week, season)
  const displayBenchScore = await sumWeeklyPointsForPlayers(bench, week, season)
  const displayTaxiScore = await sumWeeklyPointsForPlayers(taxi, week, season)
  return {
    officialScore,
    displayBenchScore,
    displayTaxiScore,
    devyScore: 0,
  }
}

/**
 * Official score = starters only. Bench/taxi may be summed for display. Devy never scores.
 * When no `DevyPlayerState` exists yet for this roster, falls back to redraft slot lines.
 */
export async function calculateOfficialTeamScore(
  leagueId: string,
  rosterId: string,
  week: number,
  season: number,
): Promise<TeamScoreResult> {
  const devyLeague = await prisma.devyLeague.findUnique({ where: { leagueId } })
  if (!devyLeague) {
    const starters = await prisma.redraftRosterPlayer.findMany({
      where: {
        rosterId,
        droppedAt: null,
        slotType: { notIn: ['bench', 'taxi', 'devy'] },
      },
    })
    const officialScore = await sumWeeklyPointsForPlayers(starters, week, season)
    return { officialScore, displayBenchScore: 0, displayTaxiScore: 0, devyScore: 0 }
  }

  const states = await prisma.devyPlayerState.findMany({
    where: { leagueId, rosterId },
  })

  if (states.length === 0) {
    return scoreFromRedraftRoster(rosterId, week, season)
  }

  const starters = states.filter(s => s.bucketState === 'active_starter')

  const sportByPlayer = new Map<string, string>()
  const rp = await prisma.redraftRosterPlayer.findMany({
    where: { rosterId, droppedAt: null },
  })
  for (const row of rp) {
    sportByPlayer.set(row.playerId, row.sport)
  }

  async function sumBucket(bucket: string): Promise<number> {
    const ids = states.filter(s => s.bucketState === bucket).map(s => s.playerId)
    const rows = ids.map(playerId => ({
      playerId,
      sport: sportByPlayer.get(playerId) ?? 'NFL',
    }))
    return sumWeeklyPointsForPlayers(rows, week, season)
  }

  let officialScore = 0
  for (const s of starters) {
    const sport = sportByPlayer.get(s.playerId) ?? 'NFL'
    const row = await prisma.playerWeeklyScore.findUnique({
      where: {
        playerId_week_season_sport: {
          playerId: s.playerId,
          week,
          season,
          sport,
        },
      },
    })
    officialScore += row?.fantasyPts ?? 0
  }

  const displayBenchScore = await sumBucket('active_bench')
  const displayTaxiScore = await sumBucket('taxi')
  const devyScore = 0

  return { officialScore, displayBenchScore, displayTaxiScore, devyScore }
}

export async function leagueUsesDevyEngine(leagueId: string): Promise<boolean> {
  const row = await prisma.devyLeague.findUnique({ where: { leagueId }, select: { id: true } })
  return row != null
}
