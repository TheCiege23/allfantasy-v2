/**
 * Cross-Platform AI Tools — Trust Builder
 *
 * Allows users to import leagues from other platforms (Sleeper, ESPN, Yahoo, etc.)
 * and use AllFantasy AI tools WITHOUT fully migrating to AllFantasy.
 *
 * This drives subscriptions by proving AI value on users' existing leagues:
 * - Trade Analyzer works on imported Sleeper rosters
 * - Power Rankings generated from imported standings
 * - Waiver suggestions based on imported roster gaps
 * - Start/Sit advice using imported lineups
 * - Draft grades from imported draft results
 *
 * Users see the value → subscribe → eventually migrate full leagues.
 */

import { prisma } from '@/lib/prisma'

export type ExternalLeagueSnapshot = {
  id: string
  userId: string
  provider: string // sleeper, espn, yahoo, fantrax, etc.
  providerLeagueId: string
  leagueName: string
  sport: string
  season: number
  teamCount: number
  userTeamName: string | null
  userRecord: { wins: number; losses: number; ties: number } | null
  userRoster: Array<{ name: string; position: string; team: string }>
  standings: Array<{ teamName: string; wins: number; losses: number; pointsFor: number; rank: number }>
  scoringFormat: string | null
  importedAt: Date
}

/**
 * Import a lightweight snapshot of an external league for AI analysis.
 * No full migration — just enough data for AI tools to work.
 */
export async function importExternalLeagueSnapshot(
  userId: string,
  provider: string,
  providerLeagueId: string,
): Promise<ExternalLeagueSnapshot | null> {
  if (provider === 'sleeper') {
    return importSleeperSnapshot(userId, providerLeagueId)
  }
  // Other providers can be added here
  return null
}

async function importSleeperSnapshot(
  userId: string,
  leagueId: string,
): Promise<ExternalLeagueSnapshot | null> {
  const provider = 'sleeper'
  try {
    const { getLeagueInfo, getLeagueRosters, getLeagueUsers } = await import('@/lib/api-cache/index')

    const [leagueData, rostersData, usersData] = await Promise.all([
      getLeagueInfo(leagueId),
      getLeagueRosters(leagueId),
      getLeagueUsers(leagueId),
    ])

    if (!leagueData) return null

    const league = leagueData as Record<string, unknown>
    const rosters = (rostersData ?? []) as Array<Record<string, unknown>>
    const users = (usersData ?? []) as Array<Record<string, unknown>>

    // Find the user's profile to match their roster
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { sleeperUserId: true },
    })

    const sleeperUserId = userProfile?.sleeperUserId
    const userRoster = sleeperUserId
      ? rosters.find((r) => String(r.owner_id) === sleeperUserId)
      : null

    // Build standings
    const standings = rosters.map((r, i) => {
      const user = users.find((u) => String(u.user_id) === String(r.owner_id))
      const rosterSettings = (r.settings ?? {}) as Record<string, unknown>
      return {
        teamName: String(user?.display_name ?? user?.username ?? `Team ${i + 1}`),
        wins: Number(rosterSettings.wins ?? 0),
        losses: Number(rosterSettings.losses ?? 0),
        pointsFor: Number(rosterSettings.fpts ?? 0),
        rank: i + 1,
      }
    }).sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)

    // Assign ranks
    standings.forEach((s, i) => { s.rank = i + 1 })

    const userStanding = standings.find((s) => {
      const user = users.find((u) => String(u.user_id) === sleeperUserId)
      return user && s.teamName === String(user.display_name ?? user.username)
    })

    const snapshot: ExternalLeagueSnapshot = {
      id: `ext-${provider}-${leagueId}-${userId}`,
      userId,
      provider,
      providerLeagueId: leagueId,
      leagueName: String(league.name ?? 'League'),
      sport: String(league.sport ?? 'nfl').toUpperCase(),
      season: Number(league.season ?? new Date().getFullYear()),
      teamCount: rosters.length,
      userTeamName: userStanding?.teamName ?? null,
      userRecord: userStanding ? { wins: userStanding.wins, losses: userStanding.losses, ties: 0 } : null,
      userRoster: [], // Simplified — full roster requires player name resolution
      standings,
      scoringFormat: null,
      importedAt: new Date(),
    }

    // Cache the snapshot when the optional model exists in this deployment.
    const externalLeagueSnapshotModel = (prisma as unknown as {
      externalLeagueSnapshot?: { upsert?: (args: unknown) => Promise<unknown> }
    }).externalLeagueSnapshot

    await externalLeagueSnapshotModel?.upsert?.({
      where: { id: snapshot.id },
      create: {
        id: snapshot.id,
        userId,
        provider,
        providerLeagueId: leagueId,
        leagueName: snapshot.leagueName,
        sport: snapshot.sport,
        data: snapshot as object,
      },
      update: {
        data: snapshot as object,
        updatedAt: new Date(),
      },
    } as unknown).catch(() => {
      // Table may not exist yet — non-fatal
    })

    return snapshot
  } catch (e) {
    console.warn('[cross-platform] Sleeper snapshot failed:', e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * Get available AI tools for an external league snapshot.
 * Shows what analysis can be done without full migration.
 */
export function getAvailableAITools(snapshot: ExternalLeagueSnapshot): Array<{
  id: string
  label: string
  description: string
  available: boolean
  requiresSubscription: string | null
}> {
  return [
    {
      id: 'trade_analyzer',
      label: 'Trade Analyzer',
      description: 'Evaluate trades in your external league',
      available: true,
      requiresSubscription: null, // Free preview
    },
    {
      id: 'power_rankings',
      label: 'Power Rankings',
      description: `AI power rankings for ${snapshot.leagueName}`,
      available: snapshot.standings.length >= 4,
      requiresSubscription: 'af_pro',
    },
    {
      id: 'waiver_suggestions',
      label: 'Waiver Suggestions',
      description: 'Best available players for your roster',
      available: true,
      requiresSubscription: 'af_pro',
    },
    {
      id: 'start_sit',
      label: 'Start/Sit Advice',
      description: 'Weekly lineup recommendations',
      available: true,
      requiresSubscription: 'af_pro',
    },
    {
      id: 'draft_grade',
      label: 'Draft Grade',
      description: 'Grade your draft from any platform',
      available: true,
      requiresSubscription: 'af_commissioner',
    },
    {
      id: 'playoff_odds',
      label: 'Playoff Odds',
      description: `Your playoff chances in ${snapshot.leagueName}`,
      available: snapshot.standings.length >= 6,
      requiresSubscription: 'af_pro',
    },
  ]
}
