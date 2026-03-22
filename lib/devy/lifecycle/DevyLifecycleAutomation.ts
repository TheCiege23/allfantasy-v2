/**
 * Devy Dynasty lifecycle automation engine. PROMPT 3/6.
 * Handles: declare detection, draft detection, auto-promotion by timing,
 * rights expiration, roster legality blockers, promotion window status.
 * All operations are deterministic — no AI.
 */

import { prisma } from '@/lib/prisma'
import { getDevyConfig } from '../DevyLeagueConfig'
import { markDeclaredAndDrafted } from './DevyLifecycleEngine'
import { appendDevyLifecycleEvent } from './DevyAuditLog'
import { executePromotion } from '../promotion/DevyPromotionService'
import { DEVY_LIFECYCLE_STATE } from '../types'
import type { DevyLifecycleState, PromotionTiming } from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PromotionWindowStatus {
  timing: PromotionTiming
  /** For manager_choice: ISO deadline string, if set on config. */
  deadlineIso: string | null
  /** Human-readable label. */
  timingLabel: string
  /** Number of PROMOTION_ELIGIBLE rights in this league. */
  eligibleCount: number
}

export interface RosterLegalityBlocker {
  rosterId: string
  rightsId: string
  devyPlayerId: string
  reason: string
}

export interface AutomationSyncResult {
  leagueId: string
  declaredSynced: number
  draftedSynced: number
  autoPromoted: number
  expired: number
  errors: string[]
  processedAt: string
}

// ─── Declare status sync ─────────────────────────────────────────────────────

/**
 * Scan DevyPlayer rows where `draftStatus === 'declared'` and rights are still NCAA_DEVY_ACTIVE
 * or NCAA_DEVY_TAXI. Transition those rights to DECLARED.
 * Does not require external data; reads our own DevyPlayer.draftStatus field.
 */
