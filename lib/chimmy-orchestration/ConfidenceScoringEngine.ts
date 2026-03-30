import type { AIContextEnvelope, ModelOutput } from '@/lib/unified-ai/types'
import type { ChimmyConfidenceResult, ChimmyDeterministicLayer } from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function toVerdictBucket(text: string): 'positive' | 'negative' | 'neutral' | 'unknown' {
  const normalized = text.toLowerCase()
  if (/\b(accept|approve|start|buy|add|target|strong)\b/.test(normalized)) return 'positive'
  if (/\b(reject|decline|avoid|bench|sell|drop|pass)\b/.test(normalized)) return 'negative'
  if (/\b(hold|wait|monitor|neutral|mixed|depends)\b/.test(normalized)) return 'neutral'
  return 'unknown'
}

function computeAgreementPct(modelOutputs: ModelOutput[]): number {
  const verdicts = modelOutputs
    .filter((output) => !output.skipped && !output.error && output.raw.trim().length > 0)
    .map((output) => toVerdictBucket(output.raw))
    .filter((bucket) => bucket !== 'unknown')

  if (verdicts.length <= 1) return 75
  const unique = new Set(verdicts)
  if (unique.size === 1) return 92
  if (unique.size === 2) return 68
  return 45
}

function toLabel(score: number): 'low' | 'medium' | 'high' {
  if (score >= 75) return 'high'
  if (score < 50) return 'low'
  return 'medium'
}

export function scoreChimmyConfidence(input: {
  envelope: AIContextEnvelope
  deterministicLayer: ChimmyDeterministicLayer
  modelOutputs: ModelOutput[]
}): ChimmyConfidenceResult {
  const { envelope, deterministicLayer, modelOutputs } = input
  const providerCount = modelOutputs.length
  const okCount = modelOutputs.filter((output) => !output.skipped && !output.error && output.raw.trim().length > 0).length
  const providerReliabilityPct = providerCount > 0 ? Math.round((okCount / providerCount) * 100) : 0
  const agreementPct = computeAgreementPct(modelOutputs)

  const deterministicBase = Math.round(30 + deterministicLayer.completenessPct * 0.55)
  const weightedScore = Math.round(
    deterministicBase * 0.55 + providerReliabilityPct * 0.25 + agreementPct * 0.2
  )

  const missingPenalty = (envelope.dataQualityMetadata?.missing?.length ?? 0) * 3
  const stalePenalty = envelope.dataQualityMetadata?.stale ? 8 : 0

  let scorePct = clamp(weightedScore - missingPenalty - stalePenalty, 18, 96)

  // Deterministic incompleteness caps confidence to prevent over-confident synthesis.
  if (deterministicLayer.completenessPct < 50) {
    scorePct = Math.min(scorePct, 68)
  } else if (deterministicLayer.completenessPct < 75) {
    scorePct = Math.min(scorePct, 78)
  }

  const label = toLabel(scorePct)
  const reason = [
    `deterministic completeness ${deterministicLayer.completenessPct}%`,
    `provider reliability ${providerReliabilityPct}%`,
    `model agreement ${agreementPct}%`,
  ].join('; ')

  return {
    scorePct,
    label,
    reason,
    agreementPct,
  }
}
