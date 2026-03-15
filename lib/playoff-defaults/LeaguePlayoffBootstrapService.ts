/**
 * Ensures a league has playoff config in League.settings (sport- and variant-aware).
 * Idempotent: merges default playoff keys only when playoff_team_count or playoff_structure is missing.
 */
import { prisma } from '@/lib/prisma'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import { getDefaultLeagueSettings } from '@/lib/sport-defaults/LeagueDefaultSettingsService'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface LeaguePlayoffBootstrapResult {
  leagueId: string
  playoffConfigApplied: boolean
  sport: string
  variant: string | null
}

/**
 * Ensure league has playoff config in League.settings. If playoff_team_count or playoff_structure
 * is missing, merge in sport defaults without overwriting existing keys.
 */
export async function bootstrapLeaguePlayoffConfig(leagueId: string): Promise<LeaguePlayoffBootstrapResult> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { id: true, sport: true, leagueVariant: true, settings: true },
  })
  if (!league) {
    return { leagueId, playoffConfigApplied: false, sport: '', variant: null }
  }

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const sport = (league.sport as string) || DEFAULT_SPORT
  const variant = league.leagueVariant ?? null

  const hasPlayoffTeamCount = settings.playoff_team_count !== undefined && settings.playoff_team_count !== null
  const hasPlayoffStructure = settings.playoff_structure != null && typeof settings.playoff_structure === 'object'
  if (hasPlayoffTeamCount && hasPlayoffStructure) {
    return { leagueId, playoffConfigApplied: false, sport, variant }
  }

  const def = getDefaultLeagueSettings(sport)
  const playoffBlock: Record<string, unknown> = {}
  if (!hasPlayoffTeamCount) playoffBlock.playoff_team_count = def.playoff_team_count
  if (!hasPlayoffStructure) playoffBlock.playoff_structure = def.playoff_structure
  if (Object.keys(playoffBlock).length === 0) {
    return { leagueId, playoffConfigApplied: false, sport, variant }
  }

  await (prisma as any).league.update({
    where: { id: leagueId },
    data: { settings: { ...settings, ...playoffBlock } },
  })

  return { leagueId, playoffConfigApplied: true, sport, variant }
}
