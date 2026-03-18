/**
 * C2C pool separation: rookie pool, college pool, overlap prevention. PROMPT 2/6.
 * Reuses DevyRights for college rights; promoted players excluded from rookie pool.
 */

import { prisma } from '@/lib/prisma'
import { isC2CLeague } from '../C2CLeagueConfig'
import { DEVY_LIFECYCLE_STATE } from '@/lib/devy/types'
import { C2C_LIFECYCLE_STATE } from '../types'
import type { C2CPoolType } from '../types'

const PROMOTED_STATES = [DEVY_LIFECYCLE_STATE.PROMOTED_TO_PRO, C2C_LIFECYCLE_STATE.PROMOTED_TO_PRO]

/**
 * College (devy) player IDs in this league that are held and promoted — exclude from rookie pool.
 */
export async function getC2CDevyHeldPromotedDevyPlayerIds(leagueId: string): Promise<Set<string>> {
  const rights = await prisma.devyRights.findMany({
    where: { leagueId, state: { in: PROMOTED_STATES } },
    select: { devyPlayerId: true },
  })
  return new Set(rights.map((r) => r.devyPlayerId))
}

/**
 * Pro player IDs claimed by promotion in this league — exclude from rookie pool.
 */
export async function getC2CPromotedProPlayerIdsExcludedFromRookiePool(leagueId: string): Promise<Set<string>> {
  const rights = await prisma.devyRights.findMany({
    where: { leagueId, state: { in: PROMOTED_STATES } },
    select: { promotedProPlayerId: true },
  })
  const set = new Set<string>()
  for (const r of rights) {
    if (r.promotedProPlayerId) set.add(r.promotedProPlayerId)
  }
  return set
}

/**
 * Rookie pool must exclude: vets, and already-promoted rights-held players.
 */
export async function isProPlayerExcludedFromC2CRookiePool(leagueId: string, proPlayerId: string): Promise<boolean> {
  const excluded = await getC2CPromotedProPlayerIdsExcludedFromRookiePool(leagueId)
  return excluded.has(proPlayerId)
}

/**
 * Validate pool separation for C2C draft phase.
 */
export async function validateC2CPoolSeparation(args: {
  leagueId: string
  poolType: C2CPoolType
  playerIds: string[]
  isDevyPlayerId?: (id: string) => boolean
  isProPlayerId?: (id: string) => boolean
}): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []
  const { leagueId, poolType, playerIds } = args
  const isDevy = args.isDevyPlayerId ?? (() => false)
  const isPro = args.isProPlayerId ?? (() => true)

  if (poolType === 'startup_pro') {
    for (const id of playerIds) {
      if (isDevy(id)) errors.push(`Pro startup pool cannot contain college-only player: ${id}`)
    }
  }

  if (poolType === 'startup_college') {
    for (const id of playerIds) {
      if (isPro(id) && !isDevy(id)) errors.push(`College startup pool cannot contain pro player: ${id}`)
    }
  }

  if (poolType === 'rookie') {
    const excludedPro = await getC2CPromotedProPlayerIdsExcludedFromRookiePool(leagueId)
    for (const id of playerIds) {
      if (excludedPro.has(id)) errors.push(`Rookie pool cannot contain C2C-promoted player: ${id}`)
    }
  }

  if (poolType === 'college') {
    for (const id of playerIds) {
      if (isPro(id) && !isDevy(id)) errors.push(`College draft pool cannot contain pro player: ${id}`)
    }
  }

  if (poolType === 'merged_rookie_college') {
    const excludedPro = await getC2CPromotedProPlayerIdsExcludedFromRookiePool(leagueId)
    for (const id of playerIds) {
      if (excludedPro.has(id)) errors.push(`Merged pool cannot contain C2C-promoted player in rookie slot: ${id}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export async function leagueUsesC2CPoolSeparation(leagueId: string): Promise<boolean> {
  return isC2CLeague(leagueId)
}
