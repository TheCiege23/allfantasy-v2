import { EntitlementResolver } from "@/lib/subscription/EntitlementResolver"
import type { SubscriptionFeatureId } from "@/lib/subscription/types"

/**
 * Bracket Brain AI tools (summaries, hype, recaps, reminders with AI copy) use AF Pro.
 * Maps to `league_ai_coaching` in the monetization matrix (requiredPlanId: pro).
 */
export const BRACKET_BRAIN_AI_FEATURE: SubscriptionFeatureId = "league_ai_coaching"

export async function userHasBracketBrainAi(userId: string, email?: string | null) {
  const resolver = new EntitlementResolver()
  const r = await resolver.resolveForUser(
    userId,
    BRACKET_BRAIN_AI_FEATURE,
    email ?? null
  )
  return r.hasAccess
}
