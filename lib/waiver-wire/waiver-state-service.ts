/**
 * Persisted league waiver snapshot for UI (priority order, FAAB caps, scheduling hints).
 */

import { prisma } from '@/lib/prisma'
import { computeNextWaiverRunAtUtc } from './next-waiver-run'
import type { NextRunInput } from './next-waiver-run'

export async function upsertLeagueWaiverStateAfterRun(
  leagueId: string,
  input: {
    schedule: NextRunInput
    priorityOrder: Array<{ rosterId: string; waiverPriority: number | null; faabRemaining: number | null }>
  }
): Promise<void> {
  const now = new Date()
  const nextRunAtIso = computeNextWaiverRunAtUtc(now, input.schedule)
  await (prisma as any).leagueWaiverState.upsert({
    where: { leagueId },
    create: {
      leagueId,
      lastRunAt: now,
      nextRunAt: nextRunAtIso ? new Date(nextRunAtIso) : null,
      currentPriorityOrder: input.priorityOrder as object,
      faabState: { snapshotAt: now.toISOString() },
      processingLocked: false,
    },
    update: {
      lastRunAt: now,
      nextRunAt: nextRunAtIso ? new Date(nextRunAtIso) : null,
      currentPriorityOrder: input.priorityOrder as object,
      updatedAt: now,
    },
  })
}

export async function getLeagueWaiverState(leagueId: string) {
  return (prisma as any).leagueWaiverState.findUnique({
    where: { leagueId },
  })
}

export async function setWaiverProcessingLocked(leagueId: string, locked: boolean): Promise<void> {
  await (prisma as any).leagueWaiverState.upsert({
    where: { leagueId },
    create: {
      leagueId,
      processingLocked: locked,
    },
    update: {
      processingLocked: locked,
    },
  })
}
