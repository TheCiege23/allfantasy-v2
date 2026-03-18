/**
 * PROMPT 4: C2C deterministic best ball snapshot. Pro bucket + optional college bucket per period.
 * College players never count toward pro best ball until promoted; promoted players not in college bucket after deadline.
 */

import { prisma } from '@/lib/prisma'
import { isC2CLeague, getC2CConfig } from '../C2CLeagueConfig'
import { optimizeC2CProBestBall, optimizeC2CCollegeBestBall } from './C2CBestBallOptimizer'
import type { BestBallPlayerInput } from '@/lib/devy/bestball/DevyBestBallOptimizer'

export interface C2CBestBallSnapshotInput {
  leagueId: string
  rosterId: string
  periodKey: string
  /** Player id -> points for this period. Include both pro and college assets. */
  playerPoints: Map<string, number>
  /** Player id -> { name, position, isNcaaDevy, isTaxi, isProRookie } */
  playerMeta: Map<
    string,
    { name: string; position: string; isNcaaDevy: boolean; isTaxi?: boolean; isProRookie?: boolean }
  >
}

/**
 * Run best ball optimization for one roster/period and persist pro (and optionally college) snapshots.
 * periodKey e.g. "2024_w1"; writes to DevyBestBallLineupSnapshot with periodKey "2024_w1_pro" and "2024_w1_college".
 */
export async function runC2CBestBallSnapshot(args: C2CBestBallSnapshotInput): Promise<{
  ok: boolean
  proPoints?: number
  collegePoints?: number
  error?: string
}> {
  const { leagueId, rosterId, periodKey, playerPoints, playerMeta } = args
  const isC2C = await isC2CLeague(leagueId)
  if (!isC2C) {
    return { ok: false, error: 'Not a C2C league' }
  }
  const config = await getC2CConfig(leagueId)
  if (!config) return { ok: false, error: 'C2C config not found' }

  const players: BestBallPlayerInput[] = []
  for (const [playerId, points] of playerPoints) {
    const meta = playerMeta.get(playerId)
    if (!meta) continue
    players.push({
      playerId,
      name: meta.name,
      position: meta.position,
      points,
      isNcaaDevy: meta.isNcaaDevy,
      isTaxi: meta.isTaxi ?? false,
      isProRookie: meta.isProRookie,
    })
  }

  const proResult = optimizeC2CProBestBall(players, config)
  const proPeriodKey = `${periodKey}_pro`
  await prisma.devyBestBallLineupSnapshot.upsert({
    where: {
      leagueId_rosterId_periodKey: { leagueId, rosterId, periodKey: proPeriodKey },
    },
    create: {
      leagueId,
      rosterId,
      periodKey: proPeriodKey,
      totalPoints: proResult.totalPoints,
      starterIds: proResult.starters.map((s) => s.playerId) as unknown as object,
    },
    update: {
      totalPoints: proResult.totalPoints,
      starterIds: proResult.starters.map((s) => s.playerId) as unknown as object,
    },
  })

  let collegePoints: number | undefined
  if (config.bestBallCollege) {
    const collegeResult = optimizeC2CCollegeBestBall(players, config)
    collegePoints = collegeResult.totalPoints
    const collegePeriodKey = `${periodKey}_college`
    await prisma.devyBestBallLineupSnapshot.upsert({
      where: {
        leagueId_rosterId_periodKey: { leagueId, rosterId, periodKey: collegePeriodKey },
      },
      create: {
        leagueId,
        rosterId,
        periodKey: collegePeriodKey,
        totalPoints: collegeResult.totalPoints,
        starterIds: collegeResult.starters.map((s) => s.playerId) as unknown as object,
      },
      update: {
        totalPoints: collegeResult.totalPoints,
        starterIds: collegeResult.starters.map((s) => s.playerId) as unknown as object,
      },
    })
  }

  return {
    ok: true,
    proPoints: proResult.totalPoints,
    collegePoints,
  }
}

/**
 * Get pro and college best ball points for a roster over a period (from snapshots).
 */
export async function getC2CBestBallPointsForPeriod(
  leagueId: string,
  rosterId: string,
  periodKey: string
): Promise<{ proPoints: number; collegePoints: number }> {
  const [pro, college] = await Promise.all([
    prisma.devyBestBallLineupSnapshot.findUnique({
      where: {
        leagueId_rosterId_periodKey: { leagueId, rosterId, periodKey: `${periodKey}_pro` },
      },
      select: { totalPoints: true },
    }),
    prisma.devyBestBallLineupSnapshot.findUnique({
      where: {
        leagueId_rosterId_periodKey: { leagueId, rosterId, periodKey: `${periodKey}_college` },
      },
      select: { totalPoints: true },
    }),
  ])
  return {
    proPoints: pro?.totalPoints ?? 0,
    collegePoints: college?.totalPoints ?? 0,
  }
}
