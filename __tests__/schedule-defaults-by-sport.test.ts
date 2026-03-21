import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSchedulePreset,
  getSchedulePresetDefinitions,
  getSupportedScheduleVariantsForSport,
  normalizeScheduleVariant,
} from '@/lib/schedule-defaults/ScheduleDefaultsRegistry'
import { resolveSchedulePreset } from '@/lib/schedule-defaults/SchedulePresetResolver'

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

describe('Prompt 20 schedule defaults by sport and variant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defines schedule presets for all supported sports with required fields', () => {
    const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'] as const
    for (const sport of sports) {
      const schedule = getSchedulePreset(sport, 'STANDARD')
      expect(schedule.sport_type).toBe(sport)
      expect(typeof schedule.schedule_unit).toBe('string')
      expect(schedule.regular_season_length).toBeGreaterThan(0)
      expect(typeof schedule.matchup_cadence).toBe('string')
      expect(typeof schedule.head_to_head_or_points_behavior).toBe('string')
      expect(typeof schedule.lock_window_behavior).toBe('string')
      expect(typeof schedule.scoring_period_behavior).toBe('string')
      expect(typeof schedule.reschedule_handling).toBe('string')
      expect(typeof schedule.doubleheader_or_multi_game_handling).toBe('string')
      expect(typeof schedule.schedule_generation_strategy).toBe('string')
    }
  })

  it('exposes supported NFL schedule variants including IDP and dynasty/c2c variants', () => {
    const variants = getSupportedScheduleVariantsForSport('NFL')
    expect(variants).toEqual(
      expect.arrayContaining([
        'STANDARD',
        'PPR',
        'HALF_PPR',
        'SUPERFLEX',
        'IDP',
        'DYNASTY_IDP',
        'DEVY_DYNASTY',
        'MERGED_DEVY_C2C',
      ])
    )

    const defs = getSchedulePresetDefinitions('NFL')
    expect(defs.length).toBeGreaterThanOrEqual(8)
    expect(defs.map((d) => d.variant)).toEqual(
      expect.arrayContaining(['IDP', 'DYNASTY_IDP', 'DEVY_DYNASTY', 'MERGED_DEVY_C2C'])
    )
  })

  it('keeps NFL IDP schedule cadence aligned with NFL defaults', () => {
    const standard = getSchedulePreset('NFL', 'STANDARD')
    const idp = getSchedulePreset('NFL', 'IDP')

    expect(idp.schedule_unit).toBe(standard.schedule_unit)
    expect(idp.matchup_cadence).toBe('weekly')
    expect(idp.regular_season_length).toBe(18)
    expect(idp.lock_window_behavior).toBe(standard.lock_window_behavior)
    expect(idp.playoff_transition_point).toBe(15)
  })

  it('normalizes schedule variant aliases for devy and c2c', () => {
    expect(normalizeScheduleVariant('devy')).toBe('DEVY_DYNASTY')
    expect(normalizeScheduleVariant('devy_dynasty')).toBe('DEVY_DYNASTY')
    expect(normalizeScheduleVariant('c2c')).toBe('MERGED_DEVY_C2C')
  })

  it('preserves sport-specific scoring and lock behavior differences', () => {
    const nfl = getSchedulePreset('NFL', 'STANDARD')
    const mlb = getSchedulePreset('MLB', 'STANDARD')
    const nba = getSchedulePreset('NBA', 'STANDARD')

    expect(nfl.scoring_period_behavior).toBe('full_period')
    expect(mlb.scoring_period_behavior).toBe('slate_based')
    expect(mlb.lock_window_behavior).toBe('slate_lock')
    expect(nba.lock_window_behavior).toBe('first_game_of_slate')
  })

  it('supports soccer no-playoff schedule variant without inheriting NFL behavior', () => {
    const soccerNoPlayoff = getSchedulePreset('SOCCER', 'NO_PLAYOFF')
    expect(soccerNoPlayoff.schedule_unit).toBe('week')
    expect(soccerNoPlayoff.regular_season_length).toBe(38)
    expect(soccerNoPlayoff.playoff_transition_point).toBe(39)
    expect(soccerNoPlayoff.lock_window_behavior).toBe('first_game_of_slate')
  })

  it('resolves schedule preset with normalized default_* mapped fields', () => {
    const resolved = resolveSchedulePreset('NCAAF', 'STANDARD')
    expect(resolved.default_schedule_unit).toBe('week')
    expect(resolved.default_regular_season_length).toBe(15)
    expect(resolved.default_matchup_cadence).toBe('weekly')
    expect(resolved.default_head_to_head_or_points_behavior).toBe('head_to_head')
    expect(resolved.default_lock_window_behavior).toBe('first_game_of_week')
    expect(resolved.default_scoring_period_behavior).toBe('full_period')
    expect(resolved.default_schedule_generation_strategy).toBe('round_robin')
  })

  it('fills only missing schedule keys during bootstrap', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      id: 'league-1',
      sport: 'MLB',
      leagueVariant: 'STANDARD',
      settings: {
        schedule_cadence: 'weekly',
        schedule_lock_window_behavior: 'manual_override',
        schedule_scoring_period_behavior: null,
        schedule_reschedule_handling: null,
      },
    })
    leagueUpdateMock.mockResolvedValueOnce({ id: 'league-1' })

    const { bootstrapLeagueScheduleConfig } = await import('@/lib/schedule-defaults/LeagueScheduleBootstrapService')
    const result = await bootstrapLeagueScheduleConfig('league-1')

    expect(result.scheduleConfigApplied).toBe(true)
    expect(leagueUpdateMock).toHaveBeenCalledTimes(1)

    const nextSettings = leagueUpdateMock.mock.calls[0]?.[0]?.data?.settings
    expect(nextSettings.schedule_cadence).toBe('weekly')
    expect(nextSettings.schedule_lock_window_behavior).toBe('manual_override')
    expect(nextSettings.schedule_scoring_period_behavior).toBe('slate_based')
    expect(nextSettings.schedule_reschedule_handling).toBe('use_final_time')
    expect(nextSettings.schedule_doubleheader_handling).toBe('all_games_count')
    expect(nextSettings.schedule_generation_strategy).toBe('round_robin')
  })

  it('is idempotent when all schedule keys already exist', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      id: 'league-2',
      sport: 'NFL',
      leagueVariant: 'STANDARD',
      settings: {
        schedule_unit: 'week',
        matchup_frequency: 'weekly',
        regular_season_length: 18,
        schedule_cadence: 'weekly',
        schedule_head_to_head_behavior: 'head_to_head',
        schedule_lock_window_behavior: 'first_game_of_week',
        schedule_scoring_period_behavior: 'full_period',
        schedule_reschedule_handling: 'use_final_time',
        schedule_doubleheader_handling: 'all_games_count',
        schedule_playoff_transition_point: 15,
        schedule_generation_strategy: 'round_robin',
      },
    })

    const { bootstrapLeagueScheduleConfig } = await import('@/lib/schedule-defaults/LeagueScheduleBootstrapService')
    const result = await bootstrapLeagueScheduleConfig('league-2')

    expect(result.scheduleConfigApplied).toBe(false)
    expect(leagueUpdateMock).not.toHaveBeenCalled()
  })

  it('resolves matchup cadence context with per-key fallback and no sport leakage', async () => {
    leagueFindUniqueMock.mockResolvedValueOnce({
      sport: 'SOCCER',
      leagueVariant: 'STANDARD',
      settings: {
        schedule_unit: 'week',
        matchup_frequency: null,
        schedule_cadence: null,
        regular_season_length: null,
        schedule_generation_strategy: null,
      },
    })

    const { getMatchupCadenceForLeague } = await import('@/lib/schedule-defaults/MatchupCadenceResolver')
    const config = await getMatchupCadenceForLeague('league-3')

    expect(config).not.toBeNull()
    expect(config?.sport).toBe('SOCCER')
    expect(config?.matchup_cadence).toBe('weekly')
    expect(config?.regular_season_length).toBe(38)
    expect(config?.schedule_generation_strategy).toBe('round_robin')
  })

  it('resolves scoring windows and generation context with per-key fallback', async () => {
    leagueFindUniqueMock.mockResolvedValue({
      sport: 'NCAAB',
      leagueVariant: 'STANDARD',
      settings: {
        lock_time_behavior: null,
        schedule_lock_window_behavior: null,
        schedule_scoring_period_behavior: null,
        schedule_reschedule_handling: null,
        schedule_doubleheader_handling: null,
        schedule_playoff_transition_point: null,
        schedule_generation_strategy: null,
      },
    })

    const { getScoringWindowConfigForLeague } = await import('@/lib/schedule-defaults/ScoringWindowResolver')
    const { getLeagueScheduleGenerationContext } = await import('@/lib/schedule-defaults/LeagueScheduleGenerationService')
    const { getScheduleConfigForLeague } = await import('@/lib/schedule-defaults/ScheduleConfigResolver')

    const scoring = await getScoringWindowConfigForLeague('league-4')
    const generation = await getLeagueScheduleGenerationContext('league-4')
    const schedule = await getScheduleConfigForLeague('league-4')

    expect(scoring?.lock_window_behavior).toBe('first_game_of_slate')
    expect(scoring?.scoring_period_behavior).toBe('full_period')
    expect(generation?.playoff_transition_point).toBe(16)
    expect(generation?.schedule_generation_strategy).toBe('round_robin')
    expect(schedule?.head_to_head_behavior).toBe('head_to_head')
    expect(schedule?.schedule_cadence).toBe('weekly')
  })
})
