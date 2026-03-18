/**
 * Per-user (and IP) rate limiting for AI endpoints.
 * Uses existing consumeRateLimit with scope "ai" and configurable action.
 */

import { consumeRateLimit, getClientIp, type RateLimitResult } from '@/lib/rate-limit'
import type { Request } from 'next/server'
import type { AiProtectionAction } from './config'
import { getAiActionConfig } from './config'

export type AiRateLimitResult = RateLimitResult & { allowed: boolean }

/**
 * Run rate limit for an AI action. Prefer userId (or sleeperUsername) so limits are per user;
 * fall back to IP when unauthenticated.
 */
export function checkAiRateLimit(
  req: Request,
  action: AiProtectionAction,
  options: {
    userId?: string | null
    sleeperUsername?: string | null
    /** Override config; optional. */
    maxRequests?: number
    windowMs?: number
    includeIpInKey?: boolean
  } = {}
): AiRateLimitResult {
  const config = getAiActionConfig(action)
  const ip = getClientIp(req)
  const userPart = options.userId?.trim() || options.sleeperUsername?.trim()?.toLowerCase() || null
  const rl = consumeRateLimit({
    scope: 'ai',
    action,
    sleeperUsername: userPart ?? undefined,
    ip,
    maxRequests: options.maxRequests ?? config.maxRequests,
    windowMs: options.windowMs ?? config.windowMs,
    includeIpInKey: options.includeIpInKey ?? true,
  })
  return { ...rl, allowed: rl.success }
}
