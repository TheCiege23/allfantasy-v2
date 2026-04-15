/**
 * lib/scoring-engine/ScoringPermissionsService.ts
 * Commissioner and premium scoring access checks.
 *
 * These functions are intentionally thin wrappers — they delegate to
 * Prisma for commissioner checks and FeatureGateService for premium checks.
 * Keeping them centralised ensures every scoring API route uses the same rules.
 */

import { prisma } from '../prisma'
import { FeatureGateService } from '../subscription/FeatureGateService'
import type { PermissionCheckResult } from './ScoringEngineTypes'

const featureGate = new FeatureGateService()

// ---------------------------------------------------------------------------
// Commissioner check
// ---------------------------------------------------------------------------

/**
 * Returns true if `userId` is the commissioner (owner) of `leagueId`.
 *
 * Used by API routes before allowing scoring edits.
 */
export async function checkCommissionerPermission(
  userId: string,
  leagueId: string,
): Promise<PermissionCheckResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { userId: true },
  })
  if (!league) {
    return { allowed: false, reason: 'League not found' }
  }
  if (league.userId !== userId) {
    return { allowed: false, reason: 'Commissioner only' }
  }
  return { allowed: true }
}

// ---------------------------------------------------------------------------
// Premium scoring access
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has an active AF Commissioner subscription
 * granting access to advanced scoring customisation.
 *
 * Safely swallows FeatureGate errors — treats them as no access.
 */
export async function checkPremiumScoringAccess(
  userId: string,
): Promise<PermissionCheckResult> {
  try {
    const result = await featureGate.evaluateUserFeatureAccess(userId, 'advanced_scoring')
    return { allowed: result.allowed, reason: result.allowed ? undefined : 'Advanced scoring requires AF Commissioner Subscription' }
  } catch {
    return { allowed: false, reason: 'Failed to check premium access' }
  }
}

// ---------------------------------------------------------------------------
// Combined check (used by API routes)
// ---------------------------------------------------------------------------

/**
 * Run both checks in parallel and return a combined result.
 * `premiumRequired` gates the custom preset and advanced stat fields.
 */
export async function checkScoringEditPermissions(
  userId: string,
  leagueId: string,
  options: { requirePremium?: boolean } = {},
): Promise<{
  isCommissioner: boolean
  isPremium: boolean
  allowed: boolean
  reason?: string
}> {
  const [commResult, premResult] = await Promise.all([
    checkCommissionerPermission(userId, leagueId),
    checkPremiumScoringAccess(userId),
  ])

  const isCommissioner = commResult.allowed
  const isPremium = premResult.allowed

  if (!isCommissioner) {
    return { isCommissioner, isPremium, allowed: false, reason: commResult.reason }
  }
  if (options.requirePremium && !isPremium) {
    return { isCommissioner, isPremium, allowed: false, reason: 'premiumRequired' }
  }
  return { isCommissioner, isPremium, allowed: true }
}
