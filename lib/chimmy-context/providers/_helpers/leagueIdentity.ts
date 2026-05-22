/**
 * Phase 2C — Shared league identity resolver for chimmy-context providers.
 *
 * Resolves the viewer's `LeagueTeam` row (if any) inside the active league
 * using the same OR-clause pattern the live-draft-engine auth uses:
 *   league_teams.platformUserId === userId
 *   OR league_teams.claimedByUserId === userId
 *
 * Never throws. Always returns `null` on missing inputs or DB errors.
 *
 * Result is memoised on `request.perRequestMemo` so RosterContextProvider,
 * StandingsContextProvider, and (later) MatchupContextProvider share a single
 * read per Chimmy request.
 */

import { prisma } from "@/lib/prisma"
import type { ChimmyContextRequest } from "@/lib/chimmy-context/types"

export type ResolvedLeagueIdentity = {
  leagueId: string
  /** Viewer's team row in this league, when claimed/linked. */
  teamId: string | null
  /** Platform-specific user id for this league (Sleeper user id, etc.). */
  platformUserId: string | null
  /** Display name for the viewer's team, when available. */
  teamName: string | null
}

const MEMO_KEY = "chimmyContext:leagueIdentity"

function memoKey(leagueId: string, userId: string): string {
  return `${MEMO_KEY}:${leagueId}:${userId}`
}

async function loadActiveLeagueId(userId: string): Promise<string | null> {
  const appUser = await prisma.appUser
    .findUnique({
      where: { id: userId },
      select: { activeLeagueId: true },
    })
    .catch(() => null)
  return appUser?.activeLeagueId ?? null
}

export async function resolveLeagueIdentity(
  request: ChimmyContextRequest
): Promise<ResolvedLeagueIdentity | null> {
  const leagueId =
    request.leagueId ?? (await loadActiveLeagueId(request.userId))
  if (!leagueId) return null

  const memo = request.perRequestMemo
  const key = memoKey(leagueId, request.userId)
  if (memo && memo.has(key)) {
    return (memo.get(key) as ResolvedLeagueIdentity | null) ?? null
  }

  const team = await prisma.leagueTeam
    .findFirst({
      where: {
        leagueId,
        OR: [
          { platformUserId: request.userId },
          { claimedByUserId: request.userId },
        ],
      },
      select: {
        id: true,
        teamName: true,
        platformUserId: true,
      },
    })
    .catch(() => null)

  const identity: ResolvedLeagueIdentity = {
    leagueId,
    teamId: team?.id ?? null,
    platformUserId: team?.platformUserId ?? null,
    teamName: team?.teamName ?? null,
  }

  if (memo) memo.set(key, identity)
  return identity
}
