import type { AIContextEnvelope, AIModelRole, ModelOutput, OrchestrationMode, OrchestrationResult } from '@/lib/unified-ai/types'

export type DeterministicSectionKey =
  | 'projections'
  | 'matchupData'
  | 'rosterNeeds'
  | 'adpComparisons'
  | 'rankings'
  | 'scoringOutputs'

export interface ChimmyDeterministicLayer {
  projections: Record<string, unknown> | null
  matchupData: Record<string, unknown> | null
  rosterNeeds: Record<string, unknown> | null
  adpComparisons: Record<string, unknown> | null
  rankings: Record<string, unknown> | null
  scoringOutputs: Record<string, unknown> | null
  missingSections: DeterministicSectionKey[]
  completenessPct: number
}

export interface ChimmyModelTask {
  model: AIModelRole
  purpose: 'analysis' | 'trends' | 'final_synthesis'
  instruction: string
}

export interface ChimmyRoutingPlan {
  models: AIModelRole[]
  tasks: ChimmyModelTask[]
  finalModel: AIModelRole
}

export interface ChimmyConfidenceResult {
  scorePct: number
  label: 'low' | 'medium' | 'high'
  reason: string
  agreementPct: number
}

export interface ChimmyOrchestratorInput {
  envelope: AIContextEnvelope
  mode: OrchestrationMode
  modelOutputs: ModelOutput[]
}

export interface ChimmyAggregationResult {
  primaryAnswer: string
  reason: string
  factGuardWarnings?: string[]
}

export type ChimmyOrchestrationResult = OrchestrationResult
