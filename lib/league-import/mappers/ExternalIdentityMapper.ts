/**
 * Resolves source provider IDs to AF canonical IDs or stable keys.
 * Used when persisting imported data to link to existing PlayerIdentityMap / LeagueTeam / Roster.
 */

import type { ImportProvider } from '../types'
import type { ExternalIdentityMapping } from '../types'
import type { NormalizedImportResult } from '../types'

export interface IExternalIdentityMapper {
  /** Resolve a single source id to AF id or stable key (optional; can be async from DB). */
  resolve?(mapping: Omit<ExternalIdentityMapping, 'af_id' | 'stable_key'>): Promise<string | null>
  /** Build identity mappings from normalized result for persistence. */
  buildMappings?(
    provider: ImportProvider,
    normalized: Pick<NormalizedImportResult, 'source' | 'rosters' | 'player_map'>
  ): ExternalIdentityMapping[]
}
