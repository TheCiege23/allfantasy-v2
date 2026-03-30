import { getDraftFeatureCatalog, getDraftFeaturePolicy } from './feature-catalog'
import type {
  DraftAutomationFeature,
  DraftExecutionLane,
  DraftExecutionMetadata,
  DraftExecutionMode,
} from './types'

function resolveBaseModeForLane(lane: DraftExecutionLane): DraftExecutionMode {
  if (lane === 'deterministic_required') return 'instant_automated'
  if (lane === 'rules_engine') return 'rules_engine'
  if (lane === 'scheduled_cached') return 'scheduled_cached'
  return 'instant_automated'
}

export function buildDraftExecutionMetadata(input: {
  feature: DraftAutomationFeature
  aiUsed: boolean
  aiEligible?: boolean
  reasonCode: string
  fallbackToDeterministic?: boolean
}): DraftExecutionMetadata {
  const policy = getDraftFeaturePolicy(input.feature)
  let mode = resolveBaseModeForLane(policy.lane)
  if (input.aiUsed) mode = 'ai_explained'
  if (input.fallbackToDeterministic) mode = 'deterministic_fallback'
  return {
    feature: input.feature,
    lane: policy.lane,
    mode,
    aiUsed: Boolean(input.aiUsed),
    aiEligible: Boolean(input.aiEligible ?? policy.aiOptional),
    reasonCode: input.reasonCode,
  }
}

export function getDraftAutomationMatrix() {
  return getDraftFeatureCatalog().map((feature) => ({
    feature: feature.feature,
    lane: feature.lane,
    aiOptional: feature.aiOptional,
    description: feature.description,
  }))
}
