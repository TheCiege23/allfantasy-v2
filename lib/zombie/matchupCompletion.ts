import { prisma } from '@/lib/prisma'

/**
 * True when every regular matchup for the week has status `complete` and has two rosters.
 */
export async function checkAllMatchupsComplete(
  fantasyLeagueId: string,
  week: number,
  seasonYear: number,
): Promise<boolean> {
  const season = await prisma.redraftSeason.findFirst({
    where: { leagueId: fantasyLeagueId, season: seasonYear },
  })
  if (!season) return false

  const mm = await prisma.redraftMatchup.findMany({
    where: { seasonId: season.id, week },
  })
  if (mm.length === 0) return false

  return mm.every((m) => m.awayRosterId != null && m.status === 'complete')
}
