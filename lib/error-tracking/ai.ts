/**
 * AI failure logging. Call from AI routes (trade-evaluator, chimmy, ai/chat, ai/waiver, etc.)
 * when an AI call fails, times out, or returns invalid output.
 */

import { captureException } from './capture'

export type AiFailureContext = {
  tool: string
  provider?: string
  endpoint?: string
  /** e.g. timeout, validation_failed, rate_limit */
  reason?: string
  durationMs?: number
  userId?: string | null
  leagueId?: string | null
  meta?: Record<string, unknown>
}

/**
 * Log an AI-related failure. Use in catch blocks of AI routes or after validation failure.
 */
export function logAiFailure(error: unknown, ctx: AiFailureContext): void {
  const { tool, provider, endpoint, reason, durationMs, userId, leagueId, meta } = ctx
  const err = error instanceof Error ? error : new Error(String(error))
  captureException(err, {
    context: 'ai_failure',
    path: endpoint ?? tool,
    tool,
    provider: provider ?? undefined,
    reason: reason ?? undefined,
    durationMs,
    userId: userId ?? undefined,
    leagueId: leagueId ?? undefined,
    ...meta,
    tags: {
      type: 'ai',
      tool,
      ...(provider ? { provider } : {}),
      ...(reason ? { reason } : {}),
    },
  })
}
