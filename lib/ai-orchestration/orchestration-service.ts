/**
 * Orchestration service — validate → resolve mode → call providers (timeout/retry) → runOrchestration → normalize.
 * Single entry for unified AI backend; deterministic-first, graceful fallback.
 */

import type { AIContextEnvelope, AIModelRole, ModelOutput, OrchestrationMode } from '@/lib/unified-ai/types'
import type { UnifiedAIRequest, UnifiedAIResponse, UnifiedAIError, ProviderChatResult, OrchestrationResult } from './types'
import { validateAIRequest } from './request-validator'
import { getProvider, getAvailableFromRequested, getAvailableProviders } from './provider-registry'
import { enrichEnvelopeWithSportsData } from './sports-context-enricher'
import { resolveEffectiveMode } from './tool-registry'
import { runOrchestration } from '@/lib/unified-ai/AIOrchestrator'
import {
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
import { normalizeOrchestrationToolKey } from './tool-key-normalizer'
import {
  DeterministicContextEnvelopeSchema,
  buildEnvelopeFromTool,
  toProviderInputContract,
  type DeterministicContextEnvelope,
  type ProviderInputContract,
} from '@/lib/ai-context-envelope'

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

function buildMessages(
  envelope: AIContextEnvelope,
  providerInput?: ProviderInputContract
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemParts: string[] = [
    'You are a helpful fantasy sports analyst. Be concise, calm, and explicit about uncertainty.',
    'Deterministic-first: never override hard engine outputs.',
    'Never invent player values, rankings, injuries, roster needs, team context, probabilities, or simulations.',
    'Always respect sport, league format, scoring settings, and roster settings in the provided context.',
  ]
  if (envelope.hardConstraints?.length) {
    systemParts.push('Hard constraints: ' + envelope.hardConstraints.join('; '))
  }
  if (providerInput?.systemPromptSuffix) {
    systemParts.push(providerInput.systemPromptSuffix)
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
  if (providerInput?.envelope?.evidence?.summaryForAI) {
    userParts.push('Deterministic evidence summary:\n' + providerInput.envelope.evidence.summaryForAI)
  }
  if (providerInput?.envelope?.evidence?.items?.length) {
    const evidenceLines = providerInput.envelope.evidence.items
      .slice(0, 10)
      .map((item) => `- ${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ''}`)
      .join('\n')
    userParts.push('Deterministic evidence items (facts only):\n' + evidenceLines)
  }
  if (providerInput?.envelope?.confidence) {
    const confidence = providerInput.envelope.confidence
    userParts.push(
      `Deterministic confidence: ${confidence.scorePct}% (${confidence.label})` +
      (confidence.cappedByData ? ` [capped: ${confidence.capReason ?? 'data limits'}]` : '')
    )
  }
  if (providerInput?.envelope?.uncertainty?.items?.length) {
    const uncertaintyLines = providerInput.envelope.uncertainty.items
      .slice(0, 6)
      .map((item) => `- ${item.what} (${item.impact} impact)${item.reason ? `: ${item.reason}` : ''}`)
      .join('\n')
    userParts.push('Explicit uncertainty (must acknowledge):\n' + uncertaintyLines)
  }
  if (providerInput?.envelope?.missingData?.items?.length) {
    const missingLines = providerInput.envelope.missingData.items
      .slice(0, 8)
      .map((item) => `- ${item.what} (${item.impact} impact)`)
      .join('\n')
    userParts.push('Missing deterministic data (do not infer):\n' + missingLines)
  }
  if (envelope.userMessage) userParts.push('User: ' + envelope.userMessage)
  if (envelope.promptIntent) userParts.push('Intent: ' + envelope.promptIntent)
  const user = userParts.length ? userParts.join('\n\n') : 'Summarize the data above.'
  return [
    { role: 'system', content: systemParts.join('\n') },
    { role: 'user', content: user },
  ]
}

function toConfidenceLabel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 75) return 'high'
  if (score < 50) return 'low'
  return 'medium'
}

