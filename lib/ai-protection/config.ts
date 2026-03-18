/**
 * AI protection config: rate limits and token costs per action.
 * Used by withAiProtection and checkAiRateLimit.
 */

export type AiProtectionAction =
  | 'chat'
  | 'chimmy'
  | 'trade_eval'
  | 'waiver'
  | 'orchestrate'

export interface AiActionConfig {
  maxRequests: number
  windowMs: number
  /** Estimated token cost per request; used when token enforcement is enabled. */
  estimatedTokenCost?: number
  /** Cache TTL in ms; 0 = no cache. */
  cacheTtlMs?: number
}

const DEFAULT_WINDOW_MS = 60_000

export const AI_ACTION_CONFIG: Record<AiProtectionAction, AiActionConfig> = {
  chat: {
    maxRequests: 20,
    windowMs: DEFAULT_WINDOW_MS,
    estimatedTokenCost: 500,
    cacheTtlMs: 0,
  },
  chimmy: {
    maxRequests: 30,
    windowMs: DEFAULT_WINDOW_MS,
    estimatedTokenCost: 800,
    cacheTtlMs: 0,
  },
  trade_eval: {
    maxRequests: 15,
    windowMs: DEFAULT_WINDOW_MS,
    estimatedTokenCost: 600,
    cacheTtlMs: 120_000, // 2 min for identical trade inputs
  },
  waiver: {
    maxRequests: 15,
    windowMs: DEFAULT_WINDOW_MS,
    estimatedTokenCost: 700,
    cacheTtlMs: 60_000,
  },
  orchestrate: {
    maxRequests: 40,
    windowMs: DEFAULT_WINDOW_MS,
    estimatedTokenCost: 1000,
    cacheTtlMs: 0,
  },
}

export function getAiActionConfig(action: AiProtectionAction): AiActionConfig {
  return AI_ACTION_CONFIG[action] ?? {
    maxRequests: 15,
    windowMs: DEFAULT_WINDOW_MS,
    estimatedTokenCost: 500,
    cacheTtlMs: 0,
  }
}
