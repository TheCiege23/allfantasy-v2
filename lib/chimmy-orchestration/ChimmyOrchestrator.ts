import type { AIModelRole } from '@/lib/unified-ai/types'
import { buildDeterministicLayer } from './deterministic-layer'
import { routeChimmyModels } from './ModelRouter'
import { scoreChimmyConfidence } from './ConfidenceScoringEngine'
import { aggregateChimmyResponse } from './ResponseAggregator'
import type { ChimmyOrchestratorInput, ChimmyOrchestrationResult, ChimmyRoutingPlan } from './types'

export function resolveChimmyRoutingPlan(input: {
  envelope: ChimmyOrchestratorInput['envelope']
  availableProviders: AIModelRole[]
}): ChimmyRoutingPlan {
  const deterministicLayer = buildDeterministicLayer(input.envelope)
  return routeChimmyModels({
    envelope: input.envelope,
    deterministicLayer,
    availableProviders: input.availableProviders,
  })
}

export function runChimmyOrchestrator(input: ChimmyOrchestratorInput): ChimmyOrchestrationResult {
  const deterministicLayer = buildDeterministicLayer(input.envelope)
  const seenModels = Array.from(new Set(input.modelOutputs.map((output) => output.model)))
  const routingPlan = routeChimmyModels({
    envelope: input.envelope,
    deterministicLayer,
    availableProviders: seenModels.length > 0 ? seenModels : ['deepseek', 'grok', 'openai'],
  })

  const confidence = scoreChimmyConfidence({
    envelope: input.envelope,
    deterministicLayer,
    modelOutputs: input.modelOutputs,
  })

  const aggregated = aggregateChimmyResponse({
    deterministicLayer,
    modelOutputs: input.modelOutputs,
    confidence,
    preferredFinalModel: routingPlan.finalModel,
  })

  return {
    mode: input.mode,
    primaryAnswer: aggregated.primaryAnswer,
    confidencePct: confidence.scorePct,
    confidenceLabel: confidence.label,
    reason: aggregated.reason,
    modelOutputs: input.modelOutputs,
    usedDeterministic: input.envelope.deterministicPayload != null,
    factGuardWarnings: aggregated.factGuardWarnings,
  }
}
