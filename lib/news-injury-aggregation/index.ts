import 'server-only'

export { resolvePlayerInjuryNewsBatch } from '@/lib/news-injury-aggregation/resolveBatch'
export { applyInjuryNewsToNormalizedProjection } from '@/lib/news-injury-aggregation/applyInjuryNewsProjection'
export { mergeInjuryNewsLayer } from '@/lib/news-injury-aggregation/mergeLayer'
export type {
  InjuryNewsBatchPlayerInput,
  InjuryNewsSourceRow,
  NormalizedPlayerInjuryNewsLayer,
} from '@/lib/news-injury-aggregation/types'
