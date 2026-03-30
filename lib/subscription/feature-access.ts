import type {
  EntitlementStatus,
  SubscriptionFeatureId,
  SubscriptionPlanId,
} from "@/lib/subscription/types"

export const PRO_FEATURES: readonly SubscriptionFeatureId[] = [
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

export const COMMISSIONER_FEATURES: readonly SubscriptionFeatureId[] = [
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

export const WAR_ROOM_FEATURES: readonly SubscriptionFeatureId[] = [
  "draft_strategy_build",
  "draft_prep",
  "future_planning",
  "multi_year_strategy",
  "draft_board_intelligence",
  "roster_construction_planning",
  "ai_planning_3_5_year",
]

export function isActiveOrGraceStatus(status: EntitlementStatus): boolean {
  return status === "active" || status === "grace"
}

export function getRequiredPlanForFeature(
  featureId: SubscriptionFeatureId
): SubscriptionPlanId | null {
  if (PRO_FEATURES.includes(featureId)) return "pro"
  if (COMMISSIONER_FEATURES.includes(featureId)) return "commissioner"
  if (WAR_ROOM_FEATURES.includes(featureId)) return "war_room"
  return null
}

export function getDisplayPlanName(planId: SubscriptionPlanId): string {
  switch (planId) {
    case "pro":
      return "AF Pro"
    case "commissioner":
      return "AF Commissioner"
    case "war_room":
      return "AF War Room"
    case "all_access":
      return "AF All-Access Bundle"
  }
}

export function expandPlansWithBundle(plans: readonly SubscriptionPlanId[]): SubscriptionPlanId[] {
  const expanded = new Set<SubscriptionPlanId>(plans)
  if (expanded.has("all_access")) {
    expanded.add("pro")
    expanded.add("commissioner")
    expanded.add("war_room")
  }
  return Array.from(expanded)
}

export function hasFeatureAccessForPlans(
  plans: readonly SubscriptionPlanId[],
  status: EntitlementStatus,
  featureId: SubscriptionFeatureId
): boolean {
  if (!isActiveOrGraceStatus(status)) return false
  const expandedPlans = expandPlansWithBundle(plans)
  const required = getRequiredPlanForFeature(featureId)
  if (!required) return false
  return expandedPlans.includes(required) || expandedPlans.includes("all_access")
}

export function buildFeatureUpgradePath(featureId: SubscriptionFeatureId): string {
  const requiredPlan = getRequiredPlanForFeature(featureId)
  if (!requiredPlan) return "/pricing"
  return `/pricing?plan=${encodeURIComponent(requiredPlan)}&feature=${encodeURIComponent(featureId)}`
}

export function isSubscriptionFeatureId(value: unknown): value is SubscriptionFeatureId {
  if (typeof value !== "string") return false
  return (
    PRO_FEATURES.includes(value as SubscriptionFeatureId) ||
    COMMISSIONER_FEATURES.includes(value as SubscriptionFeatureId) ||
    WAR_ROOM_FEATURES.includes(value as SubscriptionFeatureId)
  )
}
