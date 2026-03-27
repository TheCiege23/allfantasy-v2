/**
 * XPProgressionEngine — run aggregation for one or all managers, upsert profile and events.
 */

import { prisma } from '@/lib/prisma'
import { aggregateXPForManager } from './XPEventAggregator'
import { getTierFromXP, getXPRemainingToNextTier } from './TierResolver'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'
import { GENERATED_XP_EVENT_TYPES } from './types'

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
  const sport =
    options?.sport && isSupportedSport(options.sport)
      ? normalizeToSupportedSport(options.sport)
      : undefined
  const clearEventsFirst = options?.clearEventsFirst !== false

  if (clearEventsFirst) {
    await prisma.xPEvent.deleteMany({
      where: {
        managerId,
        ...(sport ? { sport } : {}),
        eventType: { in: [...GENERATED_XP_EVENT_TYPES] },
      },
    })
  }

  const aggregated = await aggregateXPForManager(managerId, {
    sport: sport ?? null,
    writeEvents: true,
  })
  const summed = await prisma.xPEvent.aggregate({
    where: { managerId },
    _sum: { xpValue: true },
  })
  const totalXP = Number(summed._sum.xpValue ?? 0)
  const currentTier = getTierFromXP(totalXP)
  const xpToNextTier = getXPRemainingToNextTier(totalXP)

  await prisma.managerXPProfile.upsert({
    where: { managerId },
    create: {
      managerId,
      totalXP,
      currentTier,
      xpToNextTier,
    },
    update: {
      totalXP,
      currentTier,
      xpToNextTier,
    },
  })

  return {
    managerId,
    totalXP,
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
    const r = await runForManager(managerId, {
      sport: options?.sport ?? null,
      clearEventsFirst: options?.clearEventsFirst,
    })
    results.push(r)
  }
  return results
}
