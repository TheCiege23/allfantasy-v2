/**
 * XPProgressionEngine — run aggregation for one or all managers, upsert profile and events.
 */

import { prisma } from '@/lib/prisma'
import { aggregateXPForManager } from './XPEventAggregator'
import { getTierFromXP, getXPToNextTier } from './TierResolver'
import { DEFAULT_SPORT } from '@/lib/sport-scope'

export interface RunResult {
  managerId: string
  totalXP: number
  currentTier: string
  eventsCreated: number
  profileUpserted: boolean
}

/**
 * Run XP progression for one manager: clear existing events, re-aggregate from SeasonResult,
 * write XPEvents, upsert ManagerXPProfile.
 */
export async function runForManager(
  managerId: string,
  options?: { sport?: string | null; clearEventsFirst?: boolean }
): Promise<RunResult> {
  const sport = options?.sport ?? DEFAULT_SPORT
  const clearEventsFirst = options?.clearEventsFirst !== false

  if (clearEventsFirst) {
    await prisma.xPEvent.deleteMany({ where: { managerId } })
  }

  const aggregated = await aggregateXPForManager(managerId, { sport, writeEvents: true })
  const currentTier = getTierFromXP(aggregated.totalXP)
  const xpToNextTier = getXPToNextTier(aggregated.totalXP)

  await prisma.managerXPProfile.upsert({
    where: { managerId },
    create: {
      managerId,
      totalXP: aggregated.totalXP,
      currentTier,
      xpToNextTier,
    },
    update: {
      totalXP: aggregated.totalXP,
      currentTier,
      xpToNextTier,
    },
  })

  return {
    managerId,
    totalXP: aggregated.totalXP,
    currentTier,
    eventsCreated: aggregated.eventsCreated,
    profileUpserted: true,
  }
}

/**
 * Run for all managers that have at least one Roster (platformUserId).
 */
export async function runForAllManagers(options?: {
  sport?: string | null
  clearEventsFirst?: boolean
}): Promise<RunResult[]> {
  const distinctManagers = await prisma.roster.findMany({
    select: { platformUserId: true },
    distinct: ['platformUserId'],
  })
  const managerIds = distinctManagers.map((r) => r.platformUserId).filter(Boolean)
  const results: RunResult[] = []
  for (const managerId of managerIds) {
    const r = await runForManager(managerId, options)
    results.push(r)
  }
  return results
}
