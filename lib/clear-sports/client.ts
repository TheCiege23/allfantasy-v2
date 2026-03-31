/**
 * PROMPT 153 — ClearSports API client.
 * Rate limit, retry, timeout, safe logging. Keys server-side only.
 */

import { getClearSportsConfigFromEnv } from '@/lib/provider-config'
import { recordProviderFailure, recordProviderLatency, logDiagnosticsEvent } from '@/lib/provider-diagnostics'
import { sanitizeProviderError } from '@/lib/ai-orchestration/provider-utils'
import { rateLimitManager } from '@/lib/workers/rate-limit-manager'

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_RATE_LIMIT_PER_MINUTE = 60

function getTimeoutMs(): number {
  const v = process.env.CLEARSPORTS_TIMEOUT_MS
  if (v == null || v === '') return DEFAULT_TIMEOUT_MS
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS
}

function getMaxRetries(): number {
  const v = process.env.CLEARSPORTS_MAX_RETRIES
  if (v == null || v === '') return DEFAULT_MAX_RETRIES
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MAX_RETRIES
}

function getRateLimitPerMinute(): number {
  const v = process.env.CLEARSPORTS_RATE_LIMIT_PER_MINUTE
  if (v == null || v === '') return DEFAULT_RATE_LIMIT_PER_MINUTE
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RATE_LIMIT_PER_MINUTE
}

/** Safe log: path, status, duration only. Never log keys or response bodies. */
function safeLog(path: string, status: number, durationMs: number, extra?: string) {
  const msg = extra ? `[ClearSports] ${path} ${status} ${durationMs}ms ${extra}` : `[ClearSports] ${path} ${status} ${durationMs}ms`
  if (status >= 400) console.warn(msg)
  else if (process.env.NODE_ENV === 'development') console.info(msg)
}

// In-memory rate limit: requests in current minute window
let rateLimitCount = 0
let rateLimitWindowStart = Date.now()

function checkRateLimit(): void {
  const limit = getRateLimitPerMinute()
  const now = Date.now()
  const windowMs = 60_000
  if (now - rateLimitWindowStart >= windowMs) {
    rateLimitWindowStart = now
    rateLimitCount = 0
  }
  if (rateLimitCount >= limit) {
    const waitMs = rateLimitWindowStart + windowMs - now
    if (waitMs > 0) {
      console.warn(`[ClearSports] Rate limit (${limit}/min), waiting ${Math.ceil(waitMs / 1000)}s`)
      throw new Error('ClearSports rate limit — try again shortly')
    }
    rateLimitWindowStart = now
    rateLimitCount = 0
  }
  rateLimitCount++
}

function inferFallbackType(path: string): string {
  const lower = path.toLowerCase()
  if (lower.includes('news')) return 'news'
  if (lower.includes('game')) return 'schedule'
  if (lower.includes('projection') || lower.includes('ranking') || lower.includes('player') || lower.includes('trend')) {
    return 'players'
  }
  return 'players'
}

export async function clearSportsFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  options?: { timeoutMs?: number },
): Promise<T | null> {
  const cfg = getClearSportsConfigFromEnv()
  if (!cfg?.apiKey || !cfg?.baseUrl) return null

  const timeoutMs = options?.timeoutMs ?? getTimeoutMs()
  const maxRetries = getMaxRetries()
  const url = new URL(`${cfg.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  const pathLabel = path + (params && Object.keys(params).length ? `?${url.searchParams.toString().slice(0, 40)}` : '')

  if (!(await rateLimitManager.canCall('clearsports', path))) {
    await rateLimitManager.recordCall('clearsports', path, 429, 0, {
      cached: true,
      error: 'rate_limit_guard',
    })
    return (await rateLimitManager.getFallback('clearsports', inferFallbackType(path))) as T | null
  }

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      checkRateLimit()
    } catch (e) {
      return null
    }

    const start = Date.now()
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })
      clearTimeout(t)
      const durationMs = Date.now() - start

      if (!res.ok) {
        await rateLimitManager.recordCall('clearsports', path, res.status, durationMs, {
          error: res.statusText,
        })
        safeLog(pathLabel, res.status, durationMs, res.statusText)
        if (res.status === 429 && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
        recordProviderFailure('clearsports', `HTTP ${res.status} ${res.statusText}`)
        logDiagnosticsEvent('failure', 'clearsports', `http_${res.status}`)
        return null
      }

      const json = await res.json().catch(() => null)
      await rateLimitManager.recordCall('clearsports', path, res.status, durationMs)
      safeLog(pathLabel, res.status, durationMs)
      recordProviderLatency('clearsports', durationMs)
      logDiagnosticsEvent('latency', 'clearsports', `${durationMs}ms`)
      return json as T
    } catch (err) {
      clearTimeout(t)
      const durationMs = Date.now() - start
      lastError = err instanceof Error ? err : new Error(String(err))
      await rateLimitManager.recordCall('clearsports', path, 500, durationMs, {
        error: lastError.message,
      })
      const isTimeout = lastError.message?.toLowerCase().includes('abort') || lastError.message?.toLowerCase().includes('timeout')
      const safeError = sanitizeProviderError(lastError.message)
      safeLog(pathLabel, isTimeout ? 408 : 500, durationMs, isTimeout ? 'timeout' : safeError.slice(0, 50))
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      } else {
        recordProviderFailure('clearsports', isTimeout ? 'request_timeout' : safeError)
        logDiagnosticsEvent('failure', 'clearsports', isTimeout ? 'timeout' : safeError.slice(0, 120))
        return null
      }
    }
  }

  return null
}

export interface ClearSportsHealthCheckResult {
  configured: boolean
  available: boolean
  checkedAt: string
  latencyMs?: number
  error?: string
}

/**
 * Lightweight live probe for diagnostics/test-keys.
 * Keeps all secrets server-side and returns safe metadata only.
 */
export async function runClearSportsHealthCheck(): Promise<ClearSportsHealthCheckResult> {
  const cfg = getClearSportsConfigFromEnv()
  const checkedAt = new Date().toISOString()
  if (!cfg?.apiKey || !cfg.baseUrl) {
    return {
      configured: false,
      available: false,
      checkedAt,
      error: 'ClearSports not configured',
    }
  }

  const timeoutMs = Math.max(1000, Math.min(getTimeoutMs(), 4000))
  const start = Date.now()
  const json = await clearSportsFetch<unknown>('leagues/nfl/teams', undefined, { timeoutMs })
  const latencyMs = Date.now() - start
  if (json == null) {
    return {
      configured: true,
      available: false,
      checkedAt,
      latencyMs,
      error: 'ClearSports health probe failed',
    }
  }
  return {
    configured: true,
    available: true,
    checkedAt,
    latencyMs,
  }
}
