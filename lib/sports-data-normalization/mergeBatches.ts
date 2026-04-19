import {
  PIPELINE_ID,
  SPORTS_DATA_NORMALIZATION_SCHEMA_VERSION,
} from '@/lib/sports-data-normalization/constants'
import type { NormalizedSportsDataBatch } from '@/lib/sports-data-normalization/types'

export function mergeNormalizedSportsBatches(
  batches: NormalizedSportsDataBatch[],
): NormalizedSportsDataBatch | null {
  if (batches.length === 0) return null
  if (batches.length === 1) return batches[0]!
  return {
    schemaVersion: 1,
    pipelineId: PIPELINE_ID,
    pipelineVersion: SPORTS_DATA_NORMALIZATION_SCHEMA_VERSION,
    sport: 'ALL',
    fetchedAt: new Date().toISOString(),
    players: batches.flatMap((b) => b.players),
    batchDataGaps: batches.flatMap((b) => b.batchDataGaps),
  }
}
