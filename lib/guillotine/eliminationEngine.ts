import { prisma } from '@/lib/prisma'
import { releaseRoster } from './playerPoolRecycler'
import { transitionToFinalStage } from './endgameEngine'
import { computeChopLine } from './survivalStandings'

export type EliminationResult = {
  eliminated: { rosterId: string; score: number }[]
  survived: { rosterId: string; score: number }[]
  finalStageReached: boolean
}

type RowScore = {
  rosterId: string
  teamName: string | null
  ownerId: string
  score: number
  bench: number
  seasonTotal: number
  worstPrior: number
}

async function starterAndBenchPoints(
  rosterId: string,
  week: number,
  seasonYear: number,
): Promise<{ starters: number; bench: number }> {
  const players = await prisma.redraftRosterPlayer.findMany({
    where: { rosterId, droppedAt: null },
  })
  let starters = 0
  let bench = 0
  for (const p of players) {
    const row = await prisma.playerWeeklyScore.findUnique({
      where: {
        playerId_week_season_sport: {
          playerId: p.playerId,
          week,
          season: seasonYear,
          sport: p.sport,
        },
      },
    })
    const pts = row?.fantasyPts ?? 0
    if (p.slotType === 'bench' || p.slotType === 'taxi') bench += pts
    else starters += pts
  }
  return { starters, bench }
}

async function buildRowScores(
  rosterId: string,
  redraftSeasonId: string,
  leagueId: string,
  scoringPeriod: number,
  seasonYear: number,
  sport: string,
  bestBallMode: boolean,
): Promise<RowScore | null> {
  const roster = await prisma.redraftRoster.findFirst({
    where: { id: rosterId },
  })
  if (!roster || roster.isEliminated) return null

  let score = 0
  let bench = 0

  if (bestBallMode) {
    const opt = await prisma.bestBallOptimizedLineup.findFirst({
      where: { seasonId: redraftSeasonId, rosterId, week: scoringPeriod, entryId: null },
    })
    score = opt?.totalPoints ?? 0
    const breakdown = opt?.lineupBreakdown
    if (Array.isArray(breakdown)) {
      for (const row of breakdown as { wasUsed?: boolean; points?: number }[]) {
        if (row && row.wasUsed === false) bench += Number(row.points ?? 0)
      }
    }
  } else {
    const sb = await starterAndBenchPoints(rosterId, scoringPeriod, seasonYear)
    score = sb.starters
    bench = sb.bench
  }

  const priorWeeks = Array.from({ length: Math.max(0, scoringPeriod - 1) }, (_, i) => i + 1)
  let seasonTotal = 0
  let worstPrior = Number.POSITIVE_INFINITY
  const players = await prisma.redraftRosterPlayer.findMany({ where: { rosterId, droppedAt: null } })
  for (const w of priorWeeks) {
    let weekPts = 0
    for (const p of players) {
      const row = await prisma.playerWeeklyScore.findUnique({
        where: {
          playerId_week_season_sport: {
            playerId: p.playerId,
            week: w,
            season: seasonYear,
            sport: p.sport,
          },
        },
      })
      weekPts += row?.fantasyPts ?? 0
    }
    seasonTotal += weekPts
    if (priorWeeks.length) worstPrior = Math.min(worstPrior, weekPts)
  }
  if (!Number.isFinite(worstPrior)) worstPrior = 0

  return {
    rosterId,
    teamName: roster.teamName,
    ownerId: roster.ownerId,
    score,
    bench,
    seasonTotal,
    worstPrior,
  }
}

function compareTiebreak(a: RowScore, b: RowScore, tiebreaker: string | null | undefined, tieSeed: string): number {
  const tb = tiebreaker ?? 'lowest_bench_points'
  if (tb === 'lowest_bench_points') return a.bench - b.bench
  if (tb === 'lowest_season_total') return a.seasonTotal - b.seasonTotal
  if (tb === 'worst_prior_period') return a.worstPrior - b.worstPrior
  if (tb === 'lowest_projected') return a.score - b.score
  if (tb === 'commissioner_random') return seededIndex(tieSeed + a.rosterId, 1e9) - seededIndex(tieSeed + b.rosterId, 1e9)
  return a.rosterId.localeCompare(b.rosterId)
}

function seededIndex(seed: string, n: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  return Math.abs(h) % Math.max(1, n)
}

/**
 * Run guillotine chop for a scoring period after scores are final.
 */
