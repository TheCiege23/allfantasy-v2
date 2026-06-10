import type { DataFreshnessTier } from "./types"

export type ProviderFreshnessPolicy = Partial<Record<DataFreshnessTier, number>>

export type ProviderFreshnessDecision = {
  ok: boolean
  freshness: DataFreshnessTier
  ageMinutes: number | null
  maxAgeMinutes: number | null
  reason: string | null
}

export const DEFAULT_PROVIDER_FRESHNESS_POLICY: ProviderFreshnessPolicy = {
  live: 15,
  cached: 24 * 60,
  schedule_only: 7 * 24 * 60,
}

export function getProviderMaxAgeMinutes(
  freshness: DataFreshnessTier,
  policy: ProviderFreshnessPolicy = DEFAULT_PROVIDER_FRESHNESS_POLICY,
): number | null {
  return policy[freshness] ?? null
}

export function evaluateProviderFreshness(input: {
  freshness: DataFreshnessTier
  fetchedAt: Date | null
  now?: Date
  policy?: ProviderFreshnessPolicy
}): ProviderFreshnessDecision {
  const maxAgeMinutes = getProviderMaxAgeMinutes(input.freshness, input.policy)
  if (maxAgeMinutes == null) {
    return {
      ok: true,
      freshness: input.freshness,
      ageMinutes: null,
      maxAgeMinutes,
      reason: null,
    }
  }

  if (!input.fetchedAt) {
    return {
      ok: false,
      freshness: input.freshness,
      ageMinutes: null,
      maxAgeMinutes,
      reason: `${input.freshness} provider data is missing fetchedAt, so it cannot be trusted for AI grounding.`,
    }
  }

  const now = input.now ?? new Date()
  const ageMs = now.getTime() - input.fetchedAt.getTime()
  const ageMinutes = Number.isFinite(ageMs) ? Math.max(0, Math.round(ageMs / 60_000)) : null

  if (ageMinutes == null || ageMinutes > maxAgeMinutes) {
    return {
      ok: false,
      freshness: input.freshness,
      ageMinutes,
      maxAgeMinutes,
      reason:
        ageMinutes == null
          ? `${input.freshness} provider data has an invalid fetchedAt timestamp.`
          : `${input.freshness} provider data is ${ageMinutes} minutes old, above the ${maxAgeMinutes} minute freshness limit.`,
    }
  }

  return {
    ok: true,
    freshness: input.freshness,
    ageMinutes,
    maxAgeMinutes,
    reason: null,
  }
}

export function annotateGroundingPacketWithProviderFreshness(
  packet: Record<string, unknown>,
  decision: ProviderFreshnessDecision,
): Record<string, unknown> {
  if (decision.ok || !decision.reason) return packet

  const staleMessage = `Provider data rejected as stale: ${decision.reason}`
  const missingData = Array.isArray(packet.missingData)
    ? [...packet.missingData.map(String), staleMessage]
    : [staleMessage]
  const forbiddenClaims = Array.isArray(packet.forbiddenClaims)
    ? [
        ...packet.forbiddenClaims.map(String),
        "current provider facts from rejected stale data",
      ]
    : ["current provider facts from rejected stale data"]

  return {
    ...packet,
    missingData,
    forbiddenClaims,
    providerFreshness: {
      status: "stale_rejected",
      tier: decision.freshness,
      ageMinutes: decision.ageMinutes,
      maxAgeMinutes: decision.maxAgeMinutes,
      reason: decision.reason,
    },
  }
}