function buildDeterministicFallbackText(envelope: AIContextEnvelope): string {
  const payload = envelope.deterministicPayload
  if (!payload || typeof payload !== 'object') {
    return 'AI providers are temporarily unavailable and deterministic context is missing. Retry shortly.'
  }
  const keyValues = Object.entries(payload)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value)}`)
  const summary = keyValues.length > 0
    ? keyValues.join('; ')
    : JSON.stringify(payload).slice(0, 450)
  const missing = envelope.dataQualityMetadata?.missing?.length
    ? ` Missing data: ${envelope.dataQualityMetadata?.missing?.slice(0, 4).join(', ')}.`
    : ''
  return `Deterministic guidance from ${envelope.sport} context: ${summary}.${missing} AI explanation is temporarily unavailable.`
}

function buildDeterministicFallbackResult(params: {
  envelope: AIContextEnvelope
  mode: OrchestrationMode
  modelOutputs: ModelOutput[]
  reason: string
}): OrchestrationResult {
  const { envelope, mode, modelOutputs, reason } = params
  const baseConfidence =
    typeof envelope.confidenceMetadata?.score === 'number'
      ? envelope.confidenceMetadata.score
      : envelope.deterministicPayload
        ? 58
        : 34
  const missingPenalty = (envelope.dataQualityMetadata?.missing?.length ?? 0) * 5
  const stalePenalty = envelope.dataQualityMetadata?.stale ? 8 : 0
  const confidencePct = Math.max(20, Math.min(85, baseConfidence - missingPenalty - stalePenalty))
  const factGuardWarnings = envelope.dataQualityMetadata?.missing?.length
    ? [`Data unavailable: ${envelope.dataQualityMetadata.missing.slice(0, 5).join(', ')}`]
    : undefined

  return {
    mode,
    primaryAnswer: buildDeterministicFallbackText(envelope),
    confidencePct,
    confidenceLabel: toConfidenceLabel(confidencePct),
    reason,
    modelOutputs,
    usedDeterministic: Boolean(envelope.deterministicPayload),
    factGuardWarnings,
  }
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
  switch (normalizeOrchestrationToolKey(featureType)) {
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

function resolveDeterministicContextEnvelope(
  envelope: AIContextEnvelope
): DeterministicContextEnvelope | null {
  if (envelope.deterministicContextEnvelope) {
    const parsed = DeterministicContextEnvelopeSchema.safeParse(envelope.deterministicContextEnvelope)
    if (parsed.success) return parsed.data
  }
  if (!envelope.deterministicPayload) return null

  const confidence = envelope.confidenceMetadata?.score != null
    ? {
        scorePct: Math.max(0, Math.min(100, envelope.confidenceMetadata.score)),
        label: toConfidenceLabel(
          envelope.confidenceMetadata.label === 'high' ||
          envelope.confidenceMetadata.label === 'medium' ||
          envelope.confidenceMetadata.label === 'low'
            ? envelope.confidenceMetadata.label === 'high' ? 80
              : envelope.confidenceMetadata.label === 'medium' ? 60
              : 40
            : envelope.confidenceMetadata.score
        ),
        reason: envelope.confidenceMetadata.reason,
        cappedByData: Boolean(envelope.dataQualityMetadata?.missing?.length),
        capReason: envelope.dataQualityMetadata?.missing?.length
          ? `Missing: ${envelope.dataQualityMetadata.missing.slice(0, 4).join(', ')}`
          : undefined,
      }
    : undefined
  const missingData = envelope.dataQualityMetadata?.missing?.length
    ? {
        items: envelope.dataQualityMetadata.missing.slice(0, 8).map((item) => ({
          what: item,
          impact: 'medium' as const,
          suggestedAction: `Provide deterministic metric "${item}" for full confidence.`,
        })),
        summaryForAI: envelope.dataQualityMetadata.missing.join(', '),
      }
    : undefined
  const uncertainty = envelope.dataQualityMetadata?.missing?.length
    ? {
        items: envelope.dataQualityMetadata.missing.slice(0, 6).map((item) => ({
          what: item,
          impact: 'medium' as const,
          reason: 'Deterministic field missing.',
        })),
        summaryForAI: envelope.dataQualityMetadata.missing.join(', '),
      }
    : undefined

  const built = buildEnvelopeFromTool(
    normalizeOrchestrationToolKey(envelope.featureType),
    envelope.sport,
    {
      leagueId: envelope.leagueId ?? null,
      userId: envelope.userId ?? null,
      deterministicPayload: envelope.deterministicPayload ?? null,
      confidence,
      missingData,
      uncertainty,
      hardConstraints: envelope.hardConstraints,
      envelopeId: `auto-${Date.now().toString(36)}`,
      dataQualitySummary: envelope.dataQualityMetadata?.missing?.length
        ? `Missing deterministic fields: ${envelope.dataQualityMetadata.missing.join(', ')}`
        : undefined,
    }
  )
  const parsed = DeterministicContextEnvelopeSchema.safeParse(built)
  return parsed.success ? parsed.data : null
}

async function runProviderCallWithTimeout(
  role: AIModelRole,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  timeoutMs: number
): Promise<ProviderChatResult> {
  const provider = getProvider(role)
  return new Promise<ProviderChatResult>((resolve) => {
    let finished = false
    const timeout = setTimeout(() => {
      if (finished) return
      finished = true
      resolve({
        text: '',
        model: '',
        provider: role,
        status: 'timeout',
        timedOut: true,
        error: `Provider timeout after ${timeoutMs}ms`,
      })
    }, timeoutMs)

    provider
      .chat({
        messages,
        timeoutMs,
        maxTokens: 1000,
        temperature: 0.5,
      })
      .then((result) => {
        if (finished) return
        finished = true
        clearTimeout(timeout)
        resolve(result)
      })
      .catch((error) => {
        if (finished) return
        finished = true
        clearTimeout(timeout)
        const message = error instanceof Error ? error.message : String(error)
        resolve({
          text: '',
          model: '',
          provider: role,
          status: 'failed',
          error: message.slice(0, 240),
        })
      })
  })
}

async function callProviderWithRetry(
  role: AIModelRole,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  timeoutMs: number,
  maxRetries: number
): Promise<{ result: ProviderChatResult; meta: ProviderResultMeta }> {
  const startMs = Date.now()
  let lastResult: ProviderChatResult | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await runProviderCallWithTimeout(role, messages, timeoutMs)
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
  let deterministicEnvelope = resolveDeterministicContextEnvelope(envelope)
  if (registration?.deterministicRequired && !deterministicEnvelope) {
    const error = toUnifiedAIError('envelope_validation_failed', {
      message: `Tool "${registration.toolName}" requires a deterministic context envelope.`,
      traceId,
    })
    return { ok: false, error, status: toHttpStatus(error.code) }
  }
  if (registration?.deterministicRequired) {
    const missingRequiredFields = registration.requiredContextFields.filter(
      (field) => envelope.deterministicPayload?.[field] == null
    )
    if (missingRequiredFields.length > 0) {
      const existingMissing = deterministicEnvelope?.missingData?.items ?? []
      const missingDataItems = [
        ...existingMissing,
        ...missingRequiredFields.map((field) => ({
          what: field,
          impact: 'high' as const,
          suggestedAction: `Provide deterministic value for "${field}" before trusting high-confidence recommendations.`,
        })),
      ]
      const uncertaintyItems = [
        ...(deterministicEnvelope?.uncertainty?.items ?? []),
        ...missingRequiredFields.map((field) => ({
          what: field,
          impact: 'high' as const,
          reason: 'Required deterministic metric is missing.',
        })),
      ]
      deterministicEnvelope = deterministicEnvelope
        ? {
            ...deterministicEnvelope,
            missingData: {
              items: missingDataItems,
              summaryForAI: `Missing required deterministic fields: ${missingRequiredFields.join(', ')}`,
            },
            uncertainty: {
              items: uncertaintyItems,
              summaryForAI: `Uncertain due to missing required deterministic fields: ${missingRequiredFields.join(', ')}`,
            },
            confidence: deterministicEnvelope.confidence
              ? {
                  ...deterministicEnvelope.confidence,
                  cappedByData: true,
                  capReason: deterministicEnvelope.confidence.capReason
                    ? `${deterministicEnvelope.confidence.capReason}; missing required fields: ${missingRequiredFields.join(', ')}`
                    : `Missing required fields: ${missingRequiredFields.join(', ')}`,
                }
              : deterministicEnvelope.confidence,
          }
        : buildEnvelopeFromTool(
            normalizeOrchestrationToolKey(envelope.featureType),
            envelope.sport,
            {
              leagueId: envelope.leagueId ?? null,
              userId: envelope.userId ?? null,
              deterministicPayload: envelope.deterministicPayload ?? null,
              missingData: {
                items: missingDataItems,
                summaryForAI: `Missing required deterministic fields: ${missingRequiredFields.join(', ')}`,
              },
              uncertainty: {
                items: uncertaintyItems,
                summaryForAI: `Uncertain due to missing required deterministic fields: ${missingRequiredFields.join(', ')}`,
              },
              hardConstraints: envelope.hardConstraints,
              dataQualitySummary: `Missing required deterministic fields: ${missingRequiredFields.join(', ')}`,
            }
          )
      envelope = {
        ...envelope,
        dataQualityMetadata: {
          ...(envelope.dataQualityMetadata ?? {}),
          missing: Array.from(new Set([...(envelope.dataQualityMetadata?.missing ?? []), ...missingRequiredFields])),
        },
      }
    }
  }
  envelope = {
    ...envelope,
    deterministicContextEnvelope: deterministicEnvelope ?? envelope.deterministicContextEnvelope ?? null,
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

  const requestedAvailable = getAvailableFromRequested(modelsToCall)
  const allAvailable = getAvailableProviders()
  let available = requestedAvailable
  let fallbackSelectionReason: string | undefined
  if (available.length === 0 && allAvailable.length > 0) {
    available = effectiveMode === 'single_model' ? [allAvailable[0]] : allAvailable
    fallbackSelectionReason =
      'Requested provider(s) are unavailable; switched to configured fallback provider(s).'
  }

  if (available.length === 0) {
    const providerResults: ProviderResultMeta[] = modelsToCall.map((provider) => ({
      provider,
      status: 'failed',
      error: 'Provider not configured or unavailable.',
    }))
    const modelOutputs: ModelOutput[] = modelsToCall.map((provider) => ({
      model: provider,
      raw: '',
      error: 'Provider unavailable',
      skipped: true,
    }))

    if (envelope.deterministicPayload) {
      const fallbackResult = buildDeterministicFallbackResult({
        envelope,
        mode: effectiveMode,
        modelOutputs,
        reason: 'Deterministic fallback (all providers unavailable before execution).',
      })
      const response = normalizeToUnifiedResponse({
        result: fallbackResult,
        providerResults,
        envelope,
        traceId,
        cached: false,
      })
      return { ok: true, response }
    }

    const error = toUnifiedAIError('provider_unavailable', {
      message: 'No AI providers are configured or available.',
      traceId,
      details: {
        requestedProviders: modelsToCall,
      },
    })
    return { ok: false, error, status: toHttpStatus(error.code) }
  }

  const providerInput = deterministicEnvelope
    ? toProviderInputContract({
        envelope: deterministicEnvelope,
        userMessage: envelope.userMessage,
        intent: envelope.promptIntent,
      })
    : undefined
  const messages = buildMessages(envelope, providerInput)

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
  const allProvidersFailed = providerResults.length > 0 && providerResults.every((provider) => provider.status !== 'ok')

  try {
    if (allProvidersFailed) {
      if (envelope.deterministicPayload) {
        const fallbackResult = buildDeterministicFallbackResult({
          envelope,
          mode: effectiveMode,
          modelOutputs,
          reason: 'Deterministic fallback (all provider calls failed).',
        })
        const response = normalizeToUnifiedResponse({
          result: fallbackResult,
          providerResults,
          envelope,
          traceId,
          cached: false,
        })
        return { ok: true, response }
      }

      const error = toUnifiedAIError('provider_unavailable', {
        message: 'All provider calls failed and deterministic context is unavailable.',
        traceId,
        details: {
          providerStatus: providerResults.map((provider) => ({
            provider: provider.provider,
            status: provider.status,
          })),
        },
      })
      return { ok: false, error, status: toHttpStatus(error.code) }
    }

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
    if (fallbackSelectionReason) {
      response.reliability.message = response.reliability.message
        ? `${response.reliability.message} ${fallbackSelectionReason}`
        : fallbackSelectionReason
    }

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
