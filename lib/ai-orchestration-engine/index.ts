/**
 * PROMPT 123 — Unified AI Orchestration Engine.
 * Single backend layer for all AI tools; deterministic-first. Supported sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 * All provider keys server-side only; no keys exposed to frontend.
 */

import type { AIModelRole, AIContextEnvelope, OrchestrationMode, ModelOutput, OrchestrationResult } from '@/lib/unified-ai/types'
import type { UnifiedAIRequest, UnifiedAIResponse, UnifiedAIError, ProviderChatRequest, ProviderChatResult } from '@/lib/ai-orchestration/types'

// --- AIProviderInterface (provider adapters) ---
export type { IProviderClient } from '@/lib/ai-orchestration/provider-interface'
export type { ProviderChatRequest, ProviderChatResult }
/** Alias for PROMPT 123: AIProviderInterface = IProviderClient. */
export type AIProviderInterface = import('@/lib/ai-orchestration/provider-interface').IProviderClient

/** Provider adapters (PROMPT 152): OpenAI, DeepSeek, xAI (Grok). Aliases: OpenAIAdapter = createOpenAIAdapter(), etc. */
export { createOpenAIProvider, createOpenAIAdapter } from '@/lib/ai-orchestration/providers/openai-provider'
export { createDeepSeekProvider, createDeepSeekAdapter } from '@/lib/ai-orchestration/providers/deepseek-provider'
export { createGrokProvider, createXAIAdapter, createXAIAdapter as createGrokAdapter } from '@/lib/ai-orchestration/providers/grok-provider'

// --- AIProviderRegistry ---
export {
  getProvider,
  getAvailableProviders,
  getAvailableFromRequested,
  checkProviderAvailability,
} from '@/lib/ai-orchestration/provider-registry'
export type { AIModelRole }

// --- AIToolRegistry ---
export {
  getToolEntry,
  getDefaultModeForTool,
  isModeAllowed,
  resolveEffectiveMode,
  getAllToolTypes,
} from '@/lib/ai-orchestration/tool-registry'
export type { ToolRegistryEntry, OrchestrationToolType } from '@/lib/ai-orchestration/types'

// --- AIOrchestratorService ---
export { runUnifiedOrchestration } from '@/lib/ai-orchestration/orchestration-service'
export type { RunOrchestrationResult } from '@/lib/ai-orchestration/orchestration-service'

// --- AIConsensusEngine ---
export { evaluateConsensus, mergeStructuredConsensus } from '@/lib/unified-ai/ConsensusEvaluator'
export type { ConsensusInput } from '@/lib/unified-ai/ConsensusEvaluator'

// --- AIUnifiedBrainEngine ---
export { composeUnifiedBrain } from '@/lib/unified-ai/UnifiedBrainComposer'
export type { UnifiedBrainInput } from '@/lib/unified-ai/UnifiedBrainComposer'

// --- AIQualityGate ---
export { runQualityGate, applyQualityGateToAnswer } from '@/lib/ai-orchestration/quality-gate'
export type { QualityGateConfig } from '@/lib/ai-orchestration/quality-gate'

// --- AIConfidenceCalculator ---
export { resolveConfidence, formatConfidenceLine } from '@/lib/unified-ai/AIConfidenceResolver'
export type { ConfidenceResult, ConfidenceLabel } from '@/lib/unified-ai/AIConfidenceResolver'

// --- DeterministicContextEnvelope ---
export type { DeterministicContextEnvelope, EvidenceBlock, EvidenceItem, Confidence, UncertaintyBlock, MissingDataBlock } from '@/lib/ai-context-envelope/schema'
export type { AIContextEnvelope } from '@/lib/unified-ai/types'
export { buildAIContextEnvelope } from '@/lib/unified-ai/AIContextEnvelopeBuilder'

// --- ResponseNormalizer ---
export { normalizeToUnifiedResponse } from '@/lib/ai-orchestration/response-normalizer'
export type { NormalizerInput } from '@/lib/ai-orchestration/response-normalizer'
export type { UnifiedAIResponse, RequiredOutputStructure } from '@/lib/ai-orchestration/types'

// --- ErrorHandler ---
export { toUnifiedAIError, toHttpStatus, fromThrown, toAIErrorCode } from '@/lib/ai-orchestration/error-handler'
export type { AIErrorCode, UnifiedAIError } from '@/lib/ai-orchestration/types'

// --- ProviderHealthCheck ---
export { getProviderAvailability, runProviderHealthCheck } from './provider-health-check'
export type { ProviderHealthEntry } from './provider-health-check'

// --- FallbackPolicy ---
export {
  FALLBACK_PRIMARY_ORDER,
  FALLBACK_ANALYSIS_ORDER,
  FALLBACK_NARRATIVE_ORDER,
  resolvePrimaryProvider,
  getFallbackOrderForRole,
  shouldUseDeterministicOnly,
  DEFAULT_FALLBACK_CONFIG,
} from './fallback-policy'
export type { FallbackPolicyConfig } from './fallback-policy'

// --- Deterministic rules ---
export { DETERMINISTIC_RULES, getDeterministicRulesPromptBlock } from './deterministic-rules'

// --- Re-exports for request/response ---
export type { UnifiedAIRequest, OrchestrationMode }
export type { ModelOutput, OrchestrationResult } from '@/lib/unified-ai/types'
