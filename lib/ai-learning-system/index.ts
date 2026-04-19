import 'server-only'

export { recordAfLearningEvent, type RecordAfLearningEventArgs } from '@/lib/ai-learning-system/recordEvent'
export { recomputeAfLearningSnapshots, type RecomputeAfLearningResult } from '@/lib/ai-learning-system/recomputeSnapshots'
export {
  resolveLearningLayersForPayload,
  type ResolveLearningLayersArgs,
} from '@/lib/ai-learning-system/resolveLearningLayers'
export { resolveLeagueSport } from '@/lib/ai-learning-system/resolveLeagueSport'
export {
  recordTradeOutcomeForBothManagers,
  type TradeOutcomeEventType,
} from '@/lib/ai-learning-system/recordTradeParticipants'
export type {
  AfLearningExplainV1,
  AfLearningSnapshotRow,
  AllFantasyLearningLayersPayload,
  AppLearningFeaturesV1,
  LeagueLearningFeaturesV1,
  UserLearningFeaturesV1,
} from '@/lib/ai-learning-system/types'
