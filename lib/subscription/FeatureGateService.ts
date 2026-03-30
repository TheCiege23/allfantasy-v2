import { EntitlementResolver, type EntitlementSnapshot } from "@/lib/subscription/EntitlementResolver"
import {
  buildFeatureUpgradePath,
  getDisplayPlanName,
  getRequiredPlanForFeature,
} from "@/lib/subscription/feature-access"
import type { SubscriptionFeatureId } from "@/lib/subscription/types"

export type FeatureGateDecision = {
  allowed: boolean
  featureId: SubscriptionFeatureId
  entitlement: EntitlementSnapshot
  requiredPlan: string | null
  upgradePath: string
  message: string
}

export class FeatureGateAccessError extends Error {
  readonly statusCode = 403
  readonly code = "feature_not_entitled"
  readonly featureId: SubscriptionFeatureId
  readonly requiredPlan: string | null
  readonly upgradePath: string
  readonly entitlement: EntitlementSnapshot

  constructor(decision: FeatureGateDecision) {
    super(decision.message)
    this.featureId = decision.featureId
    this.requiredPlan = decision.requiredPlan
    this.upgradePath = decision.upgradePath
    this.entitlement = decision.entitlement
  }
}

export function isFeatureGateAccessError(error: unknown): error is FeatureGateAccessError {
  return error instanceof FeatureGateAccessError
}

export class FeatureGateService {
  constructor(private readonly entitlementResolver = new EntitlementResolver()) {}

  async evaluateUserFeatureAccess(
    userId: string,
    featureId: SubscriptionFeatureId
  ): Promise<FeatureGateDecision> {
    const resolved = await this.entitlementResolver.resolveForUser(userId, featureId)
    const requiredPlanId = getRequiredPlanForFeature(featureId)
    const requiredPlan = requiredPlanId ? getDisplayPlanName(requiredPlanId) : null
    const upgradePath = buildFeatureUpgradePath(featureId)

    if (resolved.hasAccess) {
      return {
        allowed: true,
        featureId,
        entitlement: resolved.entitlement,
        requiredPlan,
        upgradePath,
        message: "Access granted.",
      }
    }

    const status = resolved.entitlement.status
    let message = "Upgrade to access this feature."
    if (status === "past_due") {
      message = "Subscription is past due. Update billing to restore premium access."
    } else if (status === "expired") {
      message = "Subscription expired. Renew to restore premium access."
    } else if (status === "none") {
      message = requiredPlan
        ? `${requiredPlan} is required to access this feature.`
        : "Upgrade to access this feature."
    }

    return {
      allowed: false,
      featureId,
      entitlement: resolved.entitlement,
      requiredPlan,
      upgradePath,
      message,
    }
  }

  async assertUserHasFeature(userId: string, featureId: SubscriptionFeatureId): Promise<void> {
    const decision = await this.evaluateUserFeatureAccess(userId, featureId)
    if (!decision.allowed) {
      throw new FeatureGateAccessError(decision)
    }
  }
}
