import { createHash } from 'crypto'

export type SmokeAiPayload = {
  feature: string
  leagueId?: string | null
  route?: string
  prompt?: string
  input?: unknown
}

export type SmokeAiResult = {
  text: string
  json: Record<string, unknown>
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

/**
 * Test-only deterministic AI fallback.
 *
 * This must only run when AI_RESULT_CACHE_SMOKE_PROVIDER=true.
 */
export function isAiResultCacheSmokeProviderEnabled(): boolean {
  return process.env.AI_RESULT_CACHE_SMOKE_PROVIDER === 'true'
}

export function createSmokeAiResult(payload: SmokeAiPayload): SmokeAiResult {
  const stableInput = stableStringify(payload)
  const digest = createHash('sha256').update(stableInput).digest('hex').slice(0, 12)

  return {
    text: `[SMOKE_AI_RESULT:${payload.feature}:${digest}] Deterministic smoke response generated without external provider call.`,
    json: {
      smoke: true,
      feature: payload.feature,
      leagueId: payload.leagueId ?? null,
      route: payload.route ?? null,
      digest,
      generatedBy: 'AI_RESULT_CACHE_SMOKE_PROVIDER',
    },
  }
}
