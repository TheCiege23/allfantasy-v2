import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveLeaguePresetMock = vi.fn()
const getFullLeaguePresetMock = vi.fn()
const getScheduleTemplateMock = vi.fn()
const getSeasonCalendarMock = vi.fn()
const getLeagueDefaultsMock = vi.fn()
const getDraftDefaultsMock = vi.fn()
const getWaiverDefaultsMock = vi.fn()
const getTeamMetadataDefaultsMock = vi.fn()
const getSportMetadataMock = vi.fn()
const getDefaultLeagueSettingsForVariantMock = vi.fn()
const leagueSportToSportTypeMock = vi.fn()

vi.mock('@/lib/sport-defaults/LeaguePresetResolver', () => ({
  resolveLeaguePreset: resolveLeaguePresetMock,
}))

vi.mock('@/lib/sport-defaults/SportLeaguePresetService', () => ({
  getFullLeaguePreset: getFullLeaguePresetMock,
}))

vi.mock('@/lib/sport-defaults/ScheduleTemplateResolver', () => ({
  getScheduleTemplate: getScheduleTemplateMock,
}))

vi.mock('@/lib/sport-defaults/SeasonCalendarResolver', () => ({
  getSeasonCalendar: getSeasonCalendarMock,
}))

vi.mock('@/lib/sport-defaults/SportDefaultsRegistry', () => ({
  getLeagueDefaults: getLeagueDefaultsMock,
  getDraftDefaults: getDraftDefaultsMock,
  getWaiverDefaults: getWaiverDefaultsMock,
  getTeamMetadataDefaults: getTeamMetadataDefaultsMock,
}))

vi.mock('@/lib/sport-defaults/SportMetadataRegistry', () => ({
  getSportMetadata: getSportMetadataMock,
}))

vi.mock('@/lib/sport-defaults/LeagueDefaultSettingsService', () => ({
  getDefaultLeagueSettingsForVariant: getDefaultLeagueSettingsForVariantMock,
}))

vi.mock('@/lib/multi-sport/SportConfigResolver', () => ({
  leagueSportToSportType: leagueSportToSportTypeMock,
}))

const scheduleTemplate = {
  templateId: 'sched-default',
  name: 'Default Schedule',
  formatType: 'DEFAULT',
  matchupType: 'head_to_head',
  regularSeasonWeeks: 18,
  playoffWeeks: 3,
  byeWeekWindow: null,
  fantasyPlayoffDefault: null,
  lineupLockMode: 'first_game',
  scoringMode: 'points',
  regularSeasonStyle: 'weekly',
  playoffSupport: true,
  bracketModeSupported: true,
  marchMadnessMode: false,
  bowlPlayoffMetadata: false,
}

const seasonCalendar = {
  calendarId: 'cal-default',
  name: 'Default Calendar',
  formatType: 'DEFAULT',
  preseasonPeriod: null,
  regularSeasonPeriod: { label: 'Regular' },
  playoffsPeriod: { label: 'Playoffs' },
  championshipPeriod: null,
  internationalBreaksSupported: false,
}

