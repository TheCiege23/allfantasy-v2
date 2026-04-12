/**
 * [UPDATED] lib/big-brother/automation/statCorrection.ts
 * Stat correction handler: when fantasy scores change after a cycle closes,
 * log the correction and notify the commissioner. Does NOT replay HOH/Veto
 * outcomes (those are final once resolved) — only audits the discrepancy.
 */

import { prisma } from '@/lib/prisma'
import { appendBigBrotherAudit } from '../BigBrotherAuditLog'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'
import type { BbStatCorrectionInput, BbStatCorrectionResult } from './types'

const SYSTEM_USER_ID = 'system'

export async function handleBbStatCorrectionSignal(
  input: BbStatCorrectionInput = {},
): Promise<BbStatCorrectionResult> {
  const dryRun = input.dryRun === true
  const errors: string[] = []
  let leaguesNoted = 0

  // Find BB leagues that might be affected
  const where = input.leagueId
    ? { leagueId: input.leagueId }
    : {}
  const configs = await prisma.bigBrotherLeagueConfig.findMany({
    where,
    select: { leagueId: true, id: true },
  })

  for (const config of configs) {
    // Find cycles that are already resolved for the affected week
    const weekFilter = input.week != null ? { week: input.week } : {}
    const resolvedCycles = await prisma.bigBrotherCycle.findMany({
      where: {
        leagueId: config.leagueId,
        closedAt: { not: null },
        ...weekFilter,
      },
      select: { id: true, week: true, hohRosterId: true, evictedRosterId: true },
      orderBy: { week: 'desc' },
      take: 3,
    })

    if (resolvedCycles.length === 0) continue

    if (dryRun) {
      leaguesNoted++
      continue
    }

    // Log the stat correction event for commissioner review
    for (const cycle of resolvedCycles) {
      await appendBigBrotherAudit(config.leagueId, config.id, 'stat_correction_noted', {
        cycleId: cycle.id,
        week: cycle.week,
        hohRosterId: cycle.hohRosterId,
        evictedRosterId: cycle.evictedRosterId,
        note: 'Fantasy scores changed after cycle resolved. HOH/Veto/Eviction outcomes are final and not replayed. Commissioner may review if the correction materially affected the result.',
      })
    }

    // Notify commissioner in league chat
    try {
      const league = await prisma.league.findUnique({
        where: { id: config.leagueId },
        select: { userId: true },
      })
      const weeks = resolvedCycles.map((c) => c.week).join(', ')
      await createLeagueChatMessage(
        config.leagueId,
        league?.userId ?? SYSTEM_USER_ID,
        `Stat correction detected for week(s) ${weeks}. Game outcomes (HOH, Veto, eviction) are final. Commissioner: review the audit log if the correction is significant.`,
        {
          type: 'text',
          source: 'bb_automation',
          messageSubtype: 'bb_stat_correction',
          metadata: { weeks, cycleIds: resolvedCycles.map((c) => c.id) },
        }
      )
    } catch {
      // Chat posting non-fatal
    }

    leaguesNoted++
  }

  return {
    ok: errors.length === 0,
    leaguesNoted,
    errors,
    message: dryRun
      ? `[dryRun] BB stat correction: ${leaguesNoted} league(s) would be noted.`
      : `BB stat correction: ${leaguesNoted} league(s) noted and audited.`,
  }
}
