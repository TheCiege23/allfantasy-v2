import type { NormalizedImportResult } from './types'
import { bootstrapLeagueFromNormalizedImport } from './sleeper/SleeperLeagueCreationBootstrapService'

export async function bootstrapLeagueFromImport(
  leagueId: string,
  normalized: NormalizedImportResult
) {
  return bootstrapLeagueFromNormalizedImport(leagueId, normalized)
}
