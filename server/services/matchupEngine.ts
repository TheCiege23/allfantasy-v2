/**
 * Head-to-head resolution: compare team week totals, assign W / L / T.
 * Optional tiebreaker from `scoringSettings.rules.matchupTiebreaker` (e.g. bench_points).
 */
import { prisma } from '@/lib/prisma'
import { parseSettingsSnapshot } from '@/lib/league-contract/types'
import { getMatchupTiebreakerMode } from '@/lib/scoring-engine/scoringSettingsResolved'

async function sumNonStarterPoints(
  leagueId: string,
  season: number,
  week: number,
  rosterId: string,
): Promise<number> {
  const rows = await prisma.weeklyScore.findMany({
    where: { leagueId, season, week, rosterId, isStarter: false },
    select: { points: true },
  })
  let s = 0
  for (const r of rows) {
    s += Number(r.points) || 0
  }
  return Math.round(s * 100) / 100
}

export async function resolveMatchupOutcomesForWeek(
  leagueId: string,
  season: number,
  week: number,
): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const snap = parseSettingsSnapshot(league?.settings ?? null)
  const scoringSettings = (snap?.scoringSettings ?? null) as Record<string, unknown> | null
  const tieMode = getMatchupTiebreakerMode(scoringSettings)

  const rows = await prisma.teamWeekResult.findMany({
    where: { leagueId, season, week },
  })
  const byId = new Map(rows.map((r) => [r.rosterId, r]))

  for (const r of rows) {
    const oppId = r.opponentRosterId
    if (!oppId) {
      await prisma.teamWeekResult.update({
        where: { id: r.id },
        data: { winLoss: null },
      })
      continue
    }
    const opp = byId.get(oppId)
    if (!opp) continue

    const a = Number(r.totalPoints) || 0
    const b = Number(opp.totalPoints) || 0
    let wl: string

    if (a > b) wl = 'W'
    else if (a < b) wl = 'L'
    else {
      if (tieMode === 'bench_points') {
        const benchA = await sumNonStarterPoints(leagueId, season, week, r.rosterId)
        const benchB = await sumNonStarterPoints(leagueId, season, week, opp.rosterId)
        if (benchA > benchB) wl = 'W'
        else if (benchA < benchB) wl = 'L'
        else wl = 'T'
      } else {
        wl = 'T'
      }
    }

    await prisma.teamWeekResult.update({
      where: { id: r.id },
      data: { winLoss: wl },
    })
  }
}
