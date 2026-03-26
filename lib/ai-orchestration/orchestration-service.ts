/**
 * Orchestration service — validate → resolve mode → call providers (timeout/retry) → runOrchestration → normalize.
 * Single entry for unified AI backend; deterministic-first, graceful fallback.
 */

import type { AIContextEnvelope, AIModelRole, ModelOutput, OrchestrationMode } from '@/lib/unified-ai/types'
import type { UnifiedAIRequest, UnifiedAIResponse, UnifiedAIError, ProviderChatResult } from './types'
import { validateAIRequest } from './request-validator'
import { getProvider, getAvailableFromRequested } from './provider-registry'
import { enrichEnvelopeWithSportsData } from './sports-context-enricher'
import { resolveEffectiveMode } from './tool-registry'
import { runOrchestration } from '@/lib/unified-ai/AIOrchestrator'
import {
  resolveOrchestrationMode,
  resolveSingleModel,
  resolveSpecialistPair,
  resolveModelsForConsensus,
} from '@/lib/unified-ai/ModelRoutingResolver'
import { normalizeToUnifiedResponse } from './response-normalizer'
import { toUnifiedAIError, toHttpStatus, fromThrown } from './error-handler'
import { generateTraceId, logOrchestrationResult } from './tracing'
import type { ProviderResultMeta } from '@/lib/ai-reliability/types'
import { recordProviderFailure, recordProviderFallback, recordProviderLatency } from '@/lib/provider-diagnostics'
import type { ProviderId } from '@/lib/provider-diagnostics'
import { getToolRegistration } from '@/lib/ai-tool-registry'
import type { DeterministicSource } from '@/lib/unified-ai/DeterministicToAIContextBridge'

function getDefaultTimeoutMs(): number {
  const v = process.env.AI_ORCHESTRATION_TIMEOUT_MS
  if (v == null || v === '') return 25_000
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : 25_000
}

function getDefaultMaxRetries(): number {
  const v = process.env.AI_ORCHESTRATION_RETRY_COUNT
  if (v == null || v === '') return 1
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? n : 1
}

function buildMessages(envelope: AIContextEnvelope): Array<{ role: 'system' | 'user'; content: string }> {
  const systemParts: string[] = [
    'You are a helpful fantasy sports analyst. Be concise, calm, and explicit about uncertainty.',
    'Deterministic-first: never override hard engine outputs.',
    'Never invent player values, rankings, injuries, roster needs, team context, probabilities, or simulations.',
    'Always respect sport, league format, scoring settings, and roster settings in the provided context.',
  ]
  if (envelope.hardConstraints?.length) {
    systemParts.push('Hard constraints: ' + envelope.hardConstraints.join('; '))
  }
  systemParts.push(`Sport context: ${envelope.sport}.`)
  if (envelope.leagueId) {
    systemParts.push(`League context id: ${envelope.leagueId}.`)
  }
  const userParts: string[] = []
  if (envelope.deterministicPayload && typeof envelope.deterministicPayload === 'object') {
    userParts.push('Data context:\n' + JSON.stringify(envelope.deterministicPayload).slice(0, 4000))
  }
  if (envelope.statisticsPayload && typeof envelope.statisticsPayload === 'object') {
    const stats = envelope.statisticsPayload
    if (stats.sportsData && typeof stats.sportsData === 'object') {
      userParts.push('Sports context (teams/games — use only this, do not invent):\n' + JSON.stringify(stats.sportsData).slice(0, 2000))
    }
    if (stats.sportsDataSource) userParts.push(`(Source: ${stats.sportsDataSource})`)
  }
  if (envelope.dataQualityMetadata?.missing?.length) {
    userParts.push('Unavailable or missing data: ' + envelope.dataQualityMetadata.missing.join(', ') + '. State when information is unavailable; do not invent.')
  }
  if (envelope.userMessage) userParts.push('User: ' + envelope.userMessage)
  if (envelope.promptIntent) userParts.push('Intent: ' + envelope.promptIntent)
  const user = userParts.length ? userParts.join('\n\n') : 'Summarize the data above.'
  return [
    { role: 'system', content: systemParts.join('\n') },
    { role: 'user', content: user },
  ]
}

function toModelOutput(result: ProviderChatResult): ModelOutput {
  return {
    model: result.provider,
    raw: result.text,
    error: result.error,
    skipped: result.status !== 'ok',
  }
}

function toProviderResultMeta(role: AIModelRole, result: ProviderChatResult, startMs: number): ProviderResultMeta {
  const status =
    result.status === 'ok'
      ? 'ok'
      : result.timedOut
        ? 'timeout'
        : result.status === 'invalid_response'
          ? 'invalid_response'
          : 'failed'
  return {
    provider: role,
    status,
    error: result.error,
    latencyMs: Date.now() - startMs,
  }
}

function resolveDeterministicSource(featureType: string): DeterministicSource | undefined {
  switch ((featureType ?? '').toLowerCase()) {
    case 'trade_analyzer':
    case 'trade_evaluator':
      return 'trade_engine'
    case 'waiver_ai':
      return 'waiver_engine'
    case 'rankings':
      return 'rankings_engine'
    case 'draft_helper':
      return 'draft_board'
    case 'matchup':
    case 'simulation':
      return 'simulation'
    case 'psychological':
    case 'psychological_profiles':
      return 'psychological'
    case 'legacy_score':
    case 'reputation':
      return 'legacy_score'
    case 'rivalries':
    case 'graph_insight':
      return 'graph'
    default:
      return undefined
  }
}

