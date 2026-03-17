/**
 * AI Orchestration — backend foundation for unified AI layer.
 * Provider abstraction, tool registry, orchestration service, validation, errors, tracing.
 */

export * from './types'
export * from './provider-interface'
export * from './provider-registry'
export * from './tool-registry'
export * from './request-validator'
export * from './response-normalizer'
export * from './error-handler'
export * from './quality-gate'
export * from './tracing'
export * from './orchestration-service'
export {
  enrichEnvelopeWithSportsData,
  fetchSportsContextForEnvelope,
  type EnrichmentOptions,
  type SportsEnrichmentDataTypes,
} from './sports-context-enricher'

export { createOpenAIProvider, createOpenAIAdapter } from './providers/openai-provider'
export { createDeepSeekProvider, createDeepSeekAdapter } from './providers/deepseek-provider'
export { createGrokProvider, createXAIAdapter } from './providers/grok-provider'
export { sanitizeProviderError, isMeaningfulText } from './provider-utils'
