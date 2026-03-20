/**
 * Resolves full playoff bracket config for a league: teams, rounds, byes, consolation, championship.
 */
import { prisma } from '@/lib/prisma'
import { resolveDefaultPlayoffConfig } from '@/lib/sport-defaults/DefaultPlayoffConfigResolver'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface PlayoffBracketConfig {
  playoff_team_count: number
  playoff_weeks: number
  playoff_start_week: number | null
  playoff_start_point: number | null
  first_round_byes: number
  bracket_type: string
  matchup_length: number
  total_rounds: number | null
  consolation_bracket_enabled: boolean
  third_place_game_enabled: boolean
  toilet_bowl_enabled: boolean
  championship_length: number
  consolation_plays_for: string
  sport: string
  variant: string | null
}

/**
 * Get bracket config for a league (for playoff displays and matchup generation).
 */
export async function getBracketConfigForLeague(leagueId: string): Promise<PlayoffBracketConfig | null> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { sport: true, leagueVariant: true, settings: true },
  })
  if (!league) return null

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const sport = (league.sport as string) || 'NFL'
  const variant = league.leagueVariant ?? null
  const sportType = toSportType(sport) as SportType
  const defaults = resolveDefaultPlayoffConfig(sportType, variant ?? undefined)

  const structure = settings.playoff_structure != null && typeof settings.playoff_structure === 'object'
    ? (settings.playoff_structure as Record<string, unknown>)
    : {}
  const fromStructure = <T>(key: string, fallback: T): T => {
    const value = structure[key]
    return value === undefined || value === null ? fallback : (value as T)
  }
  const teamCount = settings.playoff_team_count ?? defaults.playoff_team_count
  const playoffStart = fromStructure<number | null>('playoff_start_week', defaults.playoff_start_week ?? null)

  return {
    playoff_team_count: teamCount as number,
    playoff_weeks: fromStructure<number>('playoff_weeks', defaults.playoff_weeks),
    playoff_start_week: playoffStart,
    playoff_start_point: playoffStart,
    first_round_byes: fromStructure<number>('first_round_byes', defaults.first_round_byes),
    bracket_type: fromStructure<string>('bracket_type', defaults.bracket_type),
    matchup_length: fromStructure<number>('matchup_length', defaults.matchup_length ?? 1),
    total_rounds: fromStructure<number | null>('total_rounds', defaults.total_rounds ?? null),
    consolation_bracket_enabled: fromStructure<boolean>('consolation_bracket_enabled', defaults.consolation_bracket_enabled ?? defaults.consolation_plays_for !== 'none'),
    third_place_game_enabled: fromStructure<boolean>('third_place_game_enabled', defaults.third_place_game_enabled ?? false),
    toilet_bowl_enabled: fromStructure<boolean>('toilet_bowl_enabled', defaults.toilet_bowl_enabled ?? false),
    championship_length: fromStructure<number>('championship_length', defaults.championship_length ?? 1),
    consolation_plays_for: fromStructure<string>('consolation_plays_for', defaults.consolation_plays_for),
    sport,
    variant,
  }
}
