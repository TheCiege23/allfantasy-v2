import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

function buildCreationPreset(sportRaw: string, variantRaw: string | null) {
  const sport = String(sportRaw || 'NFL').toUpperCase()
  return {
    sport,
    leagueVariant: variantRaw ?? null,
    metadata: {
      display_name: sport,
      short_name: sport,
      icon: 'trophy',
      logo_strategy: 'sport_default',
      default_season_type: 'regular',
      player_pool_source: 'sports_player',
      display_labels: {},
    },
    teamMetadata: { sport_type: sport, teams: [] },
    league: {
      default_league_name_pattern: `My ${sport} League`,
      default_team_count: 12,
      default_playoff_team_count: 6,
      default_regular_season_length: 18,
      default_matchup_unit: 'week',
      default_trade_deadline_logic: 'week_based',
    },
    roster: { starter_slots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 }, bench_slots: 7, IR_slots: 2, taxi_slots: 0, devy_slots: 0, flex_definitions: [] },
    scoring: { scoring_template_id: `default-${sport}-standard`, scoring_format: 'STANDARD', category_type: 'points' },
    draft: {
      draft_type: 'snake',
      rounds_default: 15,
      timer_seconds_default: 90,
      pick_order_rules: 'snake',
      snake_or_linear_behavior: 'snake',
      third_round_reversal: false,
      autopick_behavior: 'queue-first',
      queue_size_limit: 50,
      pre_draft_ranking_source: 'adp',
      roster_fill_order: 'starter_first',
      position_filter_behavior: 'by_eligibility',
    },
    waiver: {
      waiver_type: 'faab',
      processing_days: [2],
      FAAB_budget_default: 100,
      processing_time_utc: '10:00',
      faab_enabled: true,
      faab_reset_rules: 'never',
      claim_priority_behavior: 'faab_highest',
      continuous_waivers_behavior: false,
      free_agent_unlock_behavior: 'after_waiver_run',
      game_lock_behavior: 'game_time',
      drop_lock_behavior: 'lock_with_game',
      same_day_add_drop_rules: 'allow_if_not_played',
      max_claims_per_period: 10,
    },
    defaultLeagueSettings: {
      playoff_team_count: 6,
      playoff_structure: {
        playoff_team_count: 6,
        playoff_weeks: 3,
        playoff_start_week: 15,
        first_round_byes: 2,
        seeding_rules: 'standard_standings',
        tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
        bye_rules: 'top_two_seeds_bye',
        matchup_length: 1,
        total_rounds: 3,
        consolation_bracket_enabled: true,
        third_place_game_enabled: true,
        toilet_bowl_enabled: false,
        championship_length: 1,
        consolation_plays_for: 'pick',
        reseed_behavior: 'fixed_bracket',
      },
      regular_season_length: 18,
      matchup_frequency: 'weekly',
      schedule_unit: 'week',
      trade_review_mode: 'commissioner',
      schedule_cadence: 'weekly',
      schedule_head_to_head_behavior: 'head_to_head',
      lock_time_behavior: 'first_game',
      schedule_lock_window_behavior: 'first_game_of_week',
      schedule_scoring_period_behavior: 'full_period',
      schedule_reschedule_handling: 'use_final_time',
      schedule_doubleheader_handling: 'all_games_count',
      schedule_playoff_transition_point: 15,
      schedule_generation_strategy: 'round_robin',
    },
    rosterTemplate: { templateId: `template-${sport}`, name: `${sport} Default`, formatType: 'standard', slots: [] },
    scoringTemplate: {
      templateId: `scoring-${sport}-standard`,
      name: `${sport} Default Scoring`,
      formatType: 'standard',
      rules: [{ statKey: 'passing_td', pointsValue: 4, multiplier: 1, enabled: true }],
    },
    scheduleTemplate: {
      templateId: `schedule-${sport}`,
      name: `${sport} default schedule`,
      formatType: 'DEFAULT',
      matchupType: 'head_to_head',
      regularSeasonWeeks: 18,
      playoffWeeks: 3,
      byeWeekWindow: null,
      fantasyPlayoffDefault: { startWeek: 15, endWeek: 17 },
      lineupLockMode: 'first_game',
      scoringMode: 'points',
      regularSeasonStyle: 'weekly',
      playoffSupport: true,
      bracketModeSupported: true,
      marchMadnessMode: false,
      bowlPlayoffMetadata: false,
    },
    seasonCalendar: {
      calendarId: `calendar-${sport}`,
      name: `${sport} Calendar`,
      formatType: 'DEFAULT',
      preseasonPeriod: null,
      regularSeasonPeriod: { label: 'Regular season' },
      playoffsPeriod: { label: 'Playoffs' },
      championshipPeriod: { label: 'Championship' },
      internationalBreaksSupported: false,
    },
    featureFlags: { sportType: sport },
    registry: { version: 'e2e', supported_sports: ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'] },
  }
}

