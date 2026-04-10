/**
 * Rookie & Devy Draft Lock System
 *
 * Before the league's rookie/devy draft:
 * - Players eligible for the draft are LOCKED from waiver claims
 * - Players still appear in the waiver tab (visible but not claimable)
 * - Lock is released after the draft completes
 *
 * This prevents managers from scooping draft-eligible players
 * off waivers before the draft happens.
 */

import { prisma } from '@/lib/prisma'

export type DraftLockStatus = {
  isLocked: boolean
  lockType: 'rookie' | 'devy' | 'rookie_and_devy' | null
  lockedAt: Date | null
  lockedBy: string | null
  draftSessionId: string | null
  eligiblePlayerCount: number
  reason: string
}

/**
 * Check if rookie/devy draft lock is active for a league.
 */
export async function getDraftLockStatus(leagueId: string): Promise<DraftLockStatus> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })

  if (!league) {
    return { isLocked: false, lockType: null, lockedAt: null, lockedBy: null, draftSessionId: null, eligiblePlayerCount: 0, reason: 'League not found' }
  }

  const settings = (league.settings ?? {}) as Record<string, unknown>
  const lockConfig = settings.rookie_devy_lock as Record<string, unknown> | undefined

  if (!lockConfig || lockConfig.isLocked !== true) {
    return { isLocked: false, lockType: null, lockedAt: null, lockedBy: null, draftSessionId: null, eligiblePlayerCount: 0, reason: 'No lock active' }
  }

  return {
    isLocked: true,
    lockType: (lockConfig.lockType as DraftLockStatus['lockType']) ?? 'rookie',
    lockedAt: lockConfig.lockedAt ? new Date(lockConfig.lockedAt as string) : null,
    lockedBy: (lockConfig.lockedBy as string) ?? null,
    draftSessionId: (lockConfig.draftSessionId as string) ?? null,
    eligiblePlayerCount: Number(lockConfig.eligiblePlayerCount ?? 0),
    reason: (lockConfig.reason as string) ?? 'Locked for upcoming draft',
  }
}

/**
 * Activate the rookie/devy draft lock.
 * Called by commissioner or automatically before draft.
 */
export async function activateDraftLock(
  leagueId: string,
  lockType: 'rookie' | 'devy' | 'rookie_and_devy',
  lockedBy: string,
  draftSessionId?: string,
): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  if (!league) throw new Error('League not found')

  const settings = (league.settings ?? {}) as Record<string, unknown>

  await prisma.league.update({
    where: { id: leagueId },
    data: {
      settings: {
        ...settings,
        rookie_devy_lock: {
          isLocked: true,
          lockType,
          lockedAt: new Date().toISOString(),
          lockedBy,
          draftSessionId: draftSessionId ?? null,
          reason: `${lockType.replace(/_/g, ' ')} players locked for upcoming draft`,
        },
      },
    },
  })
}

/**
 * Release the rookie/devy draft lock.
 * Called after draft completes or by commissioner.
 */
export async function releaseDraftLock(leagueId: string): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  if (!league) return

  const settings = (league.settings ?? {}) as Record<string, unknown>

  await prisma.league.update({
    where: { id: leagueId },
    data: {
      settings: {
        ...settings,
        rookie_devy_lock: {
          isLocked: false,
          lockType: null,
          lockedAt: null,
          lockedBy: null,
          draftSessionId: null,
          reason: null,
        },
      },
    },
  })
}

/**
 * Check if a specific player is locked from waiver claims.
 * Returns true if the player is draft-eligible and the lock is active.
 */
export async function isPlayerLockedForDraft(
  leagueId: string,
  playerExperience: number | null,
  isRookie: boolean,
  isDevyEligible: boolean,
): Promise<{ locked: boolean; reason: string }> {
  const status = await getDraftLockStatus(leagueId)
  if (!status.isLocked) return { locked: false, reason: '' }

  if (status.lockType === 'rookie' && isRookie) {
    return { locked: true, reason: 'Player is locked for the upcoming rookie draft. Visible only.' }
  }
  if (status.lockType === 'devy' && isDevyEligible) {
    return { locked: true, reason: 'Player is locked for the upcoming devy draft. Visible only.' }
  }
  if (status.lockType === 'rookie_and_devy' && (isRookie || isDevyEligible)) {
    return { locked: true, reason: 'Player is locked for the upcoming rookie/devy draft. Visible only.' }
  }

  return { locked: false, reason: '' }
}
