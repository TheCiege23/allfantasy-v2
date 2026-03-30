import type {
  EntitlementStatus,
  SubscriptionFeatureId,
  SubscriptionPlanId,
} from "@/lib/subscription/types"

export type EntitlementSnapshot = {
  plans: SubscriptionPlanId[]
  status: EntitlementStatus
  currentPeriodEnd: string | null
  gracePeriodEnd: string | null
}

export type EntitlementResolveResult = {
  entitlement: EntitlementSnapshot
  hasAccess: boolean
  message: string
}

const PRO_FEATURES: readonly SubscriptionFeatureId[] = [
  "trade_analyzer",
  "ai_chat",
  "ai_waivers",
  "planning_tools",
  "player_ai_recommendations",
  "matchup_explanations",
  "player_comparison_explanations",
  "guillotine_ai",
  "salary_cap_ai",
  "survivor_ai",
  "zombie_ai",
]

const COMMISSIONER_FEATURES: readonly SubscriptionFeatureId[] = [
  "advanced_scoring",
  "advanced_playoff_setup",
  "ai_collusion_detection",
  "ai_tanking_detection",
  "storyline_creation",
  "league_rankings",
  "draft_rankings",
  "ai_team_managers",
  "commissioner_automation",
]

const WAR_ROOM_FEATURES: readonly SubscriptionFeatureId[] = [
  "draft_strategy_build",
  "draft_prep",
  "future_planning",
  "multi_year_strategy",
  "draft_board_intelligence",
  "roster_construction_planning",
  "ai_planning_3_5_year",
]

const EMPTY_ENTITLEMENT: EntitlementSnapshot = {
  plans: [],
  status: "none",
  currentPeriodEnd: null,
  gracePeriodEnd: null,
}

export class EntitlementResolver {
  async resolveForUser(userId: string, featureId?: SubscriptionFeatureId): Promise<EntitlementResolveResult> {
    const entitlement = await this.resolveSnapshot(userId)
    const hasAccess = featureId ? this.hasFeatureAccess(entitlement, featureId) : false
    return {
      entitlement,
      hasAccess,
      message: "Upgrade to access this feature.",
    }
  }

  async resolveSnapshot(_userId: string): Promise<EntitlementSnapshot> {
    // Phase-1 bridge: keep API contract stable before full UserSubscription persistence.
    return { ...EMPTY_ENTITLEMENT }
  }

  hasFeatureAccess(entitlement: EntitlementSnapshot, featureId: SubscriptionFeatureId): boolean {
    if (!this.isActiveOrGrace(entitlement.status)) return false
    const plans = entitlement.plans

    if (PRO_FEATURES.includes(featureId)) {
      return plans.includes("pro") || plans.includes("all_access")
    }
    if (COMMISSIONER_FEATURES.includes(featureId)) {
      return plans.includes("commissioner") || plans.includes("all_access")
    }
    if (WAR_ROOM_FEATURES.includes(featureId)) {
      return plans.includes("war_room") || plans.includes("all_access")
    }

    return false
  }

  private isActiveOrGrace(status: EntitlementStatus): boolean {
    return status === "active" || status === "grace"
  }
}
