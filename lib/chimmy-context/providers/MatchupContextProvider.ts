/**
 * Phase 2A — MatchupContextProvider (interface-only stub)
 *
 * Real implementation lands in Phase 2B once the redraft matchup snapshot
 * surface is finalized. The bundle field is reserved so consumers can wire
 * to it today without churn later.
 */

import type {
  ChimmyContextProvider,
  ChimmyContextRequest,
  MatchupContextSlice,
  ProviderResult,
} from "@/lib/chimmy-context/types"

export class MatchupContextProvider
  implements ChimmyContextProvider<MatchupContextSlice>
{
  readonly name = "matchup"
  readonly defaultTtlMs = 30 * 1000

  async load(
    request: ChimmyContextRequest
  ): Promise<ProviderResult<MatchupContextSlice>> {
    const leagueId = request.leagueId
    if (!leagueId) {
      return {
        ok: true,
        data: null,
        fetchedAt: new Date().toISOString(),
        durationMs: 0,
      }
    }
    // Stub — Phase 2B will read from the redraft matchup snapshot table.
    return {
      ok: true,
      data: null,
      fetchedAt: new Date().toISOString(),
      durationMs: 0,
    }
  }
}
