import { prisma } from '@/lib/prisma'
import { TOURNAMENT_LEAGUE_VARIANT } from '@/lib/tournament-mode/constants'

/**
 * Ensures tournament feeder leagues (legacy + shell-provisioned) have
 * `settings.league_type === 'tournament'` and `leagueType === 'tournament'`
 * so format/intro resolution matches the tournament product.
 */
export async function backfillTournamentFeederLeagueSettings(): Promise<{
  scanned: number
  updatedSettings: number
  updatedLeagueType: number
}> {
  const rows = await prisma.league.findMany({
    where: { leagueVariant: TOURNAMENT_LEAGUE_VARIANT },
    select: { id: true, settings: true, leagueType: true },
  })

  let updatedSettings = 0
  let updatedLeagueType = 0

  for (const row of rows) {
    const s = (row.settings as Record<string, unknown> | null) ?? {}
    const needsSettings = s.league_type !== 'tournament'
    const needsLeagueType = row.leagueType == null || row.leagueType === 'redraft'
    if (!needsSettings && !needsLeagueType) continue

    await prisma.league.update({
      where: { id: row.id },
      data: {
        ...(needsSettings ? { settings: { ...s, league_type: 'tournament' } } : {}),
        ...(needsLeagueType ? { leagueType: 'tournament' } : {}),
      },
    })
    if (needsSettings) updatedSettings++
    if (needsLeagueType) updatedLeagueType++
  }

  return { scanned: rows.length, updatedSettings, updatedLeagueType }
}
