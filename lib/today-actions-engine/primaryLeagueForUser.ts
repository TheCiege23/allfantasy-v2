import 'server-only'

import { prisma } from '@/lib/prisma'
import type { LeagueSport } from '@prisma/client'

/**
 * Most recently touched team row → league (used for time hints + War Room snapshot).
 * Deterministic: `lastUpdatedAt` desc on `LeagueTeam`.
 */
export async function getPrimaryLeagueForUser(userId: string): Promise<{
  id: string
  sport: LeagueSport
} | null> {
  const team = await prisma.leagueTeam.findFirst({
    where: { claimedByUserId: userId },
    orderBy: { lastUpdatedAt: 'desc' },
    select: {
      league: { select: { id: true, sport: true } },
    },
  })
  const league = team?.league
  if (!league?.id) return null
  return { id: league.id, sport: league.sport }
}
