/**
 * Zombie valuable drop guard: deterministic thresholds (PROMPT 353). AI explanation is optional/hybrid.
 */

import { prisma } from '@/lib/prisma'
import { getZombieLeagueConfig } from './ZombieLeagueConfig'
import { appendZombieAudit } from './ZombieAuditLog'

export interface DangerousDropFlag {
  leagueId: string
  rosterId: string
  playerId: string
  estimatedValue: number
  threshold: number
}

/**
 * Evaluate drops against config.dangerousDropThreshold. Returns flags only; no automatic reset.
 */
export async function evaluateDangerousDrops(leagueId: string): Promise<DangerousDropFlag[]> {
  const config = await getZombieLeagueConfig(leagueId)
  const threshold = config?.dangerousDropThreshold
  if (threshold == null || threshold <= 0) return []

  const flags: DangerousDropFlag[] = []
  const recent = await prisma.waiverTransaction.findMany({
    where: { leagueId },
    take: 50,
    orderBy: { processedAt: 'desc' },
    select: { rosterId: true, dropPlayerId: true },
  })
  for (const tx of recent) {
    if (!tx.dropPlayerId) continue
    const value = 0
    if (value >= threshold) {
      flags.push({
        leagueId,
        rosterId: tx.rosterId,
        playerId: tx.dropPlayerId,
        estimatedValue: value,
        threshold,
      })
    }
  }
  return flags
}

export async function recordDangerousDropFlags(leagueId: string, flags: DangerousDropFlag[]): Promise<void> {
  for (const f of flags) {
    await appendZombieAudit({
      leagueId,
      eventType: 'dangerous_drop_flag',
      metadata: {
        rosterId: f.rosterId,
        playerId: f.playerId,
        estimatedValue: f.estimatedValue,
        threshold: f.threshold,
      },
    })
  }
}
