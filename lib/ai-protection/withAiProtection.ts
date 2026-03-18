/**
 * Wrapper for AI route handlers: rate limit + optional token check.
 * On rate limit or insufficient tokens, returns 429 with useDeterministicFallback
 * so clients can show a message or fall back to deterministic logic.
 */

import { NextResponse } from 'next/server'
import { buildRateLimit429 } from '@/lib/rate-limit'
import type { NextRequest } from 'next/server'
import { checkAiRateLimit } from './rate-limit'
import { checkTokenBalance } from './tokens'
import type { AiProtectionAction } from './config'
import { getAiActionConfig } from './config'

export type AiProtectionOptions = {
  action: AiProtectionAction
  /** Override maxRequests / windowMs from config. */
  maxRequests?: number
  windowMs?: number
  includeIpInKey?: boolean
  /** If true, check token balance (when implemented) and return 429 when insufficient. */
  enforceTokens?: boolean
  /** Extract userId from request (e.g. from session). */
  getUserId?: (req: NextRequest) => Promise<string | null>
  /** Extract sleeperUsername from request body or headers; used when getUserId not available. */
  getSleeperUsername?: (req: NextRequest) => Promise<string | null>
}

const DEFAULT_MESSAGE = 'Too many requests. Please wait before trying again.'

/**
 * Returns a 429 NextResponse with useDeterministicFallback so clients can fall back to non-AI behavior.
 */
export function buildAiLimit429(args: {
  message?: string
  retryAfterSec: number
  remaining: number
  resetTimeMs: number
}) {
  const body = {
    ...buildRateLimit429({
      message: args.message ?? DEFAULT_MESSAGE,
      rl: {
        success: false,
        remaining: args.remaining,
        retryAfterSec: args.retryAfterSec,
        resetTimeMs: args.resetTimeMs,
        key: 'ai',
      },
    }),
    useDeterministicFallback: true as const,
  }
  const retryAfterSec = Math.ceil(args.retryAfterSec) || 60
  return NextResponse.json(body, {
    status: 429,
    headers: { 'Retry-After': String(retryAfterSec) },
  })
}

/**
 * Run protection checks (rate limit, optional token check). Returns null if allowed,
 * or a NextResponse to return immediately (429) if not.
 */
export async function runAiProtection(
  req: NextRequest,
  options: AiProtectionOptions
): Promise<NextResponse | null> {
  const userId = options.getUserId ? await options.getUserId(req) : null
  const sleeperUsername = options.getSleeperUsername ? await options.getSleeperUsername(req) : null

  const rl = checkAiRateLimit(req, options.action, {
    userId: userId ?? undefined,
    sleeperUsername: sleeperUsername ?? undefined,
    maxRequests: options.maxRequests,
    windowMs: options.windowMs,
    includeIpInKey: options.includeIpInKey,
  })

  if (!rl.allowed) {
    return buildAiLimit429({
      message: DEFAULT_MESSAGE,
      retryAfterSec: rl.retryAfterSec,
      remaining: rl.remaining,
      resetTimeMs: rl.resetTimeMs,
    })
  }

  if (options.enforceTokens) {
    const config = getAiActionConfig(options.action)
    const cost = config.estimatedTokenCost ?? 0
    const tokenCheck = await checkTokenBalance(userId, cost)
    if (!tokenCheck.allowed) {
      return buildAiLimit429({
        message: tokenCheck.message ?? 'Insufficient balance. Please upgrade or try again later.',
        retryAfterSec: 60,
        remaining: 0,
        resetTimeMs: Date.now() + 60_000,
      })
    }
  }

  return null
}
