import 'server-only'

import type { NormalizedSportsDataBatch } from '@/lib/sports-data-normalization/types'

/**
 * Merges a compact sports normalization batch into Chimmy / AI payloads so every tool shares the same contract.
 */
export function attachSportsNormalizationToChimmyPayload(
  chimmyPayload: Record<string, unknown>,
  batch: NormalizedSportsDataBatch,
): Record<string, unknown> {
  return {
    ...chimmyPayload,
    sportsDataNormalization: {
      schemaVersion: batch.schemaVersion,
      pipelineId: batch.pipelineId,
      pipelineVersion: batch.pipelineVersion,
      sport: batch.sport,
      fetchedAt: batch.fetchedAt,
      batchDataGaps: batch.batchDataGaps,
      players: batch.players.map((p) => ({
        name: p.player.name,
        position: p.player.position.code,
        team: p.player.team.abbrev,
        projection: p.projection,
        injury: p.injury,
        injuryNewsLayer: p.injuryNewsLayer,
        trendUsage: p.trendUsage,
        dataGaps: p.dataGaps,
        sourcesTried: p.sourcesTried,
      })),
    },
  }
}
