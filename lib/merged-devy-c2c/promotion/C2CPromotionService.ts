/**
 * PROMPT 3: C2C promotion — roster legality, max promotions per year, execute, force, revoke.
 * College assets never score in pro contests until promoted; dual-state visibility only, no dual-scoring.
 */

import { prisma } from '@/lib/prisma'
import { getC2CConfig } from '../C2CLeagueConfig'
import { appendC2CLifecycleEvent } from '../lifecycle/C2CAuditLog'
import { transitionC2CRights } from '../lifecycle/C2CLifecycleEngine'
import { getRosterSize } from '@/lib/waiver-wire/roster-utils'
import { C2C_LIFECYCLE_STATE } from '../types'
import { DEVY_LIFECYCLE_STATE } from '@/lib/devy/types'

export interface C2CPromotionEligibilityResult {
  canPromote: boolean
  reason?: string
  rosterLegal: boolean
  underPromotionCap: boolean
  rightsId?: string
}

async function countC2CPromotionsThisYear(leagueId: string, rosterId: string, seasonYear: number): Promise<number> {
  const yearStart = new Date(seasonYear, 0, 1)
  const yearEnd = new Date(seasonYear + 1, 0, 1)
  return prisma.devyRights.count({
    where: {
      leagueId,
      rosterId,
      state: C2C_LIFECYCLE_STATE.PROMOTED_TO_PRO,
      promotedAt: { gte: yearStart, lt: yearEnd },
    },
  })
}

/**
 * Check if a roster can promote a given C2C rights record: pro roster has space and under max yearly promotions.
 */
export async function checkC2CPromotionEligibility(args: {
  leagueId: string
  rosterId: string
  rightsId: string
  seasonYear: number
}): Promise<C2CPromotionEligibilityResult> {
  const { leagueId, rosterId, rightsId, seasonYear } = args
  const [config, rights, roster, league] = await Promise.all([
    getC2CConfig(leagueId),
    prisma.devyRights.findUnique({ where: { id: rightsId } }),
    prisma.roster.findUnique({ where: { id: rosterId }, select: { playerData: true } }),
    prisma.league.findUnique({ where: { id: leagueId }, select: { settings: true } }),
  ])

  if (!config) return { canPromote: false, reason: 'Not a C2C league', rosterLegal: false, underPromotionCap: false }
  if (!rights || rights.leagueId !== leagueId || rights.rosterId !== rosterId) {
    return { canPromote: false, reason: 'Rights not found or wrong roster', rosterLegal: false, underPromotionCap: false }
  }
  const allowedStates: readonly string[] = [C2C_LIFECYCLE_STATE.PROMOTION_ELIGIBLE, DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE]
  if (!allowedStates.includes(rights.state)) {
    return { canPromote: false, reason: `Rights state is ${rights.state}, not PROMOTION_ELIGIBLE`, rosterLegal: false, underPromotionCap: false }
  }

  const settings = (league?.settings as Record<string, unknown>) ?? {}
  const rosterSize = typeof settings.rosterSize === 'number' ? settings.rosterSize : (config.proBenchSize + Object.values(config.proLineupSlots ?? {}).reduce((s, n) => s + n, 0))
  const currentCount = roster ? getRosterSize(roster.playerData) : 0
  const rosterLegal = currentCount < rosterSize
  if (!rosterLegal) {
    return {
      canPromote: false,
      reason: 'Pro roster full; create space before promoting',
      rosterLegal: false,
      underPromotionCap: true,
      rightsId,
    }
  }

  const promotionsThisYear = await countC2CPromotionsThisYear(leagueId, rosterId, seasonYear)
  const maxPromo = config.maxPromotionsPerYear ?? null
  const underPromotionCap = maxPromo == null || promotionsThisYear < maxPromo

  return {
    canPromote: rosterLegal && underPromotionCap,
    reason: !underPromotionCap ? `Max promotions per year (${maxPromo}) reached.` : undefined,
    rosterLegal,
    underPromotionCap,
    rightsId,
  }
}

/**
 * Execute promotion: transition rights to PROMOTED_TO_PRO and optionally add pro player to roster.
 */
