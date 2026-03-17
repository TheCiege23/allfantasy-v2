/**
 * PROMPT 153 — ClearSports API client.
 * Rate limit, retry, timeout, safe logging. Keys server-side only.
 */

import { getClearSportsConfigFromEnv } from '@/lib/provider-config'

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
        safeLog(pathLabel, res.status, durationMs, res.statusText)
        if (res.status === 429 && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          continue
        }
        return null
      }

      const json = await res.json().catch(() => null)
      safeLog(pathLabel, res.status, durationMs)
      return json as T
    } catch (err) {
      clearTimeout(t)
      const durationMs = Date.now() - start
      lastError = err instanceof Error ? err : new Error(String(err))
      const isTimeout = lastError.message?.toLowerCase().includes('abort') || lastError.message?.toLowerCase().includes('timeout')
      safeLog(pathLabel, isTimeout ? 408 : 500, durationMs, isTimeout ? 'timeout' : lastError.message?.slice(0, 50) ?? 'error')
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      } else {
        return null
      }
    }
  }

  return null
}
