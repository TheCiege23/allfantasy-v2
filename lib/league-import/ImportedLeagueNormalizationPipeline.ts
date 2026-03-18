/**
 * Provider-aware pipeline: fetch provider payload, then normalize to AF canonical shape.
 * String input remains backward compatible for legacy Sleeper-only call sites.
 */

import { fetchSleeperLeagueForImport } from './sleeper/SleeperLeagueFetchService'
import {
  fetchYahooLeagueForImport,
  YahooImportConnectionError,
  YahooImportLeagueNotFoundError,
} from './yahoo/YahooLeagueFetchService'
import { runImportNormalizationPipeline } from './ImportNormalizationPipeline'
import type { ImportProvider, NormalizedImportResult } from './types'

export interface ImportedLeagueNormalizationInput {
  provider: ImportProvider
  sourceId: string
  userId?: string
}

export interface ImportedLeagueNormalizationResult {
  success: true
  normalized: NormalizedImportResult
}

export interface ImportedLeagueNormalizationError {
  success: false
  error: string
  code: 'LEAGUE_NOT_FOUND' | 'NORMALIZATION_FAILED' | 'CONNECTION_REQUIRED' | 'UNAUTHORIZED'
}

/**
 * Fetch provider payload by source ID and normalize to NormalizedImportResult.
 */
export async function runImportedLeagueNormalizationPipeline(
  input: string | ImportedLeagueNormalizationInput
): Promise<ImportedLeagueNormalizationResult | ImportedLeagueNormalizationError> {
  const provider = typeof input === 'string' ? 'sleeper' : input.provider
  const sourceId = typeof input === 'string' ? input : input.sourceId

  try {
    let payload: unknown

    if (provider === 'sleeper') {
      payload = await fetchSleeperLeagueForImport(sourceId)
      if (!(payload as any)?.league?.league_id) {
        return {
          success: false,
          error: 'League not found. Please check your League ID.',
          code: 'LEAGUE_NOT_FOUND',
        }
      }
    } else if (provider === 'yahoo') {
      if (typeof input === 'string' || !input.userId) {
        return {
          success: false,
          error: 'Sign in and connect Yahoo before importing from Yahoo.',
          code: 'UNAUTHORIZED',
        }
      }
      payload = await fetchYahooLeagueForImport(input.userId, sourceId)
    } else {
      return {
        success: false,
        error: `Import from ${provider} is not yet available.`,
        code: 'NORMALIZATION_FAILED',
      }
    }

    const normalized = await runImportNormalizationPipeline({
      provider,
      raw: payload,
    })
    return { success: true, normalized }
  } catch (e) {
    if (e instanceof YahooImportConnectionError) {
      return { success: false, error: e.message, code: 'CONNECTION_REQUIRED' }
    }
    if (e instanceof YahooImportLeagueNotFoundError) {
      return { success: false, error: e.message, code: 'LEAGUE_NOT_FOUND' }
    }
    const message = e instanceof Error ? e.message : 'Import normalization failed'
    return { success: false, error: message, code: 'NORMALIZATION_FAILED' }
  }
}
