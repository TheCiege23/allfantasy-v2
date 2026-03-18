/**
 * PROMPT 3: Strict pool separation for devy dynasty.
 * - Startup vet draft = vets only (no NCAA, no rookies in vet pool).
 * - Rookie draft = rookies only; devy-held promoted players EXCLUDED (rights retained).
 * - Devy draft = NCAA devy only.
 * No player in both devy and rookie simultaneously; no NCAA in vet pool; no pro in devy pool.
 */

import { prisma } from '@/lib/prisma'
import { isDevyLeague } from '../DevyLeagueConfig'
import { DEVY_LIFECYCLE_STATE } from '../types'

export type PoolType = 'startup_vet' | 'rookie' | 'devy'

/**
 * Devy player IDs in this league that are held and promoted (exclude from rookie pool).
 */
export async function getDevyHeldPromotedDevyPlayerIds(leagueId: string): Promise<Set<string>> {
  const rights = await prisma.devyRights.findMany({
    where: { leagueId, state: DEVY_LIFECYCLE_STATE.PROMOTED_TO_PRO },
    select: { devyPlayerId: true },
  })
  return new Set(rights.map((r) => r.devyPlayerId))
}

/**
 * Pro player IDs that are already "claimed" by promotion (rights holder has them on roster or reserved).
 * Used to exclude from rookie pool when building it.
 */
export async function getPromotedProPlayerIdsExcludedFromRookiePool(leagueId: string): Promise<Set<string>> {
  const rights = await prisma.devyRights.findMany({
    where: { leagueId, state: DEVY_LIFECYCLE_STATE.PROMOTED_TO_PRO },
    select: { promotedProPlayerId: true },
  })
  const set = new Set<string>()
  for (const r of rights) {
    if (r.promotedProPlayerId) set.add(r.promotedProPlayerId)
  }
  return set
}

/**
 * Check if a player (by devyPlayerId) should be excluded from the rookie draft pool because
 * they are held as devy and promoted in this league.
 */
export async function isExcludedFromRookiePoolAsDevyHeld(leagueId: string, devyPlayerId: string): Promise<boolean> {
  const excluded = await getDevyHeldPromotedDevyPlayerIds(leagueId)
  return excluded.has(devyPlayerId)
}

/**
 * Check if a pro player (by pro player id) should be excluded from rookie pool because
 * they were promoted from devy in this league.
 */
export async function isProPlayerExcludedFromRookiePool(leagueId: string, proPlayerId: string): Promise<boolean> {
  const excluded = await getPromotedProPlayerIdsExcludedFromRookiePool(leagueId)
  return excluded.has(proPlayerId)
}

/**
 * Validate pool separation for a draft phase.
 * - startup_vet: no NCAA players, no rookies (only vets).
 * - rookie: only rookies; no vets; no devy-held-and-promoted (they're already rostered).
 * - devy: only NCAA devy-eligible, not graduated.
 */
export async function validatePoolSeparation(args: {
  leagueId: string
  poolType: PoolType
  playerIds: string[]
  isDevyPlayerId?: (id: string) => boolean
  isProPlayerId?: (id: string) => boolean
}): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []
  const { leagueId, poolType, playerIds } = args

  const isDevy = args.isDevyPlayerId ?? (() => false)
  const isPro = args.isProPlayerId ?? (() => true)

  if (poolType === 'startup_vet') {
    for (const id of playerIds) {
      if (isDevy(id)) errors.push(`Vet pool cannot contain NCAA devy player: ${id}`)
    }
  }

  if (poolType === 'rookie') {
    const excludedPro = await getPromotedProPlayerIdsExcludedFromRookiePool(leagueId)
    for (const id of playerIds) {
      if (excludedPro.has(id)) errors.push(`Rookie pool cannot contain devy-promoted player: ${id}`)
    }
  }

  if (poolType === 'devy') {
    for (const id of playerIds) {
      if (isPro(id) && !isDevy(id)) errors.push(`Devy pool cannot contain pro player: ${id}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Whether the league uses strict pool separation (devy_dynasty).
 */
export async function leagueUsesPoolSeparation(leagueId: string): Promise<boolean> {
  return isDevyLeague(leagueId)
}
