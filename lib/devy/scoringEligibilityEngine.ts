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

export type RosterWeeklyPointsEntry = {
  fantasyPts: number
  eligibility: ScoringEligibility
  bucketState: string
}

function mapRedraftSlotToBucket(slotType: string): string {
  const s = slotType.toLowerCase()
  if (s === 'bench') return 'active_bench'
  if (s === 'taxi') return 'taxi'
  if (s === 'devy') return 'devy'
  if (s === 'ir' || s === 'injured_reserve') return 'ir'
  return 'active_starter'
}

/**
 * Per-player fantasy points for a week, aligned with devy bucket / eligibility (devy = no scoring).
 */
export async function getWeeklyPointsBreakdownForRoster(
  leagueId: string,
  rosterId: string,
  week: number,
  seasonYear: number,
): Promise<{ week: number; season: number; byPlayerId: Record<string, RosterWeeklyPointsEntry> }> {
  const rp = await prisma.redraftRosterPlayer.findMany({
    where: { rosterId, droppedAt: null },
  })
  const sportByPlayer = new Map(rp.map(r => [r.playerId, r.sport]))

  const [states, taxiSlots, devySlots] = await Promise.all([
    prisma.devyPlayerState.findMany({ where: { leagueId, rosterId } }),
    prisma.devyTaxiSlot.findMany({ where: { leagueId, rosterId } }),
    prisma.devyDevySlot.findMany({ where: { leagueId, rosterId } }),
  ])

  const byPlayerId: Record<string, RosterWeeklyPointsEntry> = {}

  if (states.length > 0) {
    for (const s of states) {
      byPlayerId[s.playerId] = {
        fantasyPts: 0,
        eligibility: getScoringEligibility(s.bucketState, s.playerType),
        bucketState: s.bucketState,
      }
    }
  } else {
    for (const r of rp) {
      const bucket = mapRedraftSlotToBucket(r.slotType)
      byPlayerId[r.playerId] = {
        fantasyPts: 0,
        eligibility: getScoringEligibility(bucket, 'nfl_veteran'),
        bucketState: bucket,
      }
    }
  }

  for (const t of taxiSlots) {
    if (!byPlayerId[t.playerId]) {
      byPlayerId[t.playerId] = {
        fantasyPts: 0,
        eligibility: getScoringEligibility('taxi', 'nfl_rookie'),
        bucketState: 'taxi',
      }
    }
  }

  for (const d of devySlots) {
    if (byPlayerId[d.playerId]) continue
    byPlayerId[d.playerId] = {
      fantasyPts: 0,
      eligibility: 'none',
      bucketState: 'devy',
    }
  }

  const idsToScore = Object.keys(byPlayerId).filter(pid => byPlayerId[pid].eligibility !== 'none')
  if (idsToScore.length === 0) {
    return { week, season: seasonYear, byPlayerId }
  }

  const scores = await prisma.playerWeeklyScore.findMany({
    where: {
      week,
      season: seasonYear,
      playerId: { in: idsToScore },
    },
  })

  const ptsByPlayer = new Map<string, number>()
  for (const sc of scores) {
    const want = sportByPlayer.get(sc.playerId)
    if (want && sc.sport !== want) continue
    ptsByPlayer.set(sc.playerId, sc.fantasyPts)
  }

  for (const pid of idsToScore) {
    const row = byPlayerId[pid]
    if (row) row.fantasyPts = ptsByPlayer.get(pid) ?? 0
  }

  return { week, season: seasonYear, byPlayerId }
}
