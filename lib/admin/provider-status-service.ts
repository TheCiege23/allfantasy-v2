/**
 * PROMPT 155 — Provider status and diagnostics service.
 * Tracks recent failures, fallback events, latency. Safe diagnostics only (no secrets, no stack traces).
 */

import { sanitizeProviderError } from '@/lib/ai-orchestration/provider-utils'

export type ProviderId = 'openai' | 'deepseek' | 'grok' | 'clearsports'

const MAX_FAILURES_PER_PROVIDER = 50
const MAX_FALLBACK_EVENTS = 100
const LATENCY_SAMPLES_PER_PROVIDER = 20

interface FailureEntry {
  at: number
  provider: ProviderId
  error?: string
}

interface FallbackEntry {
  at: number
  primary: ProviderId
  used: ProviderId
}

const recentFailures: FailureEntry[] = []
const fallbackEvents: FallbackEntry[] = []
const latencyByProvider: Partial<Record<ProviderId, number[]>> = {}

function trimFailures() {
  const byProvider = new Map<ProviderId, FailureEntry[]>()
  for (const e of recentFailures) {
    const list = byProvider.get(e.provider) || []
    list.push(e)
    byProvider.set(e.provider, list)
  }
  recentFailures.length = 0
  for (const [, list] of byProvider) {
    const sorted = list.sort((a, b) => b.at - a.at).slice(0, MAX_FAILURES_PER_PROVIDER)
    recentFailures.push(...sorted)
  }
  recentFailures.sort((a, b) => b.at - a.at)
}

function trimFallbacks() {
  if (fallbackEvents.length > MAX_FALLBACK_EVENTS) {
    fallbackEvents.sort((a, b) => b.at - a.at)
    fallbackEvents.length = MAX_FALLBACK_EVENTS
  }
}

/** Record a provider failure (error message is sanitized before storage). */
export function recordProviderFailure(provider: ProviderId, error?: string): void {
  recentFailures.push({
    at: Date.now(),
    provider,
    error: error ? sanitizeProviderError(error) : undefined,
  })
  trimFailures()
}

/** Record that a fallback was used (primary failed or skipped, used instead). */
export function recordProviderFallback(primary: ProviderId, used: ProviderId): void {
  fallbackEvents.push({ at: Date.now(), primary, used })
  trimFallbacks()
}

/** Record latency for a provider (ms). */
export function recordProviderLatency(provider: ProviderId, latencyMs: number): void {
  const arr = latencyByProvider[provider] || []
  arr.push(latencyMs)
  if (arr.length > LATENCY_SAMPLES_PER_PROVIDER) arr.shift()
  latencyByProvider[provider] = arr
}

/** Safe log for server logs only (no secrets). */
export function logDiagnosticsEvent(event: 'failure' | 'fallback' | 'latency', provider: string, detail?: string): void {
  if (process.env.NODE_ENV === 'development' || event === 'failure') {
    const msg = detail ? `[ProviderDiagnostics] ${event} ${provider} ${detail}` : `[ProviderDiagnostics] ${event} ${provider}`
    if (event === 'failure') console.warn(msg)
    else console.info(msg)
  }
}

export type ProviderStatusState = 'configured' | 'available' | 'degraded' | 'unavailable' | 'fallback_active'

export interface ProviderDiagnosticsEntry {
  id: ProviderId
  state: ProviderStatusState
  configured: boolean
  available: boolean
  healthy?: boolean
  error?: string
  lastLatencyMs?: number
  recentFailureCount: number
  lastFailureAt?: number
  fallbackUsedCount: number
}

export interface RecentFailureSummary {
  provider: ProviderId
  at: number
  error?: string
}

export interface FallbackEventSummary {
  at: number
  primary: ProviderId
  used: ProviderId
}

export interface ProviderDiagnosticsPayload {
  providers: ProviderDiagnosticsEntry[]
  recentFailures: RecentFailureSummary[]
  fallbackEvents: FallbackEventSummary[]
  latencyTrend: Record<ProviderId, number[]>
  generatedAt: number
}

/** Get recent failure count for a provider (e.g. last hour). */
function getRecentFailureCount(provider: ProviderId, windowMs: number = 3600_000): number {
  const cutoff = Date.now() - windowMs
  return recentFailures.filter((e) => e.provider === provider && e.at >= cutoff).length
}

/** Get fallback count where this provider was the primary that was skipped. */
function getFallbackUsedCount(provider: ProviderId, windowMs: number = 3600_000): number {
  const cutoff = Date.now() - windowMs
  return fallbackEvents.filter((e) => e.primary === provider && e.at >= cutoff).length
}

/** Build safe diagnostics payload for admin (no secrets, no stack traces). */
export function getProviderDiagnostics(healthEntries: Array<{ role: string; available: boolean; healthy?: boolean; error?: string }>, clearsportsConfigured: boolean, clearsportsAvailable: boolean): ProviderDiagnosticsPayload {
  const windowMs = 3600_000
  const providerIds: ProviderId[] = ['openai', 'deepseek', 'grok']
  const entries: ProviderDiagnosticsEntry[] = providerIds.map((id) => {
    const health = healthEntries.find((e) => e.role === id)
    const configured = !!health?.available
    const available = !!health?.available
    const healthy = health?.healthy
    const failureCount = getRecentFailureCount(id, windowMs)
    const fallbackCount = getFallbackUsedCount(id, windowMs)
    const lastFailure = recentFailures.filter((e) => e.provider === id).sort((a, b) => b.at - a.at)[0]
    const latencies = latencyByProvider[id]
    const lastLatencyMs = latencies?.length ? latencies[latencies.length - 1] : undefined

    let state: ProviderStatusState = 'unavailable'
    if (configured && available) {
      if (fallbackCount > 0 && failureCount > 0) state = 'fallback_active'
      else if (healthy === false || failureCount > 2) state = 'degraded'
      else if (healthy === true || healthy === undefined) state = 'available'
      else state = 'configured'
    } else if (configured) state = 'configured'

    return {
      id,
      state,
      configured,
      available,
      healthy,
      error: health?.error,
      lastLatencyMs,
      recentFailureCount: failureCount,
      lastFailureAt: lastFailure?.at,
      fallbackUsedCount: fallbackCount,
    }
  })

  entries.push({
    id: 'clearsports',
    state: clearsportsConfigured && clearsportsAvailable ? 'available' : clearsportsConfigured ? 'configured' : 'unavailable',
    configured: clearsportsConfigured,
    available: clearsportsAvailable,
    healthy: clearsportsAvailable ? undefined : undefined,
    recentFailureCount: recentFailures.filter((e) => e.provider === 'clearsports').length,
    fallbackUsedCount: 0,
  })

  const failureSummary = recentFailures
    .slice()
    .sort((a, b) => b.at - a.at)
    .slice(0, 30)
    .map((e) => ({ provider: e.provider, at: e.at, error: e.error }))

  const fallbackSummary = fallbackEvents
    .slice()
    .sort((a, b) => b.at - a.at)
    .slice(0, 30)
    .map((e) => ({ at: e.at, primary: e.primary, used: e.used }))

  const latencyTrend: Record<ProviderId, number[]> = {
    openai: [...(latencyByProvider.openai || [])],
    deepseek: [...(latencyByProvider.deepseek || [])],
    grok: [...(latencyByProvider.grok || [])],
    clearsports: [],
  }

  return {
    providers: entries,
    recentFailures: failureSummary,
    fallbackEvents: fallbackSummary,
    latencyTrend,
    generatedAt: Date.now(),
  }
}