beforeEach(() => {
  vi.clearAllMocks()

  getScheduleTemplateMock.mockResolvedValue(scheduleTemplate)
  getSeasonCalendarMock.mockResolvedValue(seasonCalendar)

  getLeagueDefaultsMock.mockReturnValue({
    default_league_name_pattern: 'My League',
    default_team_count: 12,
    default_playoff_team_count: 6,
    default_regular_season_length: 18,
    default_matchup_unit: 'week',
    default_trade_deadline_logic: 'week_based',
  })

  getDraftDefaultsMock.mockReturnValue({
    draft_type: 'snake',
    rounds_default: 15,
    timer_seconds_default: 90,
    pick_order_rules: 'snake',
  })

  getWaiverDefaultsMock.mockReturnValue({
    waiver_type: 'faab',
    processing_days: [3],
    FAAB_budget_default: 100,
  })

  getSportMetadataMock.mockReturnValue({
    display_name: 'Test Sport',
    short_name: 'TS',
    icon: 'icon',
    logo_strategy: 'local',
  })

  getTeamMetadataDefaultsMock.mockReturnValue({ sport_type: 'NFL', teams: [] })

  getDefaultLeagueSettingsForVariantMock.mockReturnValue({
    playoff_team_count: 6,
    playoff_structure: { bracket_type: 'single_elimination' },
    regular_season_length: 18,
    matchup_frequency: 'weekly',
    season_labeling: 'week',
    schedule_unit: 'week',
    waiver_mode: 'faab',
    trade_review_mode: 'commissioner',
    standings_tiebreakers: ['points_for'],
    injury_slot_behavior: 'ir_or_out',
    lock_time_behavior: 'first_game',
  })

  resolveLeaguePresetMock.mockResolvedValue({
    rosterDefaults: {
      starter_slots: { QB: 1, RB: 2 },
      bench_slots: 6,
      IR_slots: 2,
      taxi_slots: 0,
      devy_slots: 0,
      flex_definitions: [],
    },
    rosterTemplate: {
      templateId: 'roster-variant',
      name: 'Variant Roster',
      formatType: 'PPR',
      slots: [],
    },
    scoringTemplate: {
      templateId: 'scoring-variant',
      name: 'Variant Scoring',
      formatType: 'PPR',
      rules: [],
    },
  })

  getFullLeaguePresetMock.mockResolvedValue({
    defaults: {
      metadata: {
        sport_type: 'SOCCER',
        display_name: 'Soccer',
        short_name: 'SOCCER',
        icon: 'soccer',
        logo_strategy: 'local',
      },
      league: {
        default_league_name_pattern: 'My Soccer League',
        default_team_count: 12,
        default_playoff_team_count: 6,
        default_regular_season_length: 38,
        default_matchup_unit: 'week',
        default_trade_deadline_logic: 'week_based',
      },
      roster: {
        starter_slots: { GKP: 1, DEF: 4, MID: 4, FWD: 2 },
        bench_slots: 4,
        IR_slots: 1,
        taxi_slots: 0,
        devy_slots: 0,
        flex_definitions: [],
      },
      scoring: {
        scoring_template_id: 'default-SOCCER-standard',
        scoring_format: 'standard',
        category_type: 'points',
      },
      draft: {
        draft_type: 'snake',
        rounds_default: 15,
        timer_seconds_default: 90,
        pick_order_rules: 'snake',
      },
      waiver: {
        waiver_type: 'faab',
        processing_days: [3],
        FAAB_budget_default: 100,
      },
      teamMetadata: { sport_type: 'SOCCER', teams: [] },
    },
    preset: {
      rosterTemplate: {
        templateId: 'roster-default',
        name: 'Default Roster',
        formatType: 'standard',
        slots: [],
      },
      scoringTemplate: {
        templateId: 'scoring-default',
        name: 'Default Scoring',
        formatType: 'standard',
        rules: [],
      },
    },
  })
})

describe('LeagueCreationDefaultsLoader variant resolution', () => {
  it('uses LeaguePresetResolver for non-IDP NFL variants', async () => {
    leagueSportToSportTypeMock.mockReturnValue('NFL')

    const { loadLeagueCreationDefaults } = await import('@/lib/sport-defaults/LeagueCreationDefaultsLoader')
    const payload = await loadLeagueCreationDefaults('NFL', 'PPR')

    expect(resolveLeaguePresetMock).toHaveBeenCalledWith('NFL', 'PPR')
    expect(getFullLeaguePresetMock).not.toHaveBeenCalled()
    expect(payload.scoring.scoring_template_id).toBe('scoring-variant')
    expect(payload.rosterTemplate.templateId).toBe('roster-variant')
    expect(payload.leagueVariant).toBe('PPR')
  })

  it('keeps standard path when no variant is provided (soccer full sport)', async () => {
    leagueSportToSportTypeMock.mockReturnValue('SOCCER')

    const { loadLeagueCreationDefaults } = await import('@/lib/sport-defaults/LeagueCreationDefaultsLoader')
    const payload = await loadLeagueCreationDefaults('SOCCER', null)

    expect(resolveLeaguePresetMock).not.toHaveBeenCalled()
    expect(getFullLeaguePresetMock).toHaveBeenCalledWith('SOCCER', null)
    expect(payload.sport).toBe('SOCCER')
    expect(payload.roster.starter_slots).toEqual(expect.objectContaining({ GKP: 1, DEF: 4, MID: 4, FWD: 2 }))
  })
})
