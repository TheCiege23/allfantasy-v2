import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

type CreatePayload = {
  rosterSize?: number
  settings?: Record<string, unknown>
}

function buildScoringRules(sport: string, isNflIdp: boolean) {
  if (isNflIdp) {
    return [
      { statKey: 'passing_td', pointsValue: 4, multiplier: 1, enabled: true },
      { statKey: 'receptions', pointsValue: 1, multiplier: 1, enabled: true },
      { statKey: 'idp_sack', pointsValue: 4, multiplier: 1, enabled: true },
      { statKey: 'idp_solo_tackle', pointsValue: 1, multiplier: 1, enabled: true },
      { statKey: 'idp_blocked_kick', pointsValue: 2, multiplier: 1, enabled: false },
    ]
  }
  if (sport === 'NBA' || sport === 'NCAAB') {
    return [
      { statKey: 'points', pointsValue: 1, multiplier: 1, enabled: true },
      { statKey: 'rebounds', pointsValue: 1.2, multiplier: 1, enabled: true },
      { statKey: 'assists', pointsValue: 1.5, multiplier: 1, enabled: true },
      { statKey: 'turnovers', pointsValue: -1, multiplier: 1, enabled: true },
    ]
  }
  if (sport === 'SOCCER') {
    return [
      { statKey: 'goal', pointsValue: 6, multiplier: 1, enabled: true },
      { statKey: 'assist', pointsValue: 3, multiplier: 1, enabled: true },
      { statKey: 'clean_sheet', pointsValue: 4, multiplier: 1, enabled: true },
      { statKey: 'yellow_card', pointsValue: -1, multiplier: 1, enabled: true },
    ]
  }
  return [
    { statKey: 'passing_yards', pointsValue: 0.04, multiplier: 1, enabled: true },
    { statKey: 'passing_td', pointsValue: 4, multiplier: 1, enabled: true },
    { statKey: 'interception', pointsValue: -2, multiplier: 1, enabled: true },
    { statKey: 'rushing_td', pointsValue: 6, multiplier: 1, enabled: true },
  ]
}

