/**
 * AI load and cost protection: rate limiting, token enforcement, response caching, fallback hints.
 * Use checkAiRateLimit + buildAiLimit429 in routes, or runAiProtection for a single gate.
 */

export { getAiActionConfig, AI_ACTION_CONFIG, type AiProtectionAction, type AiActionConfig } from './config'
export { checkAiRateLimit, type AiRateLimitResult } from './rate-limit'
export { getCachedResponse, setCachedResponse, buildCacheKey } from './cache'
export { checkTokenBalance, deductTokens, type TokenCheckResult } from './tokens'
export {
  runAiProtection,
  buildAiLimit429,
  type AiProtectionOptions,
} from './withAiProtection'
