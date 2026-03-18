/**
 * PROMPT 3: Promotion flow — roster legality, max yearly promotions, commissioner timing, rookie draft exclusion.
 */

import { prisma } from '@/lib/prisma'
import { getDevyConfig } from '../DevyLeagueConfig'
import { checkPromotionLimit } from '../graduation/DevyGraduationService'
import { appendDevyLifecycleEvent } from '../lifecycle/DevyAuditLog'
import { transitionDevyRights } from '../lifecycle/DevyLifecycleEngine'
import { getRosterSize } from '@/lib/waiver-wire/roster-utils'
import { DEVY_LIFECYCLE_STATE } from '../types'

export interface PromotionEligibilityResult {
  canPromote: boolean
  reason?: string
  rosterLegal: boolean
  underPromotionCap: boolean
  rightsId?: string
}

/**
 * Check if a roster can promote a given devy rights record: roster has space and under max yearly promotions.
 */
export async function checkPromotionEligibility(args: {
  leagueId: string
  rosterId: string
  rightsId: string
  seasonYear: number
}): Promise<PromotionEligibilityResult> {
  const { leagueId, rosterId, rightsId, seasonYear } = args
  const [config, rights, roster, league] = await Promise.all([
    getDevyConfig(leagueId),
    prisma.devyRights.findUnique({ where: { id: rightsId } }),
    prisma.roster.findUnique({ where: { id: rosterId }, select: { playerData: true } }),
    prisma.league.findUnique({ where: { id: leagueId }, select: { rosterSize: true } }),
  ])

  if (!config) return { canPromote: false, reason: 'Not a devy league', rosterLegal: false, underPromotionCap: false }
  if (!rights || rights.leagueId !== leagueId || rights.rosterId !== rosterId) {
    return { canPromote: false, reason: 'Rights not found or wrong roster', rosterLegal: false, underPromotionCap: false }
  }
  if (rights.state !== DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE) {
    return { canPromote: false, reason: `Rights state is ${rights.state}, not PROMOTION_ELIGIBLE`, rosterLegal: false, underPromotionCap: false }
  }

  const rosterSize = league?.rosterSize ?? 22
  const currentCount = roster ? getRosterSize(roster.playerData) : 0
  const rosterLegal = currentCount < rosterSize
  if (!rosterLegal) {
    return {
      canPromote: false,
      reason: 'Roster full; create space before promoting',
      rosterLegal: false,
      underPromotionCap: true,
      rightsId,
    }
  }

  const promotionsThisYear = await countPromotionsThisYear(leagueId, rosterId, seasonYear)
  const capResult = await checkPromotionLimit({ leagueId, seasonYear, promotionsThisYear })
  const underPromotionCap = capResult.canPromote

  return {
    canPromote: rosterLegal && underPromotionCap,
    reason: !underPromotionCap ? capResult.reason : undefined,
    rosterLegal,
    underPromotionCap,
    rightsId,
  }
}

async function countPromotionsThisYear(leagueId: string, rosterId: string, seasonYear: number): Promise<number> {
  const yearStart = new Date(seasonYear, 0, 1)
  const yearEnd = new Date(seasonYear + 1, 0, 1)
  const count = await prisma.devyRights.count({
    where: {
      leagueId,
      rosterId,
      state: DEVY_LIFECYCLE_STATE.PROMOTED_TO_PRO,
      promotedAt: { gte: yearStart, lt: yearEnd },
    },
  })
  return count
}

/**
 * Execute promotion: transition rights to PROMOTED_TO_PRO and optionally add pro player to roster.
 * Caller should have verified eligibility.
 */
export async function executePromotion(args: {
  rightsId: string
  promotedProPlayerId: string
  addToRoster?: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const right = await prisma.devyRights.findUnique({ where: { id: args.rightsId } })
  if (!right) return { ok: false, error: 'Rights not found' }
  if (right.state !== DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE) {
    return { ok: false, error: `Invalid state for promotion: ${right.state}` }
  }

  const result = await transitionDevyRights({
    rightsId: args.rightsId,
    newState: DEVY_LIFECYCLE_STATE.PROMOTED_TO_PRO,
    promotedProPlayerId: args.promotedProPlayerId,
  })
  if (!result.ok) return result

  if (args.addToRoster) {
    const roster = await prisma.roster.findUnique({ where: { id: right.rosterId } })
    if (roster) {
      const { addPlayerToRosterData } = await import('@/lib/waiver-wire/roster-utils')
      await prisma.roster.update({
        where: { id: right.rosterId },
        data: { playerData: addPlayerToRosterData(roster.playerData, args.promotedProPlayerId) as any },
      })
    }
  }

  await appendDevyLifecycleEvent({
    leagueId: right.leagueId,
    eventType: 'promotion',
    rosterId: right.rosterId,
    devyPlayerId: right.devyPlayerId,
    proPlayerId: args.promotedProPlayerId,
    payload: { rightsId: args.rightsId },
  })

  return { ok: true }
}

/**
 * Commissioner: force promote (bypass eligibility checks).
 */
export async function forcePromote(args: {
  leagueId: string
  rightsId: string
  promotedProPlayerId: string
  addToRoster?: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const right = await prisma.devyRights.findUnique({ where: { id: args.rightsId } })
  if (!right) return { ok: false, error: 'Rights not found' }
  if (right.leagueId !== args.leagueId) return { ok: false, error: 'League mismatch' }

  const allowedStates = [DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE, DEVY_LIFECYCLE_STATE.DRAFTED_RIGHTS_HELD]
  if (!allowedStates.includes(right.state as any)) {
    return { ok: false, error: `Cannot force promote from state ${right.state}` }
  }

  if (right.state === DEVY_LIFECYCLE_STATE.DRAFTED_RIGHTS_HELD) {
    await prisma.devyRights.update({
      where: { id: args.rightsId },
      data: { state: DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE },
    })
  }

  const res = await executePromotion({
    rightsId: args.rightsId,
    promotedProPlayerId: args.promotedProPlayerId,
    addToRoster: args.addToRoster,
  })

  if (res.ok) {
    await appendDevyLifecycleEvent({
      leagueId: args.leagueId,
      eventType: 'force_promote',
      rosterId: right.rosterId,
      devyPlayerId: right.devyPlayerId,
      proPlayerId: args.promotedProPlayerId,
    })
  }
  return res
}

/**
 * Commissioner: revoke promotion (back to PROMOTION_ELIGIBLE or DRAFTED_RIGHTS_HELD).
 */
export async function revokePromotion(args: { leagueId: string; rightsId: string }): Promise<{ ok: boolean; error?: string }> {
  const right = await prisma.devyRights.findUnique({ where: { id: args.rightsId } })
  if (!right) return { ok: false, error: 'Rights not found' }
  if (right.leagueId !== args.leagueId) return { ok: false, error: 'League mismatch' }
  if (right.state !== DEVY_LIFECYCLE_STATE.PROMOTED_TO_PRO) {
    return { ok: false, error: `Cannot revoke; state is ${right.state}` }
  }

  await prisma.devyRights.update({
    where: { id: args.rightsId },
    data: {
      state: DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE,
      promotedProPlayerId: null,
      promotedAt: null,
      managerPromotedAt: null,
    },
  })

  await appendDevyLifecycleEvent({
    leagueId: args.leagueId,
    eventType: 'revoke_promotion',
    rosterId: right.rosterId,
    devyPlayerId: right.devyPlayerId,
    proPlayerId: right.promotedProPlayerId ?? undefined,
  })

  return { ok: true }
}
