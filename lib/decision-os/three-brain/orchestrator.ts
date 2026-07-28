/**
 * Decision OS three-brain orchestrator (STANDALONE — no route/persistence/token integration in Phase 1).
 *
 * Flow: DeepSeek ∥ Grok (parallel, each only the evidence packet + its role prompt) → validate each →
 * OpenAI synthesis called ONLY after both specialists settle, receiving BOTH validated evaluations →
 * validate → deterministic agreement + confidence stamped by the server. Provider failures degrade honestly;
 * both specialist failures return a deterministic_only result with no synthesis call.
 *
 * The provider boundary (`getProvider`) and telemetry are injectable so tests exercise this real service
 * with mocked providers (no real paid calls) and can capture the exact OpenAI synthesis payload.
 */
import { getProvider as realGetProvider } from '@/lib/ai-orchestration/provider-registry'
import type { AIModelRole } from '@/lib/unified-ai/types'
import type { ProviderChatRequest, ProviderChatResult } from '@/lib/ai-orchestration/types'
import { recordLlmUsage } from '@/lib/telemetry/llm-usage'
import { buildDeepSeekRequest, buildGrokRequest, buildSynthesisRequest } from './prompts'
import { validateSpecialistOutput, validateSynthesisOutput } from './validate'
import { computeAgreementState, computeConfidence } from './confidence'
import { evidenceIdSet } from './evidencePacket'
import {
  THREE_BRAIN_SCHEMA_VERSION,
  type DecisionOSEvidencePacket,
  type SpecialistEvaluation,
  type ThreeBrainDecisionResult,
} from './types'

/** Minimal provider surface this service needs (subset of IProviderClient) — injectable for tests. */
export interface ThreeBrainProviderClient {
  chat(request: ProviderChatRequest): Promise<ProviderChatResult>
  isAvailable(): boolean
}
export type ThreeBrainProviderGetter = (role: AIModelRole) => ThreeBrainProviderClient
export type RecordUsageFn = typeof recordLlmUsage

export type RunThreeBrainOptions = {
  /** defaults to the production provider registry. */
  getProvider?: ThreeBrainProviderGetter
  perProviderTimeoutMs?: number
  /** defaults to the production PII-safe telemetry sink. Injectable so tests avoid the DB. */
  recordUsage?: RecordUsageFn
}

const DEFAULT_TIMEOUT_MS = 25_000

function timeoutResult(role: AIModelRole): ProviderChatResult {
  return { text: '', model: 'unknown', provider: role, status: 'timeout', timedOut: true }
}
function failedResult(role: AIModelRole, error: string): ProviderChatResult {
  return { text: '', model: 'unknown', provider: role, status: 'failed', error: error.slice(0, 200) }
}