function buildCreationPreset(sportRaw: string, variantRaw: string | null) {
  const sport = String(sportRaw || 'NFL').toUpperCase()
  const variant = (variantRaw ?? '').toUpperCase()
  const isNflIdp = sport === 'NFL' && (variant === 'IDP' || variant === 'DYNASTY_IDP')
  const regularSeasonBySport: Record<string, number> = {
    NFL: 18,
    NBA: 24,
    MLB: 26,
    NHL: 25,
    NCAAF: 15,
    NCAAB: 18,
    SOCCER: 38,
  }
  const regularSeasonLength = regularSeasonBySport[sport] ?? 18
  const playoffStart = sport === 'SOCCER' ? 39 : 15

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
    teamMetadata: {
      sport_type: sport,
      teams: [],
    },
    league: {
      default_league_name_pattern: `My ${sport} League`,
      default_team_count: 12,
      default_playoff_team_count: 6,
      default_regular_season_length: regularSeasonLength,
      default_matchup_unit: 'week',
      default_trade_deadline_logic: 'week_based',
    },
    roster: {
      starter_slots: isNflIdp
        ? { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DL: 1, DB: 1, IDP_FLEX: 1, K: 1 }
        : { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1 },
      bench_slots: isNflIdp ? 9 : 7,
      IR_slots: 2,
      taxi_slots: 0,
      devy_slots: 0,
      flex_definitions: [],
    },
    scoring: {
      scoring_template_id: isNflIdp ? 'default-NFL-IDP' : `default-${sport}-standard`,
      scoring_format: isNflIdp ? 'IDP' : 'STANDARD',
      category_type: 'points',
    },
    draft: {
      draft_type: 'snake',
      rounds_default: isNflIdp ? 18 : 15,
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
    rosterTemplate: {
      templateId: `template-${sport}-${variant || 'standard'}`,
      name: `${sport} Default`,
      formatType: isNflIdp ? 'IDP' : 'standard',
      slots: [],
    },
    scoringTemplate: {
      templateId: `scoring-${sport}-${variant || 'standard'}`,
      name: `${sport} Default Scoring`,
      formatType: isNflIdp ? 'IDP' : 'standard',
      rules: buildScoringRules(sport, isNflIdp),
    },
    defaultLeagueSettings: {
      playoff_team_count: 6,
      playoff_structure: {
        playoff_team_count: 6,
        playoff_weeks: 3,
        playoff_start_week: playoffStart,
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
      regular_season_length: regularSeasonLength,
      matchup_frequency: 'weekly',
      season_labeling: 'week',
      schedule_unit: 'week',
      waiver_mode: 'faab',
      trade_review_mode: 'commissioner',
      standings_tiebreakers: ['points_for', 'head_to_head', 'points_against'],
      injury_slot_behavior: 'ir_or_out',
      lock_time_behavior: 'first_game',
      schedule_cadence: 'weekly',
      schedule_head_to_head_behavior: 'head_to_head',
      schedule_lock_window_behavior: 'first_game_of_week',
      schedule_scoring_period_behavior: 'full_period',
      schedule_reschedule_handling: 'use_final_time',
      schedule_doubleheader_handling: 'all_games_count',
      schedule_playoff_transition_point: playoffStart,
      schedule_generation_strategy: 'round_robin',
    },
    scheduleTemplate: {
      templateId: `schedule-${sport}`,
      name: `${sport} default schedule`,
      formatType: 'DEFAULT',
      matchupType: 'head_to_head',
      regularSeasonWeeks: regularSeasonLength,
      playoffWeeks: sport === 'SOCCER' ? 0 : 3,
      byeWeekWindow: null,
      fantasyPlayoffDefault: sport === 'SOCCER' ? null : { startWeek: playoffStart, endWeek: playoffStart + 2 },
      lineupLockMode: 'first_game',
      scoringMode: 'points',
      regularSeasonStyle: 'weekly',
      playoffSupport: sport !== 'SOCCER',
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
      playoffsPeriod: sport === 'SOCCER' ? null : { label: 'Playoffs' },
      championshipPeriod: sport === 'SOCCER' ? null : { label: 'Championship' },
      internationalBreaksSupported: sport === 'SOCCER',
    },
    featureFlags: {
      sportType: sport,
      supportsBestBall: true,
      supportsSuperflex: sport === 'NFL',
      supportsTePremium: sport === 'NFL',
      supportsKickers: sport === 'NFL',
      supportsTeamDefense: sport === 'NFL' && !isNflIdp,
      supportsIdp: sport === 'NFL',
      supportsWeeklyLineups: true,
      supportsDailyLineups: sport === 'NBA' || sport === 'MLB' || sport === 'NHL',
      supportsBracketMode: true,
      supportsDevy: sport === 'NFL' || sport === 'NBA',
      supportsTaxi: true,
      supportsIr: true,
    },
    registry: {
      version: 'e2e',
      supported_sports: ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'],
    },
  }
}

async function mockCreationApis(page: Page, createdLeagueId: string, createRequests: CreatePayload[]) {
  let shouldReturnValidationError = true
  let templates: Array<Record<string, unknown>> = []

  const install = (options?: {
    shouldReturnValidationError?: boolean
    templates?: Array<Record<string, unknown>>
  }) => {
    shouldReturnValidationError = options?.shouldReturnValidationError ?? true
    templates = options?.templates ?? []
  }

  install()

  await page.route('**/api/leagues/templates', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `tmpl-${Date.now()}`,
          name: 'Audit Template',
          description: null,
        }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ templates }),
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
    const payload = route.request().postDataJSON() as CreatePayload
    createRequests.push(payload)
    if (shouldReturnValidationError) {
      shouldReturnValidationError = false
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Validation failed for audit test' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        league: {
          id: createdLeagueId,
          name: 'Unified Defaults Audit League',
          sport: 'NFL',
        },
      }),
    })
  })

  return {
    setOptions: install,
  }
}

