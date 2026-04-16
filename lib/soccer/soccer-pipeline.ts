/**
 * Soccer creation pipeline — MLS vs European competition data feeds.
 * Persisted on `League.settings.soccer_pipeline` (and optional top-level create payload).
 */

import type { ApiChainSport } from '@/lib/workers/api-config'

export type SoccerPipeline = 'mls' | 'euro'

export function soccerPipelineToApiChainSport(pipeline: SoccerPipeline): ApiChainSport {
  return pipeline === 'mls' ? 'soccer_mls' : 'soccer_euro'
}

export function isSoccerPipeline(value: unknown): value is SoccerPipeline {
  return value === 'mls' || value === 'euro'
}

/** Read pipeline from league settings JSON; defaults to Euro for legacy leagues. */
export function getSoccerPipelineFromLeagueSettings(settings: unknown): SoccerPipeline {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return 'euro'
  const s = settings as Record<string, unknown>
  const raw = s.soccer_pipeline ?? s.soccerPipeline
  return isSoccerPipeline(raw) ? raw : 'euro'
}
