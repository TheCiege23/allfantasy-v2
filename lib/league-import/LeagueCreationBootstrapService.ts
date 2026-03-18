import type { NormalizedImportResult } from './types'
import { bootstrapLeagueFromSleeperImport } from './sleeper/SleeperLeagueCreationBootstrapService'

export async function bootstrapLeagueFromImport(
  leagueId: string,
  normalized: NormalizedImportResult
) {
  return bootstrapLeagueFromSleeperImport(leagueId, normalized)
}
