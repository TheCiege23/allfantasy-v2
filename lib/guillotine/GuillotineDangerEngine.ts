/**
 * Danger engine: Chop Zone (lowest projected), Danger Tier (within margin), Safe Tier.
 * Live standings feed for guillotine view.
 */

import { prisma } from '@/lib/prisma'
import { getGuillotineConfig } from './GuillotineLeagueConfig'
import type { GuillotineDangerRow, DangerTier } from './types'

export interface GetDangerTiersInput {
  leagueId: string
  weekOrPeriod: number
  /** Projected points per roster for this period (rosterId -> points). If not provided, uses seasonPointsCumul as proxy. */
  projectedPointsByRoster?: Map<string, number>
  /** Override danger margin (points below lowest = danger). */
  dangerMarginPoints?: number | null
}

/**
 * Compute Chop Zone (lowest projected), Danger Tier (within margin of lowest), Safe Tier.
 */
export async function getDangerTiers(input: GetDangerTiersInput): Promise<GuillotineDangerRow[]> {
  const config = await getGuillotineConfig(input.leagueId)
  if (!config) return []

  const margin = input.dangerMarginPoints ?? config.dangerMarginPoints ?? 10
  const chopped = await prisma.guillotineRosterState.findMany({
    where: { leagueId: input.leagueId, choppedAt: { not: null } },
    select: { rosterId: true },
  })
  const choppedSet = new Set(chopped.map((c) => c.rosterId))

  let projectedByRoster = input.projectedPointsByRoster
  if (!projectedByRoster || projectedByRoster.size === 0) {
    const scores = await prisma.guillotinePeriodScore.findMany({
      where: { leagueId: input.leagueId, weekOrPeriod: input.weekOrPeriod - 1 },
      select: { rosterId: true, seasonPointsCumul: true },
    })
    projectedByRoster = new Map(scores.filter((s) => !choppedSet.has(s.rosterId)).map((s) => [s.rosterId, s.seasonPointsCumul]))
  }

  const active = [...projectedByRoster.entries()].filter(([id]) => !choppedSet.has(id))
  if (active.length === 0) return []

  const sorted = [...active].sort((a, b) => a[1] - b[1])
  const minProjected = sorted[0]?.[1] ?? 0
  const dangerThreshold = minProjected + margin

  const rosters = await prisma.roster.findMany({
    where: { leagueId: input.leagueId, id: { in: sorted.map(([id]) => id) } },
    select: { id: true, platformUserId: true },
  })
  const userIds = [...new Set(rosters.map((r) => r.platformUserId).filter(Boolean))]
  const users = await prisma.appUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, email: true },
  })
  const displayByUserId = Object.fromEntries(
    users.map((u) => [u.id, u.displayName || u.email || u.id])
  )

  const periodScores = await prisma.guillotinePeriodScore.findMany({
    where: { leagueId: input.leagueId, weekOrPeriod: input.weekOrPeriod },
    select: { rosterId: true, seasonPointsCumul: true },
  })
  const seasonByRoster = new Map(periodScores.map((s) => [s.rosterId, s.seasonPointsCumul]))

  const result: GuillotineDangerRow[] = sorted.map(([rosterId, projectedPoints], i) => {
    const tier: DangerTier =
      i === 0 ? 'chop_zone' : projectedPoints <= dangerThreshold ? 'danger' : 'safe'
    return {
      rosterId,
      displayName: displayByUserId[
        rosters.find((r) => r.id === rosterId)?.platformUserId ?? ''
      ] as string | undefined,
      projectedPoints,
      seasonPointsCumul: seasonByRoster.get(rosterId) ?? 0,
      tier,
      rank: i + 1,
      pointsFromChopZone: projectedPoints - minProjected,
    }
  })

  return result
}
