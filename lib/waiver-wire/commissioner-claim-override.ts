/**
 * Commissioner flags stored on `WaiverClaim.metadata` (merged with other metadata).
 * Process engine and eligibility respect these when `commissioner_can_override` is allowed in league rules.
 */

import type { WaiverEngineConfigJson } from './waiver-engine-config'

export type CommissionerClaimOverrides = {
  bypassInsufficientFaab?: boolean
  bypassWeeklyDropLimit?: boolean
  note?: string
  setByUserId?: string
  setAt?: string
}

export function getCommissionerOverrides(metadata: unknown): CommissionerClaimOverrides {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  const m = metadata as Record<string, unknown>
  const co = m.commissionerOverrides
  if (!co || typeof co !== 'object' || Array.isArray(co)) return {}
  return co as CommissionerClaimOverrides
}

/** When false, commissioner flags on claims are ignored. */
export function commissionerOverrideAllowed(
  engine: WaiverEngineConfigJson,
  commissionerOverrideRules: unknown | null,
): boolean {
  if (engine.commissioner_can_override === false) return false
  if (commissionerOverrideRules && typeof commissionerOverrideRules === 'object' && !Array.isArray(commissionerOverrideRules)) {
    const o = commissionerOverrideRules as Record<string, unknown>
    if (o.allowClaimOverrides === false) return false
  }
  return true
}

export function mergeCommissionerOverrides(
  existingMetadata: unknown,
  patch: Partial<CommissionerClaimOverrides> & { setByUserId: string },
): Record<string, unknown> {
  const base =
    existingMetadata && typeof existingMetadata === 'object' && !Array.isArray(existingMetadata)
      ? { ...(existingMetadata as Record<string, unknown>) }
      : {}
  const prev = getCommissionerOverrides(base)
  const next: CommissionerClaimOverrides = { ...prev }
  if (patch.bypassInsufficientFaab !== undefined) next.bypassInsufficientFaab = patch.bypassInsufficientFaab
  if (patch.bypassWeeklyDropLimit !== undefined) next.bypassWeeklyDropLimit = patch.bypassWeeklyDropLimit
  if (patch.note !== undefined) next.note = patch.note
  base.commissionerOverrides = {
    ...next,
    setByUserId: patch.setByUserId,
    setAt: new Date().toISOString(),
  }
  return base
}