test('audits wizard click flow and payload consistency end to end', async ({ page }) => {
  const createdLeagueId = `league-click-audit-${Date.now()}`
  const createRequests: CreatePayload[] = []
  const mock = await mockCreationApis(page, createdLeagueId, createRequests)
  mock.setOptions({ shouldReturnValidationError: true, templates: [] })

  await page.goto('/create-league?e2eAuth=1')
  await expect(page.getByRole('heading', { name: /create league/i })).toBeVisible()
  await expect(page.getByText(/step 1 of 10/i).first()).toBeVisible()

  // Creation mode selector: create -> import -> create.
  await page.getByRole('combobox', { name: /league creation mode/i }).click()
  await page.getByRole('option', { name: /import existing league/i }).click()
  await expect(page.locator('#import-source-input')).toBeVisible()
  await page.getByRole('combobox', { name: /league creation mode/i }).click()
  await page.getByRole('option', { name: /build new league/i }).click()
  await expect(page.getByText(/choose sport/i)).toBeVisible()

  // Sport selector interaction.
  await page.getByRole('button', { name: /soccer/i }).first().click()
  await page.getByRole('button', { name: /nfl football/i }).first().click()
  await page.getByRole('button', { name: /^next$/i }).click()
  await expect(page.getByText(/step 2 of 10/i).first()).toBeVisible()

  // League type selector.
  await page.getByRole('button', { name: /dynasty/i }).first().click()
  await page.getByRole('button', { name: /^next$/i }).click()

  // Draft type selector.
  await page.getByRole('button', { name: /^next$/i }).click()

  // Team setup step.
  await expect(page.getByRole('heading', { name: /team setup/i })).toBeVisible()
  await page.getByPlaceholder(/e\.g\. my league/i).fill('Unified Defaults Audit League')
  await page.getByRole('combobox', { name: /number of teams/i }).click()
  await page.getByRole('option', { name: /14 teams/i }).click()
  await page.getByRole('combobox', { name: /trade review mode/i }).click()
  await page.getByRole('option', { name: /league vote/i }).click()
  await page.getByRole('combobox', { name: /roster size/i }).click()
  await page.getByRole('option', { name: /22 players/i }).click()
  await page.getByRole('button', { name: /^next$/i }).click()

  // Scoring preset selector and preview.
  await page.getByRole('combobox', { name: /nfl preset/i }).click()
  await page.getByRole('option', { name: /^IDP$/i }).click()
  await expect(page.getByText(/preset summary/i)).toBeVisible()
  await expect(page.getByTestId('league-settings-preview-rule-idp_sack')).toBeVisible()
  await expect(page.getByTestId('league-settings-preview-rule-idp_blocked_kick')).toHaveCount(0)
  await page.getByTestId('league-settings-preview-show-disabled-scoring-rules').check()
  await expect(page.getByTestId('league-settings-preview-rule-idp_blocked_kick')).toBeVisible()
  await page.getByTestId('league-creation-advanced-scoring-toggle').click()

  // Advanced scoring rules: waiver, playoff, and schedule are edited inline.
  const waiverSection = page.getByTestId('league-creation-advanced-waiver')
  await waiverSection.getByLabel('Waiver type').selectOption('rolling')
  await waiverSection.getByLabel('Processing time (UTC)').fill('09:30')
  await waiverSection.getByLabel('Enable FAAB').check()
  await waiverSection.getByLabel('FAAB budget').fill('150')
  await waiverSection.getByLabel('Continuous waivers').check()

  const playoffSection = page.getByTestId('league-creation-advanced-playoff')
  await playoffSection.getByLabel('Playoff team count').fill('8')
  await playoffSection.getByLabel('Playoff weeks').fill('4')
  await playoffSection.getByLabel('Seeding rules').selectOption('division_winners_first')

  const scheduleSection = page.getByTestId('league-creation-advanced-schedule')
  await scheduleSection.getByLabel('Schedule unit').selectOption('round')
  await scheduleSection.getByLabel('Regular season length').fill('20')
  await scheduleSection.getByLabel('Matchup cadence').selectOption('round')
  await scheduleSection.getByLabel('Schedule generation strategy').selectOption('division_based')

  await page.getByRole('button', { name: /^next$/i }).click()

  // Draft settings.
  await page.getByRole('combobox', { name: /draft rounds/i }).click()
  await page.getByRole('option', { name: /^20$/i }).click()
  await page.getByRole('combobox', { name: /draft timer per pick/i }).click()
  await page.getByRole('option', { name: /60 seconds/i }).click()
  await page.getByRole('button', { name: /advanced options/i }).click()
  await page.getByLabel(/third round reversal/i).check()
  await page.getByRole('button', { name: /^next$/i }).click()

  // AI + automation + privacy.
  await expect(page.getByRole('heading', { name: /ai settings/i })).toBeVisible()
  await page.getByLabel(/ai adp/i).check()
  await page.getByRole('button', { name: /previous step/i }).click()
  await expect(page.getByRole('heading', { name: /draft settings/i })).toBeVisible()
  await page.getByRole('button', { name: /^next$/i }).click()
  await expect(page.getByRole('heading', { name: /ai settings/i })).toBeVisible()
  await expect(page.getByLabel(/ai adp/i)).toBeChecked()
  await page.getByRole('button', { name: /^next$/i }).click()
  await page.getByLabel(/slow draft reminders/i).uncheck()
  await page.getByRole('button', { name: /^next$/i }).click()
  await page.getByRole('combobox', { name: /visibility/i }).click()
  await page.getByRole('option', { name: /public/i }).click()
  await page.getByLabel(/allow invite link/i).uncheck()
  await page.getByRole('button', { name: /^next$/i }).click()

  // Review preview and template action.
  await expect(page.getByText(/review & create/i)).toBeVisible()
  await expect(page.getByText(/roster size/i)).toBeVisible()
  await expect(page.getByText(/22/i)).toBeVisible()
  await expect(page.getByText(/visibility/i)).toBeVisible()
  await expect(page.getByText(/public/i)).toBeVisible()
  await expect(page.getByText(/invite link/i)).toBeVisible()
  await expect(page.getByText(/disabled/i)).toBeVisible()

  await page.getByRole('button', { name: /save as template/i }).click()
  await expect(page.getByPlaceholder(/template name/i)).toBeVisible()
  await page.getByRole('button', { name: /^cancel$/i }).click()

  // Validation error display.
  await page.getByRole('button', { name: /create league/i }).click()
  await expect(page.getByText(/validation failed for audit test/i)).toBeVisible()

  // Success path + redirect.
  await page.getByRole('button', { name: /create league/i }).click()
  await page.waitForURL(`**/league/${createdLeagueId}`)
  await expect(page).toHaveURL(new RegExp(`/league/${createdLeagueId}$`))

  expect(createRequests.length).toBeGreaterThan(1)
  const latest = createRequests[createRequests.length - 1] ?? {}
  const settings = latest.settings ?? {}
  expect((latest as any).leagueVariant).toBe('DYNASTY_IDP')
  expect(latest.rosterSize).toBe(22)
  expect(settings).toMatchObject({
    roster_size: 22,
    draft_rounds: 20,
    draft_timer_seconds: 60,
    draft_third_round_reversal: true,
    waiver_type: 'faab',
    faab_budget: 150,
    waiver_processing_time_utc: '09:30',
    waiver_continuous_waivers_behavior: true,
    trade_review_mode: 'league_vote',
    playoff_team_count: 8,
    schedule_unit: 'round',
    regular_season_length: 20,
    schedule_cadence: 'round',
    schedule_generation_strategy: 'division_based',
    ai_adp_enabled: true,
    slow_draft_reminders_enabled: false,
    visibility: 'public',
    allow_invite_link: false,
  })
})