export async function syncDeclaredStatus(
  leagueId: string,
  seasonYear: number
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = []

  // Find all DevyRights in this league in NCAA active/taxi state
  const rights = await prisma.devyRights.findMany({
    where: {
      leagueId,
      state: { in: [DEVY_LIFECYCLE_STATE.NCAA_DEVY_ACTIVE, DEVY_LIFECYCLE_STATE.NCAA_DEVY_TAXI] },
    },
    select: { id: true, devyPlayerId: true, state: true },
  })

  if (rights.length === 0) return { count: 0, errors }

  // Bulk-fetch the associated DevyPlayer records
  const devyPlayerIds = [...new Set(rights.map((r) => r.devyPlayerId))]
  const players = await prisma.devyPlayer.findMany({
    where: { id: { in: devyPlayerIds }, draftStatus: 'declared' },
    select: { id: true },
  })
  const declaredSet = new Set(players.map((p) => p.id))

  let count = 0
  for (const r of rights) {
    if (!declaredSet.has(r.devyPlayerId)) continue
    try {
      await prisma.devyRights.update({
        where: { id: r.id },
        data: { state: DEVY_LIFECYCLE_STATE.DECLARED, seasonYear },
      })
      await appendDevyLifecycleEvent({
        leagueId,
        eventType: 'declare_detected',
        rosterId: undefined,
        devyPlayerId: r.devyPlayerId,
        payload: { from: r.state, to: DEVY_LIFECYCLE_STATE.DECLARED, seasonYear, automationSource: 'syncDeclaredStatus' },
      })
      count++
    } catch (e) {
      errors.push(`Rights ${r.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { count, errors }
}

// ─── Drafted (graduated) status sync ─────────────────────────────────────────

/**
 * Scan DevyPlayer rows that have been graduated (graduatedToNFL=true or devyEligible=false for NBA)
 * and advance any DECLARED or DRAFTED_RIGHTS_HELD rights to PROMOTION_ELIGIBLE.
 * Also handles rights still in NCAA_DEVY_* states by stepping through DECLARED first.
 */
export async function syncDraftedStatus(
  leagueId: string,
  sport: 'NFL' | 'NBA',
  seasonYear: number
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = []

  // Find graduated devy players for this sport
  const where =
    sport === 'NBA'
      ? { devyEligible: false }
      : { graduatedToNFL: true, draftYear: seasonYear }

  const graduated = await prisma.devyPlayer.findMany({
    where,
    select: { id: true },
  })
  if (graduated.length === 0) return { count: 0, errors }
  const graduatedIds = new Set(graduated.map((p) => p.id))

  // Rights in any pre-promotion state for this league
  const transitionableStates: DevyLifecycleState[] = [
    DEVY_LIFECYCLE_STATE.NCAA_DEVY_ACTIVE,
    DEVY_LIFECYCLE_STATE.NCAA_DEVY_TAXI,
    DEVY_LIFECYCLE_STATE.DECLARED,
    DEVY_LIFECYCLE_STATE.DRAFTED_RIGHTS_HELD,
  ]

  const rights = await prisma.devyRights.findMany({
    where: { leagueId, state: { in: transitionableStates } },
    select: { id: true, devyPlayerId: true, state: true, rosterId: true },
  })

  let count = 0
  for (const r of rights) {
    if (!graduatedIds.has(r.devyPlayerId)) continue
    try {
      const result = await markDeclaredAndDrafted({
        leagueId,
        devyPlayerId: r.devyPlayerId,
        seasonYear,
        proPlayerId: undefined, // mapping resolved separately via disambiguation
        sourceConfidence: undefined,
      })
      count += result.updated
      if (result.errors.length > 0) errors.push(...result.errors)
    } catch (e) {
      errors.push(`Rights ${r.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { count, errors }
}

// ─── Auto-promotion by timing rule ───────────────────────────────────────────

/**
 * Apply `promotionTiming` config to auto-promote eligible rights.
 *
 * - `immediate_after_pro_draft`: promote all PROMOTION_ELIGIBLE on this call
 * - `rollover`: promote all PROMOTION_ELIGIBLE (called at new year)
 * - `manager_choice_before_rookie_draft`: no-op (managers choose; this fn returns 0)
 */
export async function runAutoPromotionByTiming(
  leagueId: string,
  seasonYear: number
): Promise<{ promoted: number; errors: string[] }> {
  const errors: string[] = []
  const config = await getDevyConfig(leagueId)
  if (!config) return { promoted: 0, errors: ['Not a devy league'] }

  const timing: PromotionTiming = (config.promotionTiming as PromotionTiming) ?? 'manager_choice_before_rookie_draft'
  if (timing === 'manager_choice_before_rookie_draft') {
    return { promoted: 0, errors: [] }
  }

  // Both 'immediate_after_pro_draft' and 'rollover' auto-promote all PROMOTION_ELIGIBLE rights
  // that already have a pro player mapped (promotedProPlayerId set).
  const eligible = await prisma.devyRights.findMany({
    where: {
      leagueId,
      state: DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE,
      promotedProPlayerId: { not: null },
    },
    select: { id: true, promotedProPlayerId: true, rosterId: true, devyPlayerId: true },
  })

  let promoted = 0
  for (const r of eligible) {
    if (!r.promotedProPlayerId) continue
    try {
      const result = await executePromotion({
        rightsId: r.id,
        promotedProPlayerId: r.promotedProPlayerId,
        addToRoster: true,
      })
      if (result.ok) {
        promoted++
      } else {
        errors.push(`Rights ${r.id}: ${result.error}`)
      }
    } catch (e) {
      errors.push(`Rights ${r.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (promoted > 0) {
    await appendDevyLifecycleEvent({
      leagueId,
      eventType: 'commissioner_override',
      payload: {
        action: 'auto_promotion_by_timing',
        timing,
        seasonYear,
        promoted,
        automationSource: 'runAutoPromotionByTiming',
      },
    })
  }
  return { promoted, errors }
}

// ─── Rights expiration ────────────────────────────────────────────────────────

/**
 * Expire PROMOTION_ELIGIBLE rights where `rightsExpirationEnabled` is true
 * and the rights are older than the expiration threshold (default: if seasonYear < current - 1).
 */
export async function runRightsExpiration(
  leagueId: string,
  currentSeasonYear: number
): Promise<{ expired: number; errors: string[] }> {
  const errors: string[] = []
  const config = await getDevyConfig(leagueId)
  if (!config?.rightsExpirationEnabled) return { expired: 0, errors: [] }

  // Rights expire if they've been PROMOTION_ELIGIBLE for more than 1 season
  const expirationCutoffYear = currentSeasonYear - 1

  const stale = await prisma.devyRights.findMany({
    where: {
      leagueId,
      state: DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE,
      seasonYear: { lte: expirationCutoffYear },
    },
    select: { id: true, rosterId: true, devyPlayerId: true, seasonYear: true },
  })

  let expired = 0
  for (const r of stale) {
    try {
      await prisma.devyRights.update({
        where: { id: r.id },
        data: { state: DEVY_LIFECYCLE_STATE.RIGHTS_EXPIRED },
      })
      await appendDevyLifecycleEvent({
        leagueId,
        eventType: 'rights_expired',
        rosterId: r.rosterId,
        devyPlayerId: r.devyPlayerId,
        payload: { seasonYear: r.seasonYear, expiredAtSeason: currentSeasonYear },
      })
      expired++
    } catch (e) {
      errors.push(`Rights ${r.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { expired, errors }
}

// ─── Promotion window status ──────────────────────────────────────────────────

/**
 * Return promotion window status for a league: timing mode, deadline, eligible count.
 */
export async function getPromotionWindowStatus(leagueId: string): Promise<PromotionWindowStatus> {
  const [config, eligibleCount] = await Promise.all([
    getDevyConfig(leagueId),
    prisma.devyRights.count({
      where: { leagueId, state: DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE },
    }),
  ])

  const timing: PromotionTiming =
    (config?.promotionTiming as PromotionTiming) ?? 'manager_choice_before_rookie_draft'

  const timingLabels: Record<PromotionTiming, string> = {
    immediate_after_pro_draft: 'Auto-promote immediately after pro draft',
    rollover: 'Auto-promote at league new year rollover',
    manager_choice_before_rookie_draft: 'Manager must choose before rookie draft',
  }

  // Deadline is stored on config as a freeform ISO string comment or derived from league calendar.
  // We expose whatever the config carries — no hard-coded date logic.
  const deadlineIso: string | null =
    (config as unknown as Record<string, unknown> & { promotionDeadlineIso?: string })?.promotionDeadlineIso ??
    null

  return {
    timing,
    deadlineIso,
    timingLabel: timingLabels[timing] ?? timing,
    eligibleCount,
  }
}

// ─── Roster legality blockers ─────────────────────────────────────────────────

/**
 * Return rosters with PROMOTION_ELIGIBLE rights that cannot promote due to roster space.
 * Used for task banners and commissioner audit.
 */
export async function getRosterLegalityBlockers(leagueId: string): Promise<RosterLegalityBlocker[]> {
  const [eligible, league] = await Promise.all([
    prisma.devyRights.findMany({
      where: { leagueId, state: DEVY_LIFECYCLE_STATE.PROMOTION_ELIGIBLE },
      select: { id: true, rosterId: true, devyPlayerId: true },
    }),
    prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        rosterSize: true,
        rosters: {
          select: { id: true, playerData: true },
        },
      },
    }),
  ])

  if (!league || eligible.length === 0) return []

  const rosterSizeMap = new Map(
    league.rosters.map((r) => {
      let count = 0
      try {
        const data = r.playerData as unknown
        if (Array.isArray(data)) count = data.length
        else if (data && typeof data === 'object' && 'players' in data) {
          const players = (data as { players?: unknown[] }).players
          count = Array.isArray(players) ? players.length : 0
        }
      } catch {
        count = 0
      }
      return [r.id, count] as const
    })
  )

  const blockers: RosterLegalityBlocker[] = []
  for (const r of eligible) {
    const currentSize = rosterSizeMap.get(r.rosterId) ?? 0
    const maxSize = league.rosterSize ?? 22
    if (currentSize >= maxSize) {
      blockers.push({
        rosterId: r.rosterId,
        rightsId: r.id,
        devyPlayerId: r.devyPlayerId,
        reason: `Roster full (${currentSize}/${maxSize}); create space before promoting.`,
      })
    }
  }
  return blockers
}

// ─── Full lifecycle automation sync ──────────────────────────────────────────

/**
 * Master automation entry point — called by job handler.
 * Runs declare sync → drafted sync → auto-promotion → expiration for a league.
 */
export async function runLifecycleAutomationSync(args: {
  leagueId: string
  sport: 'NFL' | 'NBA'
  seasonYear: number
  enableAutoPromotion?: boolean
  enableExpiration?: boolean
}): Promise<AutomationSyncResult> {
  const { leagueId, sport, seasonYear, enableAutoPromotion = true, enableExpiration = true } = args
  const allErrors: string[] = []
  const processedAt = new Date().toISOString()

  const [declareResult, draftedResult] = await Promise.all([
    syncDeclaredStatus(leagueId, seasonYear),
    syncDraftedStatus(leagueId, sport, seasonYear),
  ])
  allErrors.push(...declareResult.errors, ...draftedResult.errors)

  let autoPromoted = 0
  if (enableAutoPromotion) {
    const promResult = await runAutoPromotionByTiming(leagueId, seasonYear)
    autoPromoted = promResult.promoted
    allErrors.push(...promResult.errors)
  }

  let expired = 0
  if (enableExpiration) {
    const expResult = await runRightsExpiration(leagueId, seasonYear)
    expired = expResult.expired
    allErrors.push(...expResult.errors)
  }

  return {
    leagueId,
    declaredSynced: declareResult.count,
    draftedSynced: draftedResult.count,
    autoPromoted,
    expired,
    errors: allErrors,
    processedAt,
  }
}
