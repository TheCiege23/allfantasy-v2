import type { SubscriptionFeatureId } from '@/lib/subscription/types'
import {
  requireEntitlement,
  requireEntitlementOrThrow,
} from '@/lib/subscription/requireEntitlement'

export {
  buildLeagueAIContext,
  formatLeagueAIContextForPrompt,
  formatLeagueAIContextPromptByLeagueId,
} from '@/lib/sportConfig/aiContextService'

/** Canonical feature gate for legacy “AF Commissioner AI” routes — maps to catalog + entitlements resolver. */
const COMMISSIONER_AI_GATE: SubscriptionFeatureId = 'commissioner_ai_tools'

export async function requireAfSub() {
  return requireEntitlement(COMMISSIONER_AI_GATE)
}

export async function requireAfSubUserIdOrThrow() {
  return requireEntitlementOrThrow(COMMISSIONER_AI_GATE)
}
