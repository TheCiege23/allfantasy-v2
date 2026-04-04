import type {
  EntitlementStatus,
  SubscriptionFeatureId,
  SubscriptionPlanId,
} from "@/lib/subscription/types"
import type { SubscriptionPlanFamily } from "@/lib/monetization/catalog"
import { ENTITLEMENTS } from "@/lib/monetization/entitlements"
import {
  buildMonetizationUpgradePathForFeature,
  getPremiumMonetizationForFeature,
  listPremiumFeatureMonetizationMatrix,
} from "@/lib/monetization/feature-monetization-matrix"

const PREMIUM_MONETIZATION_FEATURES = listPremiumFeatureMonetizationMatrix()

export const PRO_FEATURES: readonly SubscriptionFeatureId[] = PREMIUM_MONETIZATION_FEATURES
  .filter((entry) => entry.requiredPlanId === "pro")
  .map((entry) => entry.key)

export const COMMISSIONER_FEATURES: readonly SubscriptionFeatureId[] = PREMIUM_MONETIZATION_FEATURES
  .filter((entry) => entry.requiredPlanId === "commissioner")
  .map((entry) => entry.key)

export const WAR_ROOM_FEATURES: readonly SubscriptionFeatureId[] = PREMIUM_MONETIZATION_FEATURES
  .filter((entry) => entry.requiredPlanId === "war_room")
  .map((entry) => entry.key)

const SUBSCRIPTION_FEATURE_ID_SET = new Set<SubscriptionFeatureId>(
  PREMIUM_MONETIZATION_FEATURES.map((entry) => entry.key)
)

const ENTITLEMENT_CATALOG_ID_SET = new Set<string>(Object.keys(ENTITLEMENTS))

function planFamilyToSubscriptionPlanId(
  family: SubscriptionPlanFamily
): SubscriptionPlanId | null {
  switch (family) {
    case "af_pro":
      return "pro"
    case "af_commissioner":
      return "commissioner"
    case "af_war_room":
      return "war_room"
    case "af_all_access":
      return "all_access"
    default:
      return null
  }
}

export const ALL_ACCESS_INCLUDED_PLAN_IDS: readonly SubscriptionPlanId[] = [
  "pro",
  "commissioner",
  "war_room",
]

export function isActiveOrGraceStatus(status: EntitlementStatus): boolean {
  return status === "active" || status === "grace"
}

export function getRequiredPlanForFeature(
  featureId: SubscriptionFeatureId
): SubscriptionPlanId | null {
  const fromMatrix = getPremiumMonetizationForFeature(featureId)
  if (fromMatrix) return fromMatrix.requiredPlanId
  const cat = ENTITLEMENTS[featureId as keyof typeof ENTITLEMENTS]
  if (!cat?.requiredPlan?.length) return null
  return planFamilyToSubscriptionPlanId(cat.requiredPlan[0])
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
    for (const includedPlan of ALL_ACCESS_INCLUDED_PLAN_IDS) {
      expanded.add(includedPlan)
    }
  }
  return Array.from(expanded)
}

export function resolveBundleInheritance(plans: readonly SubscriptionPlanId[]): {
  hasAllAccess: boolean
  inheritedPlanIds: SubscriptionPlanId[]
  effectivePlanIds: SubscriptionPlanId[]
} {
  const hasAllAccess = plans.includes("all_access")
  return {
    hasAllAccess,
    inheritedPlanIds: hasAllAccess ? [...ALL_ACCESS_INCLUDED_PLAN_IDS] : [],
    effectivePlanIds: expandPlansWithBundle(plans),
  }
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
  const cat = ENTITLEMENTS[featureId as keyof typeof ENTITLEMENTS]
  if (cat?.upgradeUrl) return cat.upgradeUrl
  return buildMonetizationUpgradePathForFeature(featureId)
}

export function isSubscriptionFeatureId(value: unknown): value is SubscriptionFeatureId {
  if (typeof value !== "string") return false
  if (SUBSCRIPTION_FEATURE_ID_SET.has(value as SubscriptionFeatureId)) return true
  return ENTITLEMENT_CATALOG_ID_SET.has(value)
}