/** Race the provider call against a hard per-provider timeout. Never rejects. */
async function callWithTimeout(
  client: ThreeBrainProviderClient,
  request: ProviderChatRequest,
  timeoutMs: number,
  role: AIModelRole,
): Promise<ProviderChatResult> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<ProviderChatResult>((resolve) => {
    timer = setTimeout(() => resolve(timeoutResult(role)), timeoutMs)
  })
  try {
    return await Promise.race([client.chat({ ...request, timeoutMs }), timeout])
  } catch (err) {
    return failedResult(role, err instanceof Error ? err.message : 'provider error')
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function collectEvidenceIds(...evals: SpecialistEvaluation[]): string[] {
  const ids = new Set<string>()
  for (const e of evals) for (const f of e.findings) for (const id of f.evidenceIds) ids.add(id)
  return [...ids]
}

function summarizeFindings(...evals: SpecialistEvaluation[]): string {
  const claims = evals.flatMap((e) => e.findings.map((f) => f.claim)).slice(0, 6)
  return claims.length ? claims.join(' ') : 'No grounded specialist findings were available.'
}

function deterministicOnlyResult(
  packet: DecisionOSEvidencePacket,
  deepseek: SpecialistEvaluation,
  grok: SpecialistEvaluation,
): ThreeBrainDecisionResult {
  return {
    schemaVersion: THREE_BRAIN_SCHEMA_VERSION,
    decisionType: packet.decisionType,
    shortAnswer: 'AI analysis unavailable — relying on the deterministic Decision OS evidence only.',
    whatDataSays: '',
    whatItMeans: '',
    recommendedAction: undefined,
    alternatives: [],
    caveats: ['Both specialist models were unavailable; no three-brain synthesis was performed.'],
    evidenceIds: [],
    agreementState: 'deterministic_only',
    specialistStatus: { deepseek: deepseek.status, grok: grok.status, openai: 'skipped' },
    confidencePct: undefined,
    freshness: packet.freshness,
    missingInformation: packet.missingInformation,
  }
}

export async function runThreeBrainAnalysis(
  packet: DecisionOSEvidencePacket,
  opts: RunThreeBrainOptions = {},
): Promise<ThreeBrainDecisionResult> {
  const getProvider = opts.getProvider ?? (realGetProvider as ThreeBrainProviderGetter)
  const timeoutMs = opts.perProviderTimeoutMs ?? DEFAULT_TIMEOUT_MS
  const recordUsage = opts.recordUsage ?? recordLlmUsage
  const validIds = evidenceIdSet(packet)

  const emit = (role: AIModelRole, res: ProviderChatResult) => {
    // Non-sensitive telemetry only — never prompts, raw responses, or league payloads.
    void Promise.resolve(
      recordUsage({
        endpoint: 'decision_os_three_brain',
        tool: `three_brain_${role}`,
        userId: packet.userId,
        model: res.model,
        usage: { prompt_tokens: res.tokensPrompt, completion_tokens: res.tokensCompletion },
        ok: res.status === 'ok',
      }),
    ).catch(() => {})
  }

  // 1) Specialists in parallel. Each receives ONLY the evidence packet + its role prompt.
  const [dSettled, gSettled] = await Promise.allSettled([
    callWithTimeout(getProvider('deepseek'), buildDeepSeekRequest(packet), timeoutMs, 'deepseek'),
    callWithTimeout(getProvider('grok'), buildGrokRequest(packet), timeoutMs, 'grok'),
  ])
  const dRaw = dSettled.status === 'fulfilled' ? dSettled.value : failedResult('deepseek', 'settle error')
  const gRaw = gSettled.status === 'fulfilled' ? gSettled.value : failedResult('grok', 'settle error')
  emit('deepseek', dRaw)
  emit('grok', gRaw)

  const dVal = validateSpecialistOutput('deepseek', dRaw, validIds)
  const gVal = validateSpecialistOutput('grok', gRaw, validIds)
  const deepseek = dVal.evaluation
  const grok = gVal.evaluation

  // 2) Both specialists failed → deterministic_only. No synthesis call, no false consensus.
  if (deepseek.status === 'failed' && grok.status === 'failed') {
    return deterministicOnlyResult(packet, deepseek, grok)
  }

  // 3) OpenAI synthesis — ONLY after both specialists settled, receiving BOTH evaluations.
  const oRaw = await callWithTimeout(getProvider('openai'), buildSynthesisRequest(packet, deepseek, grok), timeoutMs, 'openai')
  emit('openai', oRaw)
  const synth = validateSynthesisOutput(oRaw, validIds)

  const agreementState = computeAgreementState(deepseek, grok, synth.ok)
  const droppedClaims =
    dVal.droppedUnsupported + dVal.droppedUnknownEvidence +
    gVal.droppedUnsupported + gVal.droppedUnknownEvidence +
    (synth.ok ? synth.droppedUnknownEvidence : 0)
  const confidencePct = computeConfidence({ packet, deepseek, grok, agreementState, droppedClaims })
  const specialistStatus = { deepseek: deepseek.status, grok: grok.status, openai: synth.ok ? 'completed' : 'failed' }

  // 4) OpenAI failed → honest degraded result (specialist findings surface; no fabricated synthesis).
  if (!synth.ok) {
    return {
      schemaVersion: THREE_BRAIN_SCHEMA_VERSION,
      decisionType: packet.decisionType,
      shortAnswer: 'Synthesis unavailable — showing verified evidence and specialist findings only.',
      whatDataSays: summarizeFindings(deepseek, grok),
      whatItMeans: '',
      recommendedAction: undefined,
      alternatives: [],
      caveats: [synth.note, ...deepseek.caveats, ...grok.caveats].filter(Boolean),
      evidenceIds: collectEvidenceIds(deepseek, grok),
      agreementState: 'degraded',
      specialistStatus,
      confidencePct,
      freshness: packet.freshness,
      missingInformation: packet.missingInformation,
    }
  }

  // 5) Server stamps the authoritative fields; the model's validated prose fills the explanation.
  return {
    schemaVersion: THREE_BRAIN_SCHEMA_VERSION,
    decisionType: packet.decisionType,
    shortAnswer: synth.draft.shortAnswer,
    whatDataSays: synth.draft.whatDataSays,
    whatItMeans: synth.draft.whatItMeans,
    recommendedAction: synth.draft.recommendedAction,
    alternatives: synth.draft.alternatives,
    caveats: synth.draft.caveats,
    evidenceIds: synth.draft.evidenceIds.length ? synth.draft.evidenceIds : collectEvidenceIds(deepseek, grok),
    agreementState,
    specialistStatus,
    confidencePct,
    freshness: packet.freshness,
    missingInformation: packet.missingInformation,
  }
}
