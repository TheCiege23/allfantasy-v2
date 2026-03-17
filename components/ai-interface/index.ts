/**
 * Unified AI Interface — reusable frontend components for AI hub, result cards, and Chimmy shell.
 */

export { default as AILayoutContainer } from './AILayoutContainer'
export type { AILayoutContainerProps } from './AILayoutContainer'

export { default as AIModeSelector } from './AIModeSelector'
export type { AIModeSelectorProps, AIMode } from './AIModeSelector'

export { default as AIProviderSelector } from './AIProviderSelector'
export type { AIProviderSelectorProps } from './AIProviderSelector'

export { default as DeterministicEvidenceCard } from './DeterministicEvidenceCard'
export type { DeterministicEvidenceCardProps } from './DeterministicEvidenceCard'

export { default as AIVerdictCard } from './AIVerdictCard'
export type { AIVerdictCardProps } from './AIVerdictCard'

export { default as ActionPlanCard } from './ActionPlanCard'
export type { ActionPlanCardProps } from './ActionPlanCard'

export { default as ConfidenceDisplay } from './ConfidenceDisplay'
export type { ConfidenceDisplayProps, ConfidenceLabel } from './ConfidenceDisplay'

export { default as AIErrorFallback } from './AIErrorFallback'
export type { AIErrorFallbackProps } from './AIErrorFallback'

export { default as AILoadingSkeleton } from './AILoadingSkeleton'
export type { AILoadingSkeletonProps } from './AILoadingSkeleton'

export { default as CompareProvidersView } from './CompareProvidersView'
export type { CompareProvidersViewProps, ModelOutputItem } from './CompareProvidersView'

export { default as UnifiedBrainResultView } from './UnifiedBrainResultView'
export type { UnifiedBrainResultViewProps } from './UnifiedBrainResultView'

export { default as AIResultCard } from './AIResultCard'
export type { AIResultCardProps } from './AIResultCard'

export { default as StickyAIActions } from './StickyAIActions'
export type { StickyAIActionsProps } from './StickyAIActions'

/** PROMPT 127 — Deterministic evidence layer components (re-exports from ai-evidence). */
export {
  EvidenceCard,
  ConfidenceMeter,
  UncertaintyNotice,
  MissingDataNotice,
  AIEvidencePresentation,
} from '@/components/ai-evidence'
export type {
  EvidenceCardProps,
  ConfidenceMeterProps,
  ConfidenceMeterLabel,
  UncertaintyNoticeProps,
  MissingDataNoticeProps,
  AIEvidencePresentationProps,
} from '@/components/ai-evidence'