test('applies selected template settings snapshot into create payload', async ({ page }) => {
  const createdLeagueId = `league-template-audit-${Date.now()}`
  const createRequests: CreatePayload[] = []
  const mock = await mockCreationApis(page, createdLeagueId, createRequests)
  mock.setOptions({
    shouldReturnValidationError: false,
    templates: [
      {
        id: 'template-snapshot-1',
        name: 'Dynasty Superflex Snapshot',
        description: 'Carries full settings snapshot',
        payload: {
          sport: 'NFL',
          leagueType: 'dynasty',
          draftType: 'snake',
          name: 'Dynasty Superflex Snapshot',
          teamCount: 12,
          rosterSize: 24,
          scoringPreset: 'DYNASTY',
          leagueVariant: 'DYNASTY',
          draftSettings: {
            rounds: 18,
            timerSeconds: 75,
            thirdRoundReversal: true,
            auctionBudgetPerTeam: 200,
            keeperMaxKeepers: 3,
            devyRounds: [],
            c2cCollegeRounds: [],
          },
          waiverSettings: {
            waiverType: 'faab',
            processingDays: [2],
            processingTimeUtc: '10:00',
            faabEnabled: true,
            faabBudget: 100,
            faabResetRules: 'never',
            claimPriorityBehavior: 'faab_highest',
            continuousWaiversBehavior: false,
            freeAgentUnlockBehavior: 'after_waiver_run',
            gameLockBehavior: 'game_time',
            dropLockBehavior: 'lock_with_game',
            sameDayAddDropRules: 'allow_if_not_played',
            maxClaimsPerPeriod: 10,
          },
          playoffSettings: {
            playoffTeamCount: 6,
            playoffWeeks: 3,
            playoffStartWeek: 15,
            seedingRules: 'standard_standings',
            tiebreakerRules: ['points_for'],
            byeRules: 'top_two_seeds_bye',
            firstRoundByes: 2,
            matchupLength: 1,
            totalRounds: 3,
            consolationBracketEnabled: true,
            thirdPlaceGameEnabled: true,
            toiletBowlEnabled: false,
            championshipLength: 1,
            consolationPlaysFor: 'pick',
            reseedBehavior: 'fixed_bracket',
          },
          scheduleSettings: {
            scheduleUnit: 'week',
            regularSeasonLength: 18,
            matchupFrequency: 'weekly',
            matchupCadence: 'weekly',
            headToHeadOrPointsBehavior: 'head_to_head',
            lockTimeBehavior: 'first_game',
            lockWindowBehavior: 'first_game_of_week',
            scoringPeriodBehavior: 'full_period',
            rescheduleHandling: 'use_final_time',
            doubleheaderOrMultiGameHandling: 'all_games_count',
            playoffTransitionPoint: 15,
            scheduleGenerationStrategy: 'round_robin',
          },
          aiSettings: {
            aiAdpEnabled: true,
            orphanTeamAiManagerEnabled: true,
            draftHelperEnabled: true,
          },
          automationSettings: {
            draftNotificationsEnabled: true,
            autopickFromQueueEnabled: true,
            slowDraftRemindersEnabled: true,
          },
          privacySettings: {
            visibility: 'private',
            allowInviteLink: true,
          },
          templateSettingsOverrides: {
            ai_feature_trade_analyzer_enabled: false,
            ai_feature_player_comparison_enabled: false,
            ai_feature_matchup_simulator_enabled: false,
            ai_feature_fantasy_coach_enabled: false,
            ai_feature_ai_chat_chimmy_enabled: false,
            draft_commissioner_pause_controls_enabled: false,
            draft_auction_auto_nomination_enabled: true,
            draft_timer_mode: 'overnight_pause',
            league_allow_email_invite: true,
            league_allow_username_invite: true,
          },
        },
      },
    ],
  })

  await page.goto('/create-league?e2eAuth=1&template=template-snapshot-1')
  await expect(page.getByRole('heading', { name: /create league/i })).toBeVisible()

  for (let i = 0; i < 9; i += 1) {
    await page.getByRole('button', { name: /^next$/i }).click()
  }

  await expect(page.getByText(/review & create/i)).toBeVisible()
  await page.getByRole('button', { name: /create league/i }).click()
  await page.waitForURL(`**/league/${createdLeagueId}`)

  const latest = createRequests[createRequests.length - 1] ?? {}
  const settings = latest.settings ?? {}
  expect(settings).toMatchObject({
    ai_feature_trade_analyzer_enabled: false,
    ai_feature_player_comparison_enabled: false,
    ai_feature_matchup_simulator_enabled: false,
    ai_feature_fantasy_coach_enabled: false,
    ai_feature_ai_chat_chimmy_enabled: false,
    draft_commissioner_pause_controls_enabled: false,
    draft_auction_auto_nomination_enabled: true,
    draft_timer_mode: 'overnight_pause',
    league_allow_email_invite: true,
    league_allow_username_invite: true,
  })
})

