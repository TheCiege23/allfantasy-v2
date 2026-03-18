/**
 * PROMPT 3: Waiver/FA rules for devy leagues.
 * - Vets on waivers: current dynasty behavior.
 * - Rookies after rookie draft: waiver/FA per league rules.
 * - Devy players: NOT on standard waivers unless supplementalDevyFAEnabled.
 * - When supplemental devy FA enabled: FAAB or waiver priority, NCAA devy-eligible and not rostered only.
 */

import { prisma } from '@/lib/prisma'
import { getDevyConfig } from '../DevyLeagueConfig'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'

/**
 * Check if addPlayerId is a devy player (DevyPlayer.id). If so, validate per devy waiver rules.
 */
export async function validateDevyWaiverClaim(args: {
  leagueId: string
  addPlayerId: string
  allRosters?: { playerData: unknown }[]
}): Promise<{ allowed: boolean; reason?: string }> {
  const config = await getDevyConfig(args.leagueId)
  if (!config) return { allowed: true }

  const devyPlayer = await prisma.devyPlayer.findUnique({
    where: { id: args.addPlayerId },
    select: { id: true, devyEligible: true, graduatedToNFL: true },
  })

  if (!devyPlayer) return { allowed: true }

  if (!config.supplementalDevyFAEnabled) {
    return { allowed: false, reason: 'Devy players are not available via waivers unless supplemental devy FA is enabled.' }
  }

  if (!devyPlayer.devyEligible || devyPlayer.graduatedToNFL) {
    return { allowed: false, reason: 'Only NCAA devy-eligible players (not yet graduated) can be added via supplemental devy FA.' }
  }

  const rosters = args.allRosters ?? (await prisma.roster.findMany({
    where: { leagueId: args.leagueId },
    select: { playerData: true },
  }))
  for (const r of rosters) {
    const ids = getRosterPlayerIds(r.playerData)
    if (ids.includes(args.addPlayerId)) {
      return { allowed: false, reason: 'This devy player is already rostered.' }
    }
  }

  return { allowed: true }
}
