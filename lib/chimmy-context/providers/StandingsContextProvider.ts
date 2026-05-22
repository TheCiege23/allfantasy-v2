/**
 * Phase 2A — StandingsContextProvider (interface-only stub)
 * Real implementation in Phase 2B.
 */

import type {
  ChimmyContextProvider,
  ChimmyContextRequest,
  ProviderResult,
  StandingsContextSlice,
} from "@/lib/chimmy-context/types"

export class StandingsContextProvider
  implements ChimmyContextProvider<StandingsContextSlice>
{
  readonly name = "standings"
  readonly defaultTtlMs = 60 * 1000

  async load(
    request: ChimmyContextRequest
  ): Promise<ProviderResult<StandingsContextSlice>> {
    if (!request.leagueId) {
      return {
        ok: true,
        data: null,
        fetchedAt: new Date().toISOString(),
        durationMs: 0,
      }
    }
    return {
      ok: true,
      data: null,
      fetchedAt: new Date().toISOString(),
      durationMs: 0,
    }
  }
}
