/**
 * Simple in-memory rate limiter for league creation and sensitive operations.
 * Uses a sliding window approach. Resets on server restart.
 *
 * For production, consider Redis-based rate limiting.
 */

const windows = new Map<string, { count: number; resetAt: number }>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
}

/**
 * Check rate limit for a given key (usually userId + action).
 * @param key - Unique identifier (e.g., `create:${userId}`)
 * @param maxRequests - Max requests per window
 * @param windowMs - Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const entry = windows.get(key)

  if (!entry || now > entry.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  entry.count += 1
  return { allowed: true, remaining: maxRequests - entry.count }
}

/**
 * Rate limit for league creation: 5 leagues per hour per user.
 */
export function checkCreateLeagueRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`create:${userId}`, 5, 60 * 60 * 1000)
}

/**
 * Rate limit for trade proposals: 20 per hour per user.
 */
export function checkTradeRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`trade:${userId}`, 20, 60 * 60 * 1000)
}

/**
 * Rate limit for waiver claims: 30 per hour per user.
 */
export function checkWaiverRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`waiver:${userId}`, 30, 60 * 60 * 1000)
}

/**
 * Rate limit for AI features: 50 per hour per league (prevents API cost abuse).
 */
export function checkAIFeatureRateLimit(leagueId: string): RateLimitResult {
  return checkRateLimit(`ai:${leagueId}`, 50, 60 * 60 * 1000)
}

// Cleanup stale entries every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of windows) {
      if (now > entry.resetAt) windows.delete(key)
    }
  }, 10 * 60 * 1000)
}
