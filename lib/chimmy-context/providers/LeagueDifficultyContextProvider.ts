/**
 * Phase 2C — LeagueDifficultyContextProvider
 *
 * Reads the active league row, normalises into `LeagueDifficultyInput`, and
 * runs `computeLeagueDifficulty`. Falls back to `{ rating: null }` whenever
 * a league cannot be resolved, keeping the engine bundle safe.
 *
 * Rules:
 *   - DB-first (Prisma only — no external APIs).
 *   - Never throws.
 *   - Default-off impact: Chimmy chat route remains gated by
 *     `CHIMMY_CONTEXT_ENGINE_INJECT`, so no production behaviour change.
 */

import { prisma } from "@/lib/prisma"
import { computeLeagueDifficulty } from "@/lib/ranking/league-difficulty"
import type {
  ChimmyContextProvider,
  ChimmyContextRequest,
  LeagueDifficultyContextSlice,
  ProviderResult,
} from "@/lib/chimmy-context/types"

function loadLeague(leagueId: string) {
  return prisma.league
    .findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        sport: true,
        leagueType: true,
        scoring: true,
        leagueSize: true,
        rosterSize: true,
        isDynasty: true,
        keeperCount: true,
        bestBallMode: true,
        guillotineMode: true,
        survivorMode: true,
        taxiSlots: true,
        irSlots: true,
        waiverType: true,
      },
    })
    .catch(() => null)
}

async function findActiveLeagueRow(request: ChimmyContextRequest) {
  if (request.leagueId) {
    return loadLeague(request.leagueId)
  }
  const appUser = await prisma.appUser
    .findUnique({
      where: { id: request.userId },
      select: { activeLeagueId: true },
    })
    .catch(() => null)
  if (!appUser?.activeLeagueId) return null
  return loadLeague(appUser.activeLeagueId)
}

export class LeagueDifficultyContextProvider
  implements ChimmyContextProvider<LeagueDifficultyContextSlice>
{
  readonly name = "leagueDifficulty"
  readonly defaultTtlMs = 60 * 60 * 1000

  async load(
    request: ChimmyContextRequest
  ): Promise<ProviderResult<LeagueDifficultyContextSlice>> {
    const startedAt = Date.now()
    const fetchedAt = new Date().toISOString()
    try {
      const row = await findActiveLeagueRow(request)
      if (!row) {
        return {
          ok: true,
          data: { rating: null },
          fetchedAt,
          durationMs: Date.now() - startedAt,
        }
      }

      const rating = computeLeagueDifficulty({
        leagueId: row.id,
        sport: row.sport as unknown as string,
        leagueType: row.leagueType,
        scoring: row.scoring,
        teamCount: row.leagueSize,
        starterCount: null,
        benchSlots: row.rosterSize,
        taxiSlots: row.taxiSlots,
        irSlots: row.irSlots,
        isDynasty: row.isDynasty,
        isKeeper: typeof row.keeperCount === "number" && row.keeperCount > 0,
        guillotine: row.guillotineMode ?? false,
        survivor: row.survivorMode ?? false,
        bestBall: row.bestBallMode ?? false,
        waiverType: row.waiverType,
      })

      return {
        ok: true,
        data: {
          rating: {
            leagueId: rating.leagueId,
            base: rating.base,
            modifiers: rating.modifiers,
            effective: rating.effective,
          },
        },
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    } catch (err) {
      return {
        ok: false,
        data: { rating: null },
        error:
          err instanceof Error ? err.message : "Unknown league difficulty error",
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    }
  }
}
