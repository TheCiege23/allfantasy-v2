import { ENTITLEMENTS } from "@/lib/monetization/entitlements"
import { getPremiumMonetizationForFeature } from "@/lib/monetization/feature-monetization-matrix"
import {
  buildFeatureUpgradePath,
  getDisplayPlanName,
  getRequiredPlanForFeature,
} from "@/lib/subscription/feature-access"
import type { SubscriptionFeatureId } from "@/lib/subscription/types"

export type { SubscriptionFeatureId } from "@/lib/subscription/types"

const PLAN_UPGRADE_URLS: Record<string, string> = {
  pro: "/pro",
  commissioner: "/commissioner-upgrade",
  war_room: "/war-room",
  all_access: "/all-access",
}

const PLAN_DISPLAY: Record<string, string> = {
  af_pro: "AF Pro",
  af_commissioner: "AF Commissioner",
  af_war_room: "AF War Room",
  af_all_access: "All-Access",
}

export type GateDef = {
  featureId: SubscriptionFeatureId
  label: string
  description: string
  upgradeUrl: string
  upgradeLabel: string
  highlightParam?: string
  /** Human-readable plan names for modal copy (e.g. “AF Commissioner or AF Pro”). */
  requiredPlanDisplay: string[]
}

const GATE_UI_OVERRIDES: Partial<
  Record<SubscriptionFeatureId, Partial<Pick<GateDef, "label" | "description" | "highlightParam">>>
> = {}

function formatFeatureLabel(featureId: string): string {
  return featureId
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function getGateDef(featureId: SubscriptionFeatureId): GateDef {
  const requiredPlan = getRequiredPlanForFeature(featureId)
  const planName = requiredPlan ? getDisplayPlanName(requiredPlan) : "Premium"
  const fallbackUpgradeUrl = PLAN_UPGRADE_URLS[requiredPlan ?? ""] ?? "/pricing"
  const override = GATE_UI_OVERRIDES[featureId]

  const cat = ENTITLEMENTS[featureId as keyof typeof ENTITLEMENTS]
  if (cat) {
    const rawNames = cat.requiredPlan
      .filter((p) => p !== "af_all_access")
      .map((p) => PLAN_DISPLAY[p] ?? p)
    const requiredPlanDisplay =
      rawNames.length > 0 ? rawNames : [PLAN_DISPLAY.af_all_access]
    return {
      featureId,
      label: override?.label ?? cat.label,
      description:
        override?.description ?? cat.description,
      upgradeUrl: cat.upgradeUrl,
      upgradeLabel: cat.upgradeLabel,
      highlightParam: override?.highlightParam ?? cat.highlightFeature,
      requiredPlanDisplay,
    }
  }

  const matrix = getPremiumMonetizationForFeature(featureId)
  const requiredPlanDisplay = requiredPlan ? [planName] : ["Premium"]
  return {
    featureId,
    label: override?.label ?? matrix?.title ?? formatFeatureLabel(featureId),
    description:
      override?.description ??
      (requiredPlan
        ? `${planName} subscription required for this feature.`
        : "Premium subscription required for this feature."),
    upgradeUrl: buildFeatureUpgradePath(featureId) || fallbackUpgradeUrl,
    upgradeLabel: `Get ${planName}`,
    highlightParam: override?.highlightParam,
    requiredPlanDisplay,
  }
}

export function getUpgradeUrlForFeature(featureId: SubscriptionFeatureId): string {
  return getGateDef(featureId).upgradeUrl
}
