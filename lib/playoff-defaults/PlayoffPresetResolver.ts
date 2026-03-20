/**
 * Resolves the playoff preset (defaults) for a given sport and league variant.
 * Used by league creation, bracket config, and seeding.
 */
import { getPlayoffPreset } from './PlayoffDefaultsRegistry'
import type { DefaultPlayoffConfig } from '@/lib/sport-defaults/types'

export interface PlayoffPresetResult {
  preset: DefaultPlayoffConfig
  sport: string
  variant: string | null
  supportsByes: boolean
  supportsReseed: boolean
  supportsConsolation: boolean
  default_playoff_team_count: number
  default_playoff_start_point: number | null
  default_seeding_rules: string
  default_tiebreaker_rules: string[]
  default_bye_rules: string | null
  default_matchup_length: number
  default_total_rounds: number | null
  default_consolation_bracket_enabled: boolean
  default_third_place_game_enabled: boolean
  default_toilet_bowl_enabled: boolean
  default_championship_length: number
  default_reseed_behavior: string
}

/**
 * Resolve playoff preset by sport and optional variant.
 */
export function resolvePlayoffPreset(
  sport: string,
  variant?: string | null
): PlayoffPresetResult {
  const preset = getPlayoffPreset(sport, variant ?? undefined)
  const supportsByes = (preset.first_round_byes ?? 0) > 0
  const defaultReseed = String(preset.reseed_behavior ?? 'fixed_bracket')
  const supportsReseed = defaultReseed !== 'fixed_bracket'
  const supportsConsolation = (preset.consolation_bracket_enabled ?? preset.consolation_plays_for !== 'none') === true
  return {
    preset,
    sport,
    variant: variant ?? null,
    supportsByes,
    supportsReseed,
    supportsConsolation,
    default_playoff_team_count: preset.playoff_team_count,
    default_playoff_start_point: preset.playoff_start_week ?? null,
    default_seeding_rules: String(preset.seeding_rules ?? 'standard_standings'),
    default_tiebreaker_rules: Array.isArray(preset.tiebreaker_rules) ? preset.tiebreaker_rules : [],
    default_bye_rules: preset.bye_rules ?? null,
    default_matchup_length: preset.matchup_length ?? 1,
    default_total_rounds: preset.total_rounds ?? null,
    default_consolation_bracket_enabled: Boolean(preset.consolation_bracket_enabled ?? preset.consolation_plays_for !== 'none'),
    default_third_place_game_enabled: Boolean(preset.third_place_game_enabled ?? false),
    default_toilet_bowl_enabled: Boolean(preset.toilet_bowl_enabled ?? false),
    default_championship_length: preset.championship_length ?? 1,
    default_reseed_behavior: defaultReseed,
  }
}
