import { prisma } from "@/lib/prisma"
import { getSettingsProfile } from "@/lib/user-settings/SettingsQueryService"

/**
 * Derives user interests from profile (preferred sports) and league memberships (bracket + app).
 * Used by FeedRankingResolver to personalize feed order.
 */
export async function getUserInterests(userId: string): Promise<{
  sports: string[]
  leagueIds: string[]
  creatorLeagueIds?: string[]
}> {
  const [profile, bracketMemberships, creatorMemberships] = await Promise.all([
    getSettingsProfile(userId),
    (prisma as any).bracketLeagueMember
      .findMany({
        where: { userId },
        select: { leagueId: true },
      })
      .catch(() => []),
    (prisma as any).creatorLeagueMember
      .findMany({
        where: { userId },
        select: { creatorLeagueId: true },
      })
      .catch(() => []),
  ])

  const sports: string[] = []
  const rawSports = profile?.preferredSports
  if (Array.isArray(rawSports)) {
    for (const s of rawSports) {
      if (typeof s === "string" && s.trim()) sports.push(s.trim())
    }
  }

  const leagueIds: string[] = bracketMemberships.map((m: { leagueId: string }) => m.leagueId)

  const appLeagues = await (prisma as any).league
    .findMany({
      where: { userId },
      select: { id: true },
    })
    .catch(() => [])
  for (const l of appLeagues) {
    if (l.id && !leagueIds.includes(l.id)) leagueIds.push(l.id)
  }

  const creatorLeagueIds = creatorMemberships.map(
    (m: { creatorLeagueId: string }) => m.creatorLeagueId
  )

  return {
    sports: [...new Set(sports)],
    leagueIds: [...new Set(leagueIds)],
    creatorLeagueIds: creatorLeagueIds.length > 0 ? creatorLeagueIds : undefined,
  }
}
