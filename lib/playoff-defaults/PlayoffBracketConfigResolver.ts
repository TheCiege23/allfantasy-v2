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

  const structure = settings.playoff_structure as Record<string, unknown> | undefined
  const useStored = structure != null && typeof structure === 'object'
  const teamCount = settings.playoff_team_count ?? defaults.playoff_team_count

  return {
    playoff_team_count: teamCount as number,
    playoff_weeks: useStored ? (structure.playoff_weeks as number) ?? defaults.playoff_weeks : defaults.playoff_weeks,
    playoff_start_week: useStored ? (structure.playoff_start_week as number) ?? defaults.playoff_start_week ?? null : (defaults.playoff_start_week ?? null),
    first_round_byes: useStored ? (structure.first_round_byes as number) ?? defaults.first_round_byes : defaults.first_round_byes,
    bracket_type: useStored ? (structure.bracket_type as string) ?? defaults.bracket_type : defaults.bracket_type,
    matchup_length: useStored ? (structure.matchup_length as number) ?? defaults.matchup_length ?? 1 : (defaults.matchup_length ?? 1),
    total_rounds: useStored ? (structure.total_rounds as number) ?? defaults.total_rounds ?? null : (defaults.total_rounds ?? null),
    consolation_bracket_enabled: useStored ? (structure.consolation_bracket_enabled as boolean) ?? (defaults.consolation_plays_for !== 'none') : (defaults.consolation_bracket_enabled ?? defaults.consolation_plays_for !== 'none'),
    third_place_game_enabled: useStored ? (structure.third_place_game_enabled as boolean) ?? false : (defaults.third_place_game_enabled ?? false),
    toilet_bowl_enabled: useStored ? (structure.toilet_bowl_enabled as boolean) ?? false : (defaults.toilet_bowl_enabled ?? false),
    championship_length: useStored ? (structure.championship_length as number) ?? 1 : (defaults.championship_length ?? 1),
    consolation_plays_for: useStored ? (structure.consolation_plays_for as string) ?? defaults.consolation_plays_for : defaults.consolation_plays_for,
    sport,
    variant,
  }
}
