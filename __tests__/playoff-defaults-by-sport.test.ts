import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getPlayoffPreset,
  getPlayoffPresetDefinitions,
  getSupportedPlayoffVariantsForSport,
} from '@/lib/playoff-defaults/PlayoffDefaultsRegistry'
import { resolvePlayoffPreset } from '@/lib/playoff-defaults/PlayoffPresetResolver'

const { leagueFindUniqueMock, leagueUpdateMock } = vi.hoisted(() => ({
  leagueFindUniqueMock: vi.fn(),
  leagueUpdateMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: leagueFindUniqueMock,
      update: leagueUpdateMock,
    },
  },
}))

describe('Prompt 19 playoff defaults by sport and variant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defines playoff presets for all supported sports with required fields', () => {
    const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'] as const
    for (const sport of sports) {
      const playoff = getPlayoffPreset(sport, 'STANDARD')
      expect(playoff.sport_type).toBe(sport)
      expect(playoff.playoff_team_count).toBeGreaterThanOrEqual(0)
      expect(typeof playoff.seeding_rules).toBe('string')
      expect(Array.isArray(playoff.tiebreaker_rules)).toBe(true)
      expect(typeof playoff.matchup_length).toBe('number')
      expect(typeof playoff.consolation_bracket_enabled).toBe('boolean')
      expect(typeof playoff.third_place_game_enabled).toBe('boolean')
      expect(typeof playoff.toilet_bowl_enabled).toBe('boolean')
      expect(typeof playoff.championship_length).toBe('number')
      expect(typeof playoff.reseed_behavior).toBe('string')
    }
  })

  it('exposes supported NFL playoff variants including IDP and DYNASTY_IDP', () => {
    const variants = getSupportedPlayoffVariantsForSport('NFL')
    expect(variants).toEqual(
      expect.arrayContaining(['STANDARD', 'PPR', 'HALF_PPR', 'SUPERFLEX', 'IDP', 'DYNASTY_IDP'])
    )

    const defs = getPlayoffPresetDefinitions('NFL')
    expect(defs.length).toBeGreaterThanOrEqual(6)
    expect(defs.map((d) => d.variant)).toEqual(expect.arrayContaining(['IDP', 'DYNASTY_IDP']))
  })

  it('resolves NFL IDP preset with NFL-style postseason defaults', () => {
    const standard = getPlayoffPreset('NFL', 'STANDARD')
    const idp = getPlayoffPreset('NFL', 'IDP')

    expect(idp.playoff_team_count).toBe(standard.playoff_team_count)
    expect(idp.playoff_start_week).toBe(15)
    expect(idp.matchup_length).toBe(1)
    expect(idp.tiebreaker_rules).toEqual(
      expect.arrayContaining(['points_for', 'head_to_head', 'points_against', 'division_record'])
    )
  })

  it('supports soccer no-playoff variant preset', () => {
    const noPlayoff = getPlayoffPreset('SOCCER', 'NO_PLAYOFF')
    expect(noPlayoff.playoff_team_count).toBe(0)
    expect(noPlayoff.playoff_weeks).toBe(0)
    expect(noPlayoff.playoff_start_week).toBeNull()
    expect(noPlayoff.consolation_bracket_enabled).toBe(false)
    expect(noPlayoff.third_place_game_enabled).toBe(false)
    expect(noPlayoff.toilet_bowl_enabled).toBe(false)
    expect(noPlayoff.championship_length).toBe(0)
  })

  it('resolves playoff preset capability and default_* mapped fields', () => {
    const resolved = resolvePlayoffPreset('NFL', 'IDP')
    expect(resolved.supportsByes).toBe(true)
    expect(resolved.supportsConsolation).toBe(true)
    expect(resolved.default_playoff_team_count).toBe(6)
    expect(resolved.default_playoff_start_point).toBe(15)
    expect(resolved.default_seeding_rules).toBe('standard_standings')
    expect(resolved.default_tiebreaker_rules).toEqual(expect.arrayContaining(['points_for']))
  })

  it('fills missing playoff keys during bootstrap while preserving existing overrides', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      id: 'league-1',
      sport: 'NFL',
      leagueVariant: 'IDP',
      settings: {
        playoff_team_count: 8,
        standings_tiebreakers: ['head_to_head'],
        playoff_structure: {
          bracket_type: 'single_elimination',
          playoff_weeks: 4,
          first_round_byes: null,
          total_rounds: null,
          seeding_rules: null,
          tiebreaker_rules: null,
        },
      },
    })
    leagueUpdateMock.mockResolvedValueOnce({ id: 'league-1' })

    const { bootstrapLeaguePlayoffConfig } = await import('@/lib/playoff-defaults/LeaguePlayoffBootstrapService')
    const result = await bootstrapLeaguePlayoffConfig('league-1')

    expect(result.playoffConfigApplied).toBe(true)
    expect(leagueUpdateMock).toHaveBeenCalledTimes(1)

    const nextSettings = leagueUpdateMock.mock.calls[0]?.[0]?.data?.settings
    expect(nextSettings.playoff_team_count).toBe(8)
    expect(nextSettings.standings_tiebreakers).toEqual(['head_to_head'])
    expect(nextSettings.playoff_structure.bracket_type).toBe('single_elimination')
    expect(nextSettings.playoff_structure.first_round_byes).toBe(2)
    expect(nextSettings.playoff_structure.total_rounds).toBe(3)
    expect(nextSettings.playoff_structure.seeding_rules).toBe('standard_standings')
    expect(nextSettings.playoff_structure.tiebreaker_rules).toEqual(
      expect.arrayContaining(['points_for', 'head_to_head'])
    )
  })

  it('is idempotent when playoff keys are already fully configured', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      id: 'league-2',
      sport: 'NBA',
      leagueVariant: 'STANDARD',
      settings: {
        playoff_team_count: 6,
        standings_tiebreakers: ['points_for', 'head_to_head'],
        playoff_structure: {
          playoff_team_count: 6,
          playoff_weeks: 3,
          first_round_byes: 2,
          bracket_type: 'single_elimination',
          consolation_plays_for: 'pick',
          playoff_start_week: 22,
          seeding_rules: 'standard_standings',
          tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
          bye_rules: 'top_two_seeds_bye',
          matchup_length: 1,
          total_rounds: 3,
          consolation_bracket_enabled: true,
          third_place_game_enabled: true,
          toilet_bowl_enabled: false,
          championship_length: 1,
          reseed_behavior: 'fixed_bracket',
        },
      },
    })

    const { bootstrapLeaguePlayoffConfig } = await import('@/lib/playoff-defaults/LeaguePlayoffBootstrapService')
    const result = await bootstrapLeaguePlayoffConfig('league-2')

    expect(result.playoffConfigApplied).toBe(false)
    expect(leagueUpdateMock).not.toHaveBeenCalled()
  })

  it('uses per-key fallback for seeding and standings tiebreakers', async () => {
    leagueFindUniqueMock.mockResolvedValue({
      sport: 'SOCCER',
      leagueVariant: 'STANDARD',
      settings: {
        playoff_structure: {
          seeding_rules: 'division_winners_first',
          bye_rules: null,
        },
      },
    })

    const { getSeedingRulesForLeague } = await import('@/lib/playoff-defaults/PlayoffSeedingResolver')
    const { getStandingsTiebreakersForLeague } = await import('@/lib/playoff-defaults/StandingsTiebreakerResolver')

    const seeding = await getSeedingRulesForLeague('league-3')
    const tiebreakers = await getStandingsTiebreakersForLeague('league-3')

    expect(seeding).not.toBeNull()
    expect(seeding?.seeding_rules).toBe('division_winners_first')
    expect(seeding?.bye_rules).toBe('top_two_seeds_bye')
    expect(Array.isArray(seeding?.tiebreaker_rules)).toBe(true)

    expect(tiebreakers).not.toBeNull()
    expect(Array.isArray(tiebreakers?.tiebreakers)).toBe(true)
    expect(tiebreakers?.tiebreakers.length).toBeGreaterThan(0)
  })

  it('resolves bracket config including playoff_start_point alias and postseason toggles', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      sport: 'NCAAF',
      leagueVariant: 'STANDARD',
      settings: {
        playoff_team_count: 6,
        playoff_structure: {
          playoff_weeks: 3,
          playoff_start_week: 13,
          first_round_byes: 2,
          consolation_bracket_enabled: true,
          third_place_game_enabled: true,
          toilet_bowl_enabled: false,
        },
      },
    })

    const { getBracketConfigForLeague } = await import('@/lib/playoff-defaults/PlayoffBracketConfigResolver')
    const config = await getBracketConfigForLeague('league-4')

    expect(config).not.toBeNull()
    expect(config?.playoff_start_week).toBe(13)
    expect(config?.playoff_start_point).toBe(13)
    expect(config?.first_round_byes).toBe(2)
    expect(config?.consolation_bracket_enabled).toBe(true)
    expect(config?.third_place_game_enabled).toBe(true)
    expect(config?.toilet_bowl_enabled).toBe(false)
  })
})
