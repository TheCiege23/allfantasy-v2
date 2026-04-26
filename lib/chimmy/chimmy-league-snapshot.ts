import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'

export type ChimmyLeagueSnapshot = {
  id: string
  name: string | null
  sport: SupportedSport
  platform: string
  platformLeagueId: string
  season: number
  leagueSize: number | null
  scoring: string | null
  leagueVariant: string | null
  isDynasty: boolean
  status: string | null
  timezone: string | null
  lastSyncedAt: Date | null
  importBatchId: string | null
  importedAt: Date | null
}

/**
 * League row the user owns (same scope as dashboard league list). Used to ground Chimmy in real AF/imported leagues.
 */
export async function loadLeagueSnapshotForUser(
  userId: string,
  leagueId: string
): Promise<ChimmyLeagueSnapshot | null> {
  const row = await prisma.league.findFirst({
    where: {
      id: leagueId,
      OR: [
        { userId },
        {
          teams: {
            some: {
              claimedByUserId: userId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      sport: true,
      platform: true,
      platformLeagueId: true,
      season: true,
      leagueSize: true,
      scoring: true,
      leagueVariant: true,
      isDynasty: true,
      status: true,
      timezone: true,
      lastSyncedAt: true,
      importBatchId: true,
      importedAt: true,
    },
  })
  if (!row) return null
  return {
    ...row,
    sport: normalizeToSupportedSport(row.sport),
  }
}
