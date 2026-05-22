/**
 * Phase 2A — RosterContextProvider (interface-only stub)
 *
 * Real implementation lands in Phase 2B and will reuse the IDP-friendly
 * roster fetcher pattern from `lib/idp/ai/idpChimmy.ts` generalized to all
 * sports. The bundle field is reserved so consumers compile today.
 */

import type {
  ChimmyContextProvider,
  ChimmyContextRequest,
  ProviderResult,
  RosterContextSlice,
} from "@/lib/chimmy-context/types"

export class RosterContextProvider
  implements ChimmyContextProvider<RosterContextSlice>
{
  readonly name = "roster"
  readonly defaultTtlMs = 30 * 1000

  async load(
    request: ChimmyContextRequest
  ): Promise<ProviderResult<RosterContextSlice>> {
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
