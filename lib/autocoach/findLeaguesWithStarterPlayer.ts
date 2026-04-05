import 'server-only'

import type { LeagueSport } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getNormalizedLineupSections } from '@/lib/roster/LineupTemplateValidation'

/**
 * Leagues (with AutoCoach-enabled users) where `externalPlayerId` appears in the user's starting lineup.
 */
export async function findLeagueIdsWithPlayerAsStarter(sport: string, externalPlayerId: string): Promise<string[]> {
  const sk = sport.toUpperCase() as LeagueSport
  const settings = await prisma.autoCoachSetting.findMany({
    where: {
      enabled: true,
      blockedByCommissioner: false,
      league: { sport: sk, autoCoachEnabled: true },
    },
    select: { leagueId: true, userId: true },
  })
  if (settings.length === 0) return []

  const rosters = await prisma.roster.findMany({
    where: {
      OR: settings.map((s) => ({ leagueId: s.leagueId, platformUserId: s.userId })),
    },
    select: { leagueId: true, playerData: true },
  })

  const leagueIds = new Set<string>()
  for (const r of rosters) {
    try {
      const sections = getNormalizedLineupSections(r.playerData)
      if (sections.starters.some((st) => String(st.id) === externalPlayerId)) {
        leagueIds.add(r.leagueId)
      }
    } catch {
      continue
    }
  }
  return [...leagueIds]
}
