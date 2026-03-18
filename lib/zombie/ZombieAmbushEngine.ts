/**
 * Zombie ambush engine: Whisperer remap matchups, legality window (PROMPT 353). Deterministic.
 */

import { prisma } from '@/lib/prisma'
import { getZombieLeagueConfig } from './ZombieLeagueConfig'
import { getWhispererRosterId } from './ZombieOwnerStatusService'
import { appendZombieAudit } from './ZombieAuditLog'

export async function getAmbushBalance(leagueId: string, rosterId: string): Promise<number> {
  const row = await prisma.zombieResourceLedger.findFirst({
    where: { leagueId, rosterId, resourceType: 'ambush' },
    select: { balance: true },
  })
  return row?.balance ?? 0
}

/** Check if roster can use ambush this week (must be Whisperer, has balance, within legality). */
export async function canUseAmbush(
  leagueId: string,
  rosterId: string,
  week: number
): Promise<{ allowed: boolean; reason?: string }> {
  const config = await getZombieLeagueConfig(leagueId)
  if (!config?.ambushRemapMatchup) return { allowed: false, reason: 'ambush_disabled' }
  const whisperer = await getWhispererRosterId(leagueId)
  if (whisperer !== rosterId) return { allowed: false, reason: 'not_whisperer' }
  const balance = await getAmbushBalance(leagueId, rosterId)
  if (balance < 1) return { allowed: false, reason: 'no_ambush' }
  const usedThisWeek = await prisma.zombieAmbushEvent.count({
    where: { zombieLeague: { leagueId }, week, whispererRosterId: rosterId },
  })
  if (usedThisWeek >= config.ambushCountPerWeek) return { allowed: false, reason: 'ambush_limit' }
  return { allowed: true }
}

/** Record ambush use (remap logged; actual schedule remap is caller responsibility). */
export async function recordAmbushUse(
  zombieLeagueId: string,
  leagueId: string,
  week: number,
  whispererRosterId: string,
  payload: { fromMatchupId?: string; toMatchupId?: string; targetRosterId?: string }
): Promise<void> {
  await prisma.zombieAmbushEvent.create({
    data: {
      zombieLeagueId,
      week,
      whispererRosterId,
      fromMatchupId: payload.fromMatchupId ?? null,
      toMatchupId: payload.toMatchupId ?? null,
      targetRosterId: payload.targetRosterId ?? null,
    },
  })
  const ledger = await prisma.zombieResourceLedger.findFirst({
    where: { leagueId, rosterId: whispererRosterId, resourceType: 'ambush' },
  })
  if (ledger) {
    await prisma.zombieResourceLedger.update({
      where: { id: ledger.id },
      data: { balance: Math.max(0, ledger.balance - 1), spentAt: new Date(), updatedAt: new Date() },
    })
  }
  await appendZombieAudit({
    leagueId,
    zombieLeagueId,
    eventType: 'ambush_use',
    metadata: { week, whispererRosterId, ...payload },
  })
}

/** Award ambush to Whisperer (e.g. per week). */
export async function awardAmbush(
  leagueId: string,
  rosterId: string,
  week: number,
  zombieLeagueId?: string | null
): Promise<void> {
  const existing = await prisma.zombieResourceLedger.findFirst({
    where: { leagueId, rosterId, resourceType: 'ambush' },
  })
  if (existing) {
    await prisma.zombieResourceLedger.update({
      where: { id: existing.id },
      data: { balance: existing.balance + 1, awardedInWeek: week, updatedAt: new Date() },
    })
  } else {
    await prisma.zombieResourceLedger.create({
      data: {
        leagueId,
        zombieLeagueId: zombieLeagueId ?? null,
        rosterId,
        resourceType: 'ambush',
        balance: 1,
        awardedInWeek: week,
      },
    })
  }
}
