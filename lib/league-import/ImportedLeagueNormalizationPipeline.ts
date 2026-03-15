/**
 * Single pipeline: fetch Sleeper league by ID, then normalize to AF canonical shape.
 * Used by import preview API and by league creation from import.
 */

import { fetchSleeperLeagueForImport } from './sleeper/SleeperLeagueFetchService'
import { runImportNormalizationPipeline } from './ImportNormalizationPipeline'
import type { NormalizedImportResult } from './types'

export interface ImportedLeagueNormalizationResult {
  success: true
  normalized: NormalizedImportResult
}

export interface ImportedLeagueNormalizationError {
  success: false
  error: string
  code: 'LEAGUE_NOT_FOUND' | 'NORMALIZATION_FAILED'
}

/**
 * Fetch Sleeper league by ID and normalize to NormalizedImportResult.
 */
export async function runImportedLeagueNormalizationPipeline(
  sleeperLeagueId: string
): Promise<ImportedLeagueNormalizationResult | ImportedLeagueNormalizationError> {
  const payload = await fetchSleeperLeagueForImport(sleeperLeagueId)
  if (!payload?.league?.league_id) {
    return { success: false, error: 'League not found. Please check your League ID.', code: 'LEAGUE_NOT_FOUND' }
  }
  try {
    const normalized = await runImportNormalizationPipeline({
      provider: 'sleeper',
      raw: payload,
    })
    return { success: true, normalized }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Import normalization failed'
    return { success: false, error: message, code: 'NORMALIZATION_FAILED' }
  }
}
