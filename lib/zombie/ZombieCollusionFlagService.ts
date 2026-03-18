/**
 * Zombie collusion flag service: deterministic event flags (PROMPT 353). AI summary is optional/hybrid.
 */

import { prisma } from '@/lib/prisma'
import { appendZombieAudit } from './ZombieAuditLog'

export interface CollusionFlag {
  leagueId: string
  rosterIdA: string
  rosterIdB: string
  flagType: string
  metadata?: Record<string, unknown>
}

/**
 * Detect simple deterministic flags (e.g. lopsided trades when trade data is available). Does not decide outcome.
 * Trade data may come from league-specific sources; this stub returns [] until integrated with trade pipeline.
 */
export async function evaluateCollusionFlags(leagueId: string): Promise<CollusionFlag[]> {
  const flags: CollusionFlag[] = []
  // Optional: integrate with trade pipeline when leagueId-scoped trade history exists
  return flags
}

export async function recordCollusionFlags(leagueId: string, flags: CollusionFlag[]): Promise<void> {
  for (const f of flags) {
    await appendZombieAudit({
      leagueId,
      eventType: 'collusion_flag',
      metadata: { rosterIdA: f.rosterIdA, rosterIdB: f.rosterIdB, flagType: f.flagType, ...f.metadata },
    })
  }
}
