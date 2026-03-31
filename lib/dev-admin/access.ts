import type { EntitlementStatus, SubscriptionPlanId } from "@/lib/subscription/types"
import { getTokenSpendRuleMatrixEntry, type TokenPricingTier } from "@/lib/tokens/pricing-matrix"

const DEV_ADMIN_PLANS: readonly SubscriptionPlanId[] = ["all_access"]
const DEV_ADMIN_STATUS: EntitlementStatus = "active"
const DEV_ADMIN_BALANCE = 1_000_000_000

type DevAdminEntitlementSnapshot = {
  plans: SubscriptionPlanId[]
  status: EntitlementStatus
  currentPeriodEnd: string | null
  gracePeriodEnd: string | null
}

type DevAdminTokenBalanceSnapshot = {
  balance: number
  lifetimePurchased: number
  lifetimeSpent: number
  lifetimeRefunded: number
  updatedAt: string
}

type DevAdminTokenSpendPreview = {
  ruleCode: string
  featureLabel: string
  tokenCost: number
  baseTokenCost: number
  pricingTier: TokenPricingTier
  requiredPlan: SubscriptionPlanId | null
  discountPct: number
  chargeMode: "subscriber_discounted_tokens"
  subscriptionEligible: boolean
  policyMessage: string
  monthlyIncludedPremiumCredits: number | null
  supportsUnlimitedLowTierInFuture: boolean
  currentBalance: number
  canSpend: boolean
  requiresConfirmation: boolean
}

type DevAdminTokenLedgerEntryView = {
  id: string
  entryType: string
  tokenDelta: number
  balanceBefore: number
  balanceAfter: number
  tokenPackageSku: string | null
  spendRuleCode: string | null
  spendFeatureLabel: string | null
  refundRuleCode: string | null
  sourceType: string | null
  sourceId: string | null
  description: string | null
  metadata: unknown
  createdAt: string
}

function parseDevAdminUserIds(rawValue: string | undefined): Set<string> {
  if (!rawValue) return new Set()
  return new Set(
    rawValue
      .split(/[\n\r,;]+/)
      .map((value) => value.trim())
      .filter(Boolean)
  )
}

function getRuleMeta(ruleCode: string): {
  featureLabel: string
  baseTokenCost: number
  pricingTier: TokenPricingTier
  requiredPlan: SubscriptionPlanId | null
} {
  const matrixEntry = getTokenSpendRuleMatrixEntry(ruleCode)
  return {
    featureLabel: matrixEntry?.featureLabel ?? `Dev admin bypass for ${ruleCode}`,
    baseTokenCost: Math.max(0, Number(matrixEntry?.tokenCost ?? 0)),
    pricingTier: matrixEntry?.tier ?? "low",
    requiredPlan: matrixEntry?.requiredPlan ?? null,
  }
}

export function isDevAdminUserId(userId: string | null | undefined): boolean {
  const normalizedUserId = String(userId ?? "").trim()
  if (!normalizedUserId) return false
  return parseDevAdminUserIds(process.env.DEV_ADMIN_USER_IDS).has(normalizedUserId)
}

export function buildDevAdminEntitlementSnapshot(): DevAdminEntitlementSnapshot {
  return {
    plans: [...DEV_ADMIN_PLANS],
    status: DEV_ADMIN_STATUS,
    currentPeriodEnd: null,
    gracePeriodEnd: null,
  }
}

export function buildDevAdminTokenBalanceSnapshot(): DevAdminTokenBalanceSnapshot {
  return {
    balance: DEV_ADMIN_BALANCE,
    lifetimePurchased: DEV_ADMIN_BALANCE,
    lifetimeSpent: 0,
    lifetimeRefunded: 0,
    updatedAt: new Date().toISOString(),
  }
}

export function buildDevAdminTokenSpendPreview(ruleCode: string): DevAdminTokenSpendPreview {
  const ruleMeta = getRuleMeta(String(ruleCode))
  return {
    ruleCode: String(ruleCode),
    featureLabel: ruleMeta.featureLabel,
    tokenCost: 0,
    baseTokenCost: ruleMeta.baseTokenCost,
    pricingTier: ruleMeta.pricingTier,
    requiredPlan: ruleMeta.requiredPlan,
    discountPct: 100,
    chargeMode: "subscriber_discounted_tokens",
    subscriptionEligible: true,
    policyMessage: "Dev admin bypass active. Token charge skipped.",
    monthlyIncludedPremiumCredits: null,
    supportsUnlimitedLowTierInFuture: true,
    currentBalance: DEV_ADMIN_BALANCE,
    canSpend: true,
    requiresConfirmation: false,
  }
}

export function buildDevAdminSpendLedgerEntry(input: {
  ruleCode: string
  sourceType?: string | null
  sourceId?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
}): DevAdminTokenLedgerEntryView {
  const ruleMeta = getRuleMeta(String(input.ruleCode))
  const timestamp = new Date().toISOString()
  return {
    id: `dev-admin-spend:${String(input.ruleCode)}:${Date.now()}`,
    entryType: "spend",
    tokenDelta: 0,
    balanceBefore: DEV_ADMIN_BALANCE,
    balanceAfter: DEV_ADMIN_BALANCE,
    tokenPackageSku: null,
    spendRuleCode: String(input.ruleCode),
    spendFeatureLabel: ruleMeta.featureLabel,
    refundRuleCode: null,
    sourceType: input.sourceType ?? null,
    sourceId: input.sourceId ?? null,
    description: input.description ?? "Dev admin bypass token spend",
    metadata: {
      ...(input.metadata ?? {}),
      devAdminBypass: true,
    },
    createdAt: timestamp,
  }
}

export function buildDevAdminRefundLedgerEntry(input: {
  refundRuleCode: string
  sourceType?: string | null
  sourceId?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
}): DevAdminTokenLedgerEntryView {
  const timestamp = new Date().toISOString()
  return {
    id: `dev-admin-refund:${String(input.refundRuleCode)}:${Date.now()}`,
    entryType: "refund",
    tokenDelta: 0,
    balanceBefore: DEV_ADMIN_BALANCE,
    balanceAfter: DEV_ADMIN_BALANCE,
    tokenPackageSku: null,
    spendRuleCode: null,
    spendFeatureLabel: null,
    refundRuleCode: String(input.refundRuleCode),
    sourceType: input.sourceType ?? "refund_for_spend",
    sourceId: input.sourceId ?? null,
    description: input.description ?? "Dev admin bypass refund",
    metadata: {
      ...(input.metadata ?? {}),
      devAdminBypass: true,
    },
    createdAt: timestamp,
  }
}
