export const CHIMMY_PREMIUM_FEATURE_MESSAGE =
  "This is a premium feature. Upgrade to AF Pro or AF Supreme to unlock full trade analysis, waiver recommendations, draft assistance, and more."

export const CHIMMY_GENERIC_ERROR_MESSAGE =
  "Something went wrong on our end. Please try again in a moment."

export const CHIMMY_PREMIUM_CTA_LABEL = "View plans"
export const CHIMMY_DEFAULT_UPGRADE_PATH = "/pricing"

const PREMIUM_GATE_CODES = new Set([
  "feature_not_entitled",
  "token_confirmation_required",
  "insufficient_token_balance",
])

export function isChimmyPremiumGateResponse(input: {
  status?: number
  code?: unknown
  upgradeRequired?: unknown
}): boolean {
  if (input.upgradeRequired === true) return true

  const code = typeof input.code === "string" ? input.code : ""
  if (PREMIUM_GATE_CODES.has(code)) return true

  return input.status === 402 || input.status === 403 || input.status === 409
}

export function resolveChimmyUpgradePath(value: unknown): string {
  if (typeof value !== "string") return CHIMMY_DEFAULT_UPGRADE_PATH
  const normalized = value.trim()
  if (!normalized.startsWith("/")) return CHIMMY_DEFAULT_UPGRADE_PATH
  return normalized
}
