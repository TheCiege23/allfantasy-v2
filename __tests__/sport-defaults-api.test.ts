import { beforeEach, describe, expect, it, vi } from 'vitest'

type LeagueSport = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB'

const getCreationPayloadMock = vi.fn()
const getSportFeatureFlagsMock = vi.fn()

vi.mock('@/lib/league-defaults-orchestrator', () => ({
  getCreationPayload: getCreationPayloadMock,
}))

vi.mock('@/lib/sport-defaults/SportFeatureFlagsService', () => ({
  getSportFeatureFlags: getSportFeatureFlagsMock,
}))

function makePayload(sport: LeagueSport) {
  const lengths: Record<LeagueSport, number> = {
    NFL: 18,
    NBA: 24,
    MLB: 26,
    NHL: 25,
    NCAAF: 15,
    NCAAB: 18,
  }

  return {
    sport,
    metadata: {
      display_name: sport,
      short_name: sport,
      icon: 'x',
      logo_strategy: 'sleeper',
    },
    league: {
      default_league_name_pattern: `My ${sport} League`,
      default_team_count: 12,
      default_playoff_team_count: 6,
      default_regular_season_length: lengths[sport],
      default_matchup_unit: 'week',
      default_trade_deadline_logic: 'week_based',
    },
    teamMetadata: { sport_type: sport, teams: [] },
    roster: {
      starter_slots: { QB: 1 },
      bench_slots: 5,
      IR_slots: 1,
      taxi_slots: 0,
      devy_slots: 0,
      flex_definitions: [],
    },
    scoring: {
      scoring_template_id: `default-${sport}-standard`,
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
      processing_days: [1],
      FAAB_budget_default: 100,
    },
    rosterTemplate: {
      templateId: `default-${sport}-standard`,
      name: `${sport} Roster`,
      formatType: 'standard',
      slots: [],
    },
    scoringTemplate: {
      templateId: `default-${sport}-standard`,
      name: `${sport} Scoring`,
      formatType: 'standard',
      rules: [{ statKey: 'points', pointsValue: 1, multiplier: 1, enabled: true }],
    },
    defaultLeagueSettings: {
      playoff_team_count: 6,
      playoff_structure: { bracket_type: 'single_elimination' },
      regular_season_length: lengths[sport],
      matchup_frequency: 'weekly',
      season_labeling: 'week',
      schedule_unit: 'week',
      waiver_mode: 'faab',
      trade_review_mode: 'commissioner',
      standings_tiebreakers: ['points_for', 'head_to_head'],
      injury_slot_behavior: sport === 'MLB' ? 'ir_only' : 'ir_or_out',
      lock_time_behavior: sport === 'MLB' ? 'slate_lock' : 'first_game',
    },
    scheduleTemplate: {
      templateId: `sched-${sport}`,
      name: `${sport} Schedule`,
      formatType: 'DEFAULT',
      matchupType: 'head_to_head',
      regularSeasonWeeks: lengths[sport],
      playoffWeeks: 3,
      byeWeekWindow: null,
      fantasyPlayoffDefault: null,
      lineupLockMode: 'first_game',
      scoringMode: 'points',
      regularSeasonStyle: 'standard',
      playoffSupport: true,
      bracketModeSupported: true,
      marchMadnessMode: false,
      bowlPlayoffMetadata: false,
    },
    seasonCalendar: {
      calendarId: `cal-${sport}`,
      name: `${sport} Calendar`,
      formatType: 'DEFAULT',
      preseasonPeriod: null,
      regularSeasonPeriod: { label: 'Regular' },
      playoffsPeriod: { label: 'Playoffs' },
      championshipPeriod: null,
      internationalBreaksSupported: false,
    },
  }
}

describe('GET /api/sport-defaults?load=creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCreationPayloadMock.mockImplementation(async (sport: LeagueSport) => makePayload(sport))
    getSportFeatureFlagsMock.mockResolvedValue({
      sportType: 'NFL',
      supportsBestBall: true,
      supportsSuperflex: true,
      supportsTePremium: true,
      supportsKickers: true,
      supportsTeamDefense: true,
      supportsIdp: true,
      supportsWeeklyLineups: true,
      supportsDailyLineups: false,
      supportsBracketMode: true,
      supportsDevy: true,
      supportsTaxi: true,
      supportsIr: true,
    })
  })

  it('returns creation payload with scoringTemplate and defaultLeagueSettings consistent per sport', async () => {
    const { GET } = await import('@/app/api/sport-defaults/route')
    const sports: LeagueSport[] = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB']

    for (const sport of sports) {
      const req = new Request(`http://localhost/api/sport-defaults?sport=${sport}&load=creation`)
      const res = await GET(req as any)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.sport).toBe(sport)
      expect(body.scoringTemplate).toBeTruthy()
      expect(body.defaultLeagueSettings).toBeTruthy()

      expect(body.scoringTemplate.templateId).toBe(body.scoring.scoring_template_id)
      expect(body.defaultLeagueSettings.regular_season_length).toBe(
        body.league.default_regular_season_length
      )
      expect(body.defaultLeagueSettings.playoff_team_count).toBe(
        body.league.default_playoff_team_count
      )
      expect(Array.isArray(body.defaultLeagueSettings.standings_tiebreakers)).toBe(true)
    }

    expect(getCreationPayloadMock).toHaveBeenCalledTimes(sports.length)
  })
})
