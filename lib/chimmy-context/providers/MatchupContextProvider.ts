/**
 * Phase 2C Batch 3 — MatchupContextProvider
 *
 * Reads the viewer's current-week matchup row from `TeamWeekResult`
 * (canonical) plus the opponent's row, and projects them into the typed
 * `MatchupContextSlice`. Adds optional season / actual-points / playoff /
 * opponent-name fields without breaking existing consumers.
 *
 * Resolution path:
 *   request → resolveLeagueIdentity → leagueId + viewer LeagueTeam.id
 *           → resolveCurrentWeek      → season + week + playoff context
 *           → Roster (leagueId + viewer platformUserId) → viewer rosterId
 *           → TeamWeekResult(viewer)  → opponentRosterId, totalPoints, status
 *           → TeamWeekResult(opponent) → opponent totalPoints + status
 *           → opponent Roster → opponent platformUserId
 *           → opponent LeagueTeam     → opponentTeamId + opponentTeamName
 *
 * Rules:
 *   - DB-first (Prisma only — no external APIs, no projections this batch).
 *   - Never throws; returns `{ data: null }` or a safe partial on any miss.
 *   - Default-off impact: chat route is gated by `CHIMMY_CONTEXT_ENGINE_INJECT`.
 *   - Projections + opponent-strength + urgency are scaffolded but intentionally
 *     not wired into the slice (formulas not yet finalized — see
 *     `lib/chimmy-context/intel/opponentStrength.ts` and `urgency.ts`).
 */

import { prisma } from "@/lib/prisma"
import { resolveLeagueIdentity } from "@/lib/chimmy-context/providers/_helpers/leagueIdentity"
import { resolveCurrentWeekFromRequest } from "@/lib/chimmy-context/providers/_helpers/currentWeek"
import type {
  ChimmyContextProvider,
  ChimmyContextRequest,
  MatchupContextSlice,
  ProviderResult,
} from "@/lib/chimmy-context/types"

type TeamWeekRow = {
  totalPoints: number | null
  opponentRosterId: string | null
  status: string | null
}

function mapStatus(raw: string | null | undefined): MatchupContextSlice["status"] {
  if (raw === "final" || raw === "in_progress" || raw === "scheduled") return raw
  return "unknown"
}

function roundPoints(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null
  return Math.round(Number(n) * 100) / 100
}