test.describe('@schedule league creation schedule step', () => {
  test('sends schedule defaults from wizard into create payload', async ({ page }) => {
    const createdLeagueId = `league-schedule-e2e-${Date.now()}`
    let capturedSettings: Record<string, unknown> | null = null

    await page.route('**/api/leagues/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ templates: [] }),
      })
    })

    await page.route('**/api/sport-defaults?**', async (route) => {
      const url = new URL(route.request().url())
      const sport = url.searchParams.get('sport') ?? 'NFL'
      const variant = url.searchParams.get('variant')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildCreationPreset(sport, variant)),
      })
    })

    await page.route('**/api/league/create', async (route) => {
      const payload = route.request().postDataJSON() as { settings?: Record<string, unknown> }
      capturedSettings = payload.settings ?? null
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          league: {
            id: createdLeagueId,
            name: 'NFL League',
            sport: 'NFL',
          },
        }),
      })
    })

    await page.goto('/create-league?e2eAuth=1')
    await expect(page.getByRole('heading', { name: /create league/i })).toBeVisible()

    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: /^next$/i }).click()
    }

    await page.getByTestId('league-creation-advanced-scoring-toggle').click()
    const scheduleSection = page.getByTestId('league-creation-advanced-schedule')
    await expect(scheduleSection.getByText(/schedule settings/i)).toBeVisible()

    await scheduleSection.getByLabel('Schedule unit').selectOption('round')
    await scheduleSection.getByLabel('Regular season length').fill('20')
    await scheduleSection.getByLabel('Matchup frequency').selectOption('round')
    await scheduleSection.getByLabel('Matchup cadence').selectOption('round')
    await scheduleSection.getByLabel('Head-to-head / points behavior').selectOption('both')
    await scheduleSection.getByLabel('Lock time behavior').selectOption('manual')
    await scheduleSection.getByLabel('Lock window behavior').selectOption('manual')
    await scheduleSection.getByLabel('Scoring period behavior').selectOption('daily_rolling')
    await scheduleSection.getByLabel('Reschedule handling').selectOption('use_original_time')
    await scheduleSection.getByLabel('Doubleheader / multi-game handling').selectOption('single_score_per_slot')
    await scheduleSection.getByLabel('Playoff transition point').fill('17')
    await scheduleSection.getByLabel('Schedule generation strategy').selectOption('division_based')
    await page.getByRole('button', { name: /^next$/i }).click()

    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: /^next$/i }).click()
    }
    await expect(page.getByRole('button', { name: /create league/i })).toBeVisible()

    await page.getByRole('button', { name: /create league/i }).click()
    await page.waitForURL(`**/app/league/${createdLeagueId}`)

    expect(capturedSettings).toBeTruthy()
    expect(capturedSettings).toMatchObject({
      schedule_unit: 'round',
      regular_season_length: 20,
      matchup_frequency: 'round',
      schedule_cadence: 'round',
      schedule_head_to_head_behavior: 'both',
      lock_time_behavior: 'manual',
      schedule_lock_window_behavior: 'manual',
      schedule_scoring_period_behavior: 'daily_rolling',
      schedule_reschedule_handling: 'use_original_time',
      schedule_doubleheader_handling: 'single_score_per_slot',
      schedule_playoff_transition_point: 17,
      schedule_generation_strategy: 'division_based',
    })
  })
})