export async function runEliminationCheck(seasonId: string, scoringPeriod: number): Promise<EliminationResult> {
  const g = await prisma.guillotineSeason.findFirst({
    where: { id: seasonId },
    include: { league: true, redraftSeason: true },
  })
  if (!g?.redraftSeason) throw new Error('GuillotineSeason or RedraftSeason not found')

  const league = g.league
  const rs = g.redraftSeason
  const sport = rs.sport
  const seasonYear = rs.season

  let elimCount = league.guillotineEliminationsPerPeriod ?? 1
  try {
    const acc = JSON.parse(league.guillotineAcceleratedWeeks ?? '[]') as number[]
    if (Array.isArray(acc) && acc.includes(scoringPeriod)) elimCount = Math.max(elimCount, 2)
  } catch {
    /* ignore */
  }
  if (league.guillotineProtectedWeek1 && scoringPeriod === 1) elimCount = 0

  const rosters = await prisma.redraftRoster.findMany({
    where: { seasonId: rs.id, isEliminated: false },
  })

  const rows: RowScore[] = []
  for (const r of rosters) {
    const row = await buildRowScores(r.id, rs.id, league.id, scoringPeriod, seasonYear, sport, Boolean(league.bestBallMode))
    if (row) rows.push(row)
  }

  const tieSeed = `${seasonId}:${scoringPeriod}`
  const sorted = [...rows].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    return compareTiebreak(a, b, league.guillotineTiebreaker, tieSeed)
  })

  const threshold = league.guillotineEndgameThreshold ?? 1
  let active = g.currentTeamsActive
  if (elimCount > 0 && active - elimCount < threshold) {
    elimCount = Math.max(0, active - threshold)
  }

  if (elimCount <= 0 || sorted.length === 0) {
    const byHigh = [...rows].sort((a, b) => b.score - a.score)
    const chop = computeChopLine(
      rows.map((r) => ({ rosterId: r.rosterId, score: r.score })),
      1,
    )
    for (let i = 0; i < byHigh.length; i++) {
      const r = byHigh[i]!
      const margin = r.score - chop
      await prisma.guillotineSurvivalLog.upsert({
        where: {
          seasonId_rosterId_scoringPeriod: { seasonId, rosterId: r.rosterId, scoringPeriod },
        },
        create: {
          seasonId,
          leagueId: league.id,
          rosterId: r.rosterId,
          scoringPeriod,
          totalScore: r.score,
          rankAmongActive: i + 1,
          teamsActiveThisPeriod: rows.length,
          survivalStatus: 'protected',
          marginAboveChopLine: margin,
          wasInDangerZone: false,
        },
        update: {
          totalScore: r.score,
          rankAmongActive: i + 1,
          teamsActiveThisPeriod: rows.length,
          survivalStatus: 'protected',
          marginAboveChopLine: margin,
          wasInDangerZone: false,
        },
      })
    }
    await prisma.guillotineSeason.update({
      where: { id: seasonId },
      data: { currentScoringPeriod: scoringPeriod },
    })
    return { eliminated: [], survived: rows.map((x) => ({ rosterId: x.rosterId, score: x.score })), finalStageReached: false }
  }

  const toChop = sorted.slice(0, elimCount)
  const chopLineScore = sorted[elimCount]?.score ?? sorted[elimCount - 1]?.score ?? 0
  const eliminated: EliminationResult['eliminated'] = []
  const survived: EliminationResult['survived'] = []

  await prisma.$transaction(async (tx) => {
    for (const elim of toChop) {
      const rankAmongActive = sorted.findIndex((x) => x.rosterId === elim.rosterId) + 1
      const marginBelowSafe = (sorted[elimCount]?.score ?? elim.score) - elim.score

      await tx.guillotineElimination.create({
        data: {
          seasonId,
          leagueId: league.id,
          eliminatedRosterId: elim.rosterId,
          eliminatedTeamName: elim.teamName ?? 'Team',
          eliminatedOwnerId: elim.ownerId,
          scoringPeriod,
          finalScore: elim.score,
          rankAmongActive,
          marginBelowSafe,
          wasTiebreaker: false,
        },
      })

      await tx.redraftRoster.update({
        where: { id: elim.rosterId },
        data: { isEliminated: true },
      })

      eliminated.push({ rosterId: elim.rosterId, score: elim.score })
    }

    const chopSet = new Set(toChop.map((c) => c.rosterId))
    const byHigh = [...rows].sort((a, b) => b.score - a.score)
    for (let i = 0; i < byHigh.length; i++) {
      const r = byHigh[i]!
      const isElim = chopSet.has(r.rosterId)
      const margin = r.score - chopLineScore
      await tx.guillotineSurvivalLog.upsert({
        where: {
          seasonId_rosterId_scoringPeriod: { seasonId, rosterId: r.rosterId, scoringPeriod },
        },
        create: {
          seasonId,
          leagueId: league.id,
          rosterId: r.rosterId,
          scoringPeriod,
          totalScore: r.score,
          rankAmongActive: i + 1,
          teamsActiveThisPeriod: rows.length,
          survivalStatus: isElim ? 'eliminated' : 'survived',
          marginAboveChopLine: margin,
          wasInDangerZone: !isElim && margin <= 10,
        },
        update: {
          totalScore: r.score,
          rankAmongActive: i + 1,
          teamsActiveThisPeriod: rows.length,
          survivalStatus: isElim ? 'eliminated' : 'survived',
          marginAboveChopLine: margin,
          wasInDangerZone: !isElim && margin <= 10,
        },
      })
      if (!isElim) survived.push({ rosterId: r.rosterId, score: r.score })
    }

    const remaining = active - toChop.length
    const hitFinal = remaining <= (threshold > 0 ? threshold : 1)

    await tx.guillotineSeason.update({
      where: { id: seasonId },
      data: {
        currentTeamsActive: remaining,
        currentScoringPeriod: scoringPeriod,
        isInFinalStage: hitFinal || g.isInFinalStage,
      },
    })
  })

  const delay = league.guillotineWaiverDelay ?? 0
  for (const e of eliminated) {
    await releaseRoster(e.rosterId, seasonId, scoringPeriod, league.id, delay)
  }

  let finalStageReached = false
  const updated = await prisma.guillotineSeason.findFirst({ where: { id: seasonId } })
  if (updated && updated.currentTeamsActive <= (league.guillotineEndgameThreshold ?? 1)) {
    await transitionToFinalStage(seasonId, scoringPeriod)
    finalStageReached = true
  }

  return { eliminated, survived, finalStageReached }
}