export class MatchupContextProvider
  implements ChimmyContextProvider<MatchupContextSlice>
{
  readonly name = "matchup"
  readonly defaultTtlMs = 30 * 1000

  async load(
    request: ChimmyContextRequest
  ): Promise<ProviderResult<MatchupContextSlice>> {
    const startedAt = Date.now()
    const fetchedAt = new Date().toISOString()

    try {
      const identity = await resolveLeagueIdentity(request)
      if (!identity) {
        return {
          ok: true,
          data: null,
          fetchedAt,
          durationMs: Date.now() - startedAt,
        }
      }

      const week = await resolveCurrentWeekFromRequest(request, identity.leagueId)

      if (!identity.platformUserId) {
        return {
          ok: true,
          data: {
            leagueId: identity.leagueId,
            week: week.week,
            yourTeamId: identity.teamId,
            opponentTeamId: null,
            yourProjectedPoints: null,
            opponentProjectedPoints: null,
            status: "unknown",
            season: week.season,
            yourActualPoints: null,
            opponentActualPoints: null,
            opponentTeamName: null,
            playoffStartWeek: week.playoffStartWeek,
            isPlayoffWeek: week.isPlayoffWeek,
            weeksUntilPlayoffs: week.weeksUntilPlayoffs,
            currentWeekSource: week.source,
          },
          fetchedAt,
          durationMs: Date.now() - startedAt,
        }
      }

      const viewerRoster = await prisma.roster
        .findUnique({
          where: {
            leagueId_platformUserId: {
              leagueId: identity.leagueId,
              platformUserId: identity.platformUserId,
            },
          },
          select: { id: true },
        })
        .catch(() => null)

      if (!viewerRoster) {
        return {
          ok: true,
          data: {
            leagueId: identity.leagueId,
            week: week.week,
            yourTeamId: identity.teamId,
            opponentTeamId: null,
            yourProjectedPoints: null,
            opponentProjectedPoints: null,
            status: "unknown",
            season: week.season,
            yourActualPoints: null,
            opponentActualPoints: null,
            opponentTeamName: null,
            playoffStartWeek: week.playoffStartWeek,
            isPlayoffWeek: week.isPlayoffWeek,
            weeksUntilPlayoffs: week.weeksUntilPlayoffs,
            currentWeekSource: week.source,
          },
          fetchedAt,
          durationMs: Date.now() - startedAt,
        }
      }

      const viewerRow: TeamWeekRow | null = await prisma.teamWeekResult
        .findUnique({
          where: {
            leagueId_season_week_rosterId: {
              leagueId: identity.leagueId,
              season: week.season,
              week: week.week,
              rosterId: viewerRoster.id,
            },
          },
          select: {
            totalPoints: true,
            opponentRosterId: true,
            status: true,
          },
        })
        .catch(() => null)

      const opponentRosterId = viewerRow?.opponentRosterId ?? null

      if (!opponentRosterId) {
        return {
          ok: true,
          data: {
            leagueId: identity.leagueId,
            week: week.week,
            yourTeamId: identity.teamId,
            opponentTeamId: null,
            yourProjectedPoints: null,
            opponentProjectedPoints: null,
            status: mapStatus(viewerRow?.status ?? null),
            season: week.season,
            yourActualPoints: roundPoints(viewerRow?.totalPoints ?? null),
            opponentActualPoints: null,
            opponentTeamName: null,
            playoffStartWeek: week.playoffStartWeek,
            isPlayoffWeek: week.isPlayoffWeek,
            weeksUntilPlayoffs: week.weeksUntilPlayoffs,
            currentWeekSource: week.source,
          },
          fetchedAt,
          durationMs: Date.now() - startedAt,
        }
      }

      const [opponentRow, opponentRoster] = await Promise.all([
        prisma.teamWeekResult
          .findUnique({
            where: {
              leagueId_season_week_rosterId: {
                leagueId: identity.leagueId,
                season: week.season,
                week: week.week,
                rosterId: opponentRosterId,
              },
            },
            select: { totalPoints: true, status: true },
          })
          .catch(() => null),
        prisma.roster
          .findUnique({
            where: { id: opponentRosterId },
            select: { platformUserId: true },
          })
          .catch(() => null),
      ])

      let opponentTeamId: string | null = null
      let opponentTeamName: string | null = null
      if (opponentRoster?.platformUserId) {
        const oppTeam = await prisma.leagueTeam
          .findFirst({
            where: {
              leagueId: identity.leagueId,
              platformUserId: opponentRoster.platformUserId,
            },
            select: { id: true, teamName: true },
          })
          .catch(() => null)
        opponentTeamId = oppTeam?.id ?? null
        opponentTeamName = oppTeam?.teamName ?? null
      }

      return {
        ok: true,
        data: {
          leagueId: identity.leagueId,
          week: week.week,
          yourTeamId: identity.teamId,
          opponentTeamId,
          yourProjectedPoints: null,
          opponentProjectedPoints: null,
          status: mapStatus(viewerRow?.status ?? opponentRow?.status ?? null),
          season: week.season,
          yourActualPoints: roundPoints(viewerRow?.totalPoints ?? null),
          opponentActualPoints: roundPoints(opponentRow?.totalPoints ?? null),
          opponentTeamName,
          playoffStartWeek: week.playoffStartWeek,
          isPlayoffWeek: week.isPlayoffWeek,
          weeksUntilPlayoffs: week.weeksUntilPlayoffs,
          currentWeekSource: week.source,
        },
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    } catch {
      return {
        ok: false,
        data: null,
        error: "Matchup query failed",
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    }
  }
}