test('mobile viewport click audit validates and creates league', async ({ page }) => {
  const createdLeagueId = `league-mobile-audit-${Date.now()}`
  const createRequests: CreatePayload[] = []
  const mock = await mockCreationApis(page, createdLeagueId, createRequests)
  mock.setOptions({ shouldReturnValidationError: true, templates: [] })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/create-league?e2eAuth=1')
  await expect(page.getByRole('heading', { name: /create league/i })).toBeVisible()
  await expect(page.getByText(/step 1 of 10/i).first()).toBeVisible()

  await page.getByRole('button', { name: /^next$/i }).click()
  await page.getByRole('button', { name: /^next$/i }).click()
  await page.getByRole('button', { name: /^next$/i }).click()
  await page.getByRole('button', { name: /^next$/i }).click()
  await page.getByRole('button', { name: /^next$/i }).click()
  await page.getByRole('button', { name: /^next$/i }).click()

  await expect(page.getByRole('heading', { name: /ai settings/i })).toBeVisible()
  await page.getByLabel(/ai adp/i).check()
  await page.getByRole('button', { name: /^next$/i }).click()

  await expect(page.getByRole('heading', { name: /automation/i })).toBeVisible()
  await page.getByLabel(/slow draft reminders/i).uncheck()
  await page.getByRole('button', { name: /^next$/i }).click()

  await expect(page.getByRole('heading', { name: /privacy/i })).toBeVisible()
  await page.getByRole('button', { name: /previous step/i }).click()
  await expect(page.getByRole('heading', { name: /automation/i })).toBeVisible()
  await expect(page.getByLabel(/slow draft reminders/i)).not.toBeChecked()
  await page.getByRole('button', { name: /^next$/i }).click()
  await page.getByRole('button', { name: /^next$/i }).click()

  await expect(page.getByText(/review & create/i)).toBeVisible()
  await page.getByRole('button', { name: /create league/i }).click()
  await expect(page.getByText(/validation failed for audit test/i)).toBeVisible()
  await page.getByRole('button', { name: /create league/i }).click()
  await page.waitForURL(`**/league/${createdLeagueId}`)

  const latest = createRequests[createRequests.length - 1] ?? {}
  const settings = latest.settings ?? {}
  expect(settings).toMatchObject({
    ai_adp_enabled: true,
    slow_draft_reminders_enabled: false,
  })
})
