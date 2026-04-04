import { prisma } from '@/lib/prisma'

type LeagueSlice = {
  leagueId: string | null
  participants: Array<{ id: string; redraftRosterId: string | null }>
}

/**
 * Sum redraft matchup fantasy points per tournament league participant for a single NFL/redraft week.
 * Rosters with no matchup that week get no map entry (caller treats as 0).
 */
export async function computeWeeklyPointsByTlpId(leagues: LeagueSlice[], week: number): Promise<Map<string, number>> {
  const out = new Map<string, number>()

  for (const tl of leagues) {
    if (!tl.leagueId) continue

    const season = await prisma.redraftSeason.findFirst({
      where: { leagueId: tl.leagueId },
      orderBy: { season: 'desc' },
      select: { id: true },
    })
    if (!season) continue

    const rosterToTlp = new Map<string, string>()
    const rosterIds: string[] = []
    for (const p of tl.participants) {
      if (p.redraftRosterId) {
        rosterToTlp.set(p.redraftRosterId, p.id)
        rosterIds.push(p.redraftRosterId)
      }
    }
    if (rosterIds.length === 0) continue

    const matchups = await prisma.redraftMatchup.findMany({
      where: {
        seasonId: season.id,
        week,
        leagueId: tl.leagueId,
        OR: [{ homeRosterId: { in: rosterIds } }, { awayRosterId: { in: rosterIds } }],
      },
      select: {
        homeRosterId: true,
        awayRosterId: true,
        homeScore: true,
        awayScore: true,
      },
    })

    for (const m of matchups) {
      const homeTlp = rosterToTlp.get(m.homeRosterId)
      if (homeTlp != null) {
        const add = m.homeScore ?? 0
        out.set(homeTlp, (out.get(homeTlp) ?? 0) + add)
      }
      if (m.awayRosterId) {
        const awayTlp = rosterToTlp.get(m.awayRosterId)
        if (awayTlp != null) {
          const add = m.awayScore ?? 0
          out.set(awayTlp, (out.get(awayTlp) ?? 0) + add)
        }
      }
    }
  }

  return out
}