export async function executeC2CPromotion(args: {
  rightsId: string
  promotedProPlayerId: string
  addToRoster?: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const right = await prisma.devyRights.findUnique({ where: { id: args.rightsId } })
  if (!right) return { ok: false, error: 'Rights not found' }
  const allowedStates: readonly string[] = [C2C_LIFECYCLE_STATE.PROMOTION_ELIGIBLE, DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE]
  if (!allowedStates.includes(right.state)) {
    return { ok: false, error: `Invalid state for promotion: ${right.state}` }
  }

  const result = await transitionC2CRights({
    rightsId: args.rightsId,
    newState: C2C_LIFECYCLE_STATE.PROMOTED_TO_PRO,
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

  await appendC2CLifecycleEvent({
    leagueId: right.leagueId,
    eventType: 'promotion',
    rosterId: right.rosterId,
    devyPlayerId: right.devyPlayerId,
    proPlayerId: args.promotedProPlayerId,
    payload: { rightsId: args.rightsId },
  })

  return { ok: true }
}

/** Commissioner: force promote (bypass eligibility checks). */
export async function c2CForcePromote(args: {
  leagueId: string
  rightsId: string
  promotedProPlayerId: string
  addToRoster?: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const right = await prisma.devyRights.findUnique({ where: { id: args.rightsId } })
  if (!right) return { ok: false, error: 'Rights not found' }
  if (right.leagueId !== args.leagueId) return { ok: false, error: 'League mismatch' }

  const allowedStates: readonly string[] = [C2C_LIFECYCLE_STATE.PROMOTION_ELIGIBLE, C2C_LIFECYCLE_STATE.DRAFTED_RIGHTS_HELD, DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE, DEVY_LIFECYCLE_STATE.DRAFTED_RIGHTS_HELD]
  if (!allowedStates.includes(right.state)) {
    return { ok: false, error: `Cannot force promote from state ${right.state}` }
  }

  if (right.state === C2C_LIFECYCLE_STATE.DRAFTED_RIGHTS_HELD || right.state === DEVY_LIFECYCLE_STATE.DRAFTED_RIGHTS_HELD) {
    await prisma.devyRights.update({
      where: { id: args.rightsId },
      data: { state: C2C_LIFECYCLE_STATE.PROMOTION_ELIGIBLE },
    })
  }

  const res = await executeC2CPromotion({
    rightsId: args.rightsId,
    promotedProPlayerId: args.promotedProPlayerId,
    addToRoster: args.addToRoster,
  })

  if (res.ok) {
    await appendC2CLifecycleEvent({
      leagueId: args.leagueId,
      eventType: 'force_promote',
      rosterId: right.rosterId,
      devyPlayerId: right.devyPlayerId,
      proPlayerId: args.promotedProPlayerId,
    })
  }
  return res
}

/** Commissioner: revoke promotion (back to PROMOTION_ELIGIBLE). */
export async function c2CRevokePromotion(args: { leagueId: string; rightsId: string }): Promise<{ ok: boolean; error?: string }> {
  const right = await prisma.devyRights.findUnique({ where: { id: args.rightsId } })
  if (!right) return { ok: false, error: 'Rights not found' }
  if (right.leagueId !== args.leagueId) return { ok: false, error: 'League mismatch' }
  if (right.state !== C2C_LIFECYCLE_STATE.PROMOTED_TO_PRO && right.state !== DEVY_LIFECYCLE_STATE.PROMOTED_TO_PRO) {
    return { ok: false, error: `Cannot revoke; state is ${right.state}` }
  }

  await prisma.devyRights.update({
    where: { id: args.rightsId },
    data: {
      state: C2C_LIFECYCLE_STATE.PROMOTION_ELIGIBLE,
      promotedProPlayerId: null,
      promotedAt: null,
      managerPromotedAt: null,
    },
  })

  await appendC2CLifecycleEvent({
    leagueId: args.leagueId,
    eventType: 'revoke_promotion',
    rosterId: right.rosterId,
    devyPlayerId: right.devyPlayerId,
    proPlayerId: right.promotedProPlayerId ?? undefined,
  })

  return { ok: true }
}