async function callProviderWithRetry(
  role: AIModelRole,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  timeoutMs: number,
  maxRetries: number
): Promise<{ result: ProviderChatResult; meta: ProviderResultMeta }> {
  const provider = getProvider(role)
  const startMs = Date.now()
  let lastResult: ProviderChatResult | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await provider.chat({
      messages,
      timeoutMs,
      maxTokens: 1000,
      temperature: 0.5,
    })
    if (lastResult.status === 'ok') break
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
    }
  }
  const result = lastResult!
  const meta = toProviderResultMeta(role, result, startMs)
  return { result, meta }
}

export type RunOrchestrationResult =
  | { ok: true; response: UnifiedAIResponse }
  | { ok: false; error: UnifiedAIError; status: number }

/**
 * Run full orchestration: validate, resolve mode, call available providers, merge, normalize.
 * Returns unified response or structured error. No dead fallback branches; deterministic-only when all providers fail.
 */
export async function runUnifiedOrchestration(req: UnifiedAIRequest): Promise<RunOrchestrationResult> {
  const traceId = req.options?.traceId ?? generateTraceId()
  const startMs = Date.now()

  const validation = validateAIRequest(req)
  if (!validation.valid || !validation.envelope) {
    const error = toUnifiedAIError(validation.errorCode ?? 'envelope_validation_failed', {
      message: validation.errorMessage,
      traceId,
    })
    return { ok: false, error, status: toHttpStatus(error.code) }
  }

  let envelope: AIContextEnvelope = validation.envelope
  try {
    envelope = await enrichEnvelopeWithSportsData(envelope)
  } catch (_e) {
    // Non-blocking: proceed with unenriched envelope
  }

  const registration = getToolRegistration(envelope.featureType)
  if (registration?.deterministicRequired && !envelope.deterministicPayload) {
    const error = toUnifiedAIError('envelope_validation_failed', {
      message: `Tool "${registration.toolName}" requires deterministic context before AI orchestration.`,
      traceId,
    })
    return { ok: false, error, status: toHttpStatus(error.code) }
  }

  const modeOverride = req.mode
  const effectiveMode = resolveEffectiveMode(envelope.featureType, modeOverride) as OrchestrationMode
  const timeoutMs = req.options?.timeoutMs ?? getDefaultTimeoutMs()
  const maxRetries = req.options?.maxRetries ?? getDefaultMaxRetries()

  let modelsToCall: AIModelRole[]
  switch (effectiveMode) {
    case 'single_model':
      modelsToCall = [resolveSingleModel(envelope)]
      break
    case 'specialist': {
      const pair = resolveSpecialistPair(envelope)
      modelsToCall = [pair.analysis, pair.explanation]
      break
    }
    case 'consensus':
    case 'unified_brain':
      modelsToCall = resolveModelsForConsensus(envelope)
      break
    default:
      modelsToCall = resolveModelsForConsensus(envelope)
  }

  const available = getAvailableFromRequested(modelsToCall)
  if (available.length === 0) {
    const error = toUnifiedAIError('provider_unavailable', {
      message: 'No AI providers are configured or available.',
      traceId,
    })
    return { ok: false, error, status: toHttpStatus(error.code) }
  }

  const messages = buildMessages(envelope)

  const results = await Promise.all(
    available.map((role) => callProviderWithRetry(role, messages, timeoutMs, maxRetries))
  )

  for (let i = 0; i < results.length; i++) {
    const role = available[i] as ProviderId
    const { result, meta } = results[i]
    if (typeof meta.latencyMs === 'number') recordProviderLatency(role, meta.latencyMs)
    if (result.status !== 'ok') recordProviderFailure(role, result.error)
  }
  const succeededIdx = results.findIndex((r) => r.result.status === 'ok')
  if (succeededIdx >= 0 && available.length > 1) {
    const usedRole = available[succeededIdx] as ProviderId
    for (let i = 0; i < results.length; i++) {
      if (i !== succeededIdx && results[i].result.status !== 'ok') {
        recordProviderFallback(available[i] as ProviderId, usedRole)
      }
    }
  }

  const modelOutputs: ModelOutput[] = results.map(({ result }) => toModelOutput(result))
  const providerResults: ProviderResultMeta[] = results.map(({ meta }) => meta)

  try {
    const orchestrationResult = runOrchestration({
      envelope,
      modelOutputs,
      mode: effectiveMode,
      deterministicSource: resolveDeterministicSource(envelope.featureType),
    })

    const response = normalizeToUnifiedResponse({
      result: orchestrationResult,
      providerResults,
      envelope,
      traceId,
      cached: false,
    })

    const durationMs = Date.now() - startMs
    await logOrchestrationResult({
      traceId,
      featureType: envelope.featureType,
      mode: effectiveMode,
      primaryAnswer: orchestrationResult.primaryAnswer,
      confidencePct: orchestrationResult.confidencePct,
      usedDeterministic: orchestrationResult.usedDeterministic,
      providerResults: providerResults.map((r) => ({ provider: r.provider, status: r.status })),
      leagueId: envelope.leagueId,
      userId: envelope.userId,
    })

    return { ok: true, response }
  } catch (e) {
    const error = fromThrown(e, traceId)
    return { ok: false, error, status: toHttpStatus(error.code) }
  }
}
