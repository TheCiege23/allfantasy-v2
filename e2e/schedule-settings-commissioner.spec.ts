import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

async function mockScheduleSettingsApi(page: Page, leagueId: string) {
  let persisted: Record<string, unknown> = {
    schedule_unit: 'week',
    regular_season_length: 18,
    matchup_frequency: 'weekly',
    matchup_cadence: 'weekly',
    schedule_cadence: 'weekly',
    schedule_generation_strategy: 'round_robin',
    playoff_transition_point: 15,
    head_to_head_behavior: 'head_to_head',
    lock_time_behavior: 'first_game',
    lock_window_behavior: 'first_game_of_week',
    scoring_period_behavior: 'full_period',
    reschedule_handling: 'use_final_time',
    doubleheader_handling: 'all_games_count',
    sport: 'NFL',
    variant: 'IDP',
  }

  const capturedPuts: Array<Record<string, unknown>> = []

  await page.route(`**/api/app/league/${leagueId}/schedule/config`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(persisted),
    })
  })

  await page.route(`**/api/commissioner/leagues/${leagueId}/schedule?type=settings`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(persisted),
    })
  })

  await page.route(`**/api/commissioner/leagues/${leagueId}/schedule`, async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.fallback()
      return
    }
    const patch = route.request().postDataJSON() as Record<string, unknown>
    capturedPuts.push(patch)
    persisted = {
      ...persisted,
      schedule_unit: patch.scheduleUnit ?? persisted.schedule_unit,
      regular_season_length: patch.regularSeasonLength ?? persisted.regular_season_length,
      matchup_frequency: patch.matchupFrequency ?? persisted.matchup_frequency,
      matchup_cadence: patch.matchupCadence ?? persisted.matchup_cadence,
      schedule_cadence: patch.matchupCadence ?? persisted.schedule_cadence,
      schedule_generation_strategy:
        patch.scheduleGenerationStrategy ?? persisted.schedule_generation_strategy,
      playoff_transition_point: patch.playoffTransitionPoint ?? persisted.playoff_transition_point,
      head_to_head_behavior: patch.headToHeadBehavior ?? persisted.head_to_head_behavior,
      lock_time_behavior: patch.lockTimeBehavior ?? persisted.lock_time_behavior,
      lock_window_behavior: patch.lockWindowBehavior ?? persisted.lock_window_behavior,
      scoring_period_behavior: patch.scoringPeriodBehavior ?? persisted.scoring_period_behavior,
      reschedule_handling: patch.rescheduleHandling ?? persisted.reschedule_handling,
      doubleheader_handling: patch.doubleheaderHandling ?? persisted.doubleheader_handling,
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(persisted),
    })
  })

  return {
    getPuts: () => capturedPuts,
  }
}

test.describe('@schedule commissioner schedule settings panel', () => {
  test('commissioner can edit and save schedule overrides', async ({ page }) => {
    const leagueId = `e2e-schedule-${Date.now()}`
    const mocks = await mockScheduleSettingsApi(page, leagueId)

    await page.goto(`/e2e/schedule-settings?leagueId=${leagueId}`)
    await expect(page.getByRole('heading', { name: /e2e schedule settings harness/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Schedule Settings', exact: true })).toBeVisible()

    await page.getByTestId('schedule-settings-edit-toggle').click()
    await page.getByLabel('Schedule unit').selectOption('round')
    await page.getByLabel('Regular season length').fill('20')
    await page.getByLabel('Matchup cadence').selectOption('round')
    await page.getByLabel('Head-to-head / points behavior').selectOption('both')
    await page.getByLabel('Lock time behavior').selectOption('manual')
    await page.getByLabel('Scoring period behavior').selectOption('daily_rolling')
    await page.getByLabel('Reschedule handling').selectOption('use_original_time')
    await page.getByLabel('Playoff transition point').fill('17')
    await page.getByLabel('Schedule generation strategy').selectOption('division_based')
    await page.getByTestId('schedule-settings-save').click()

    const puts = mocks.getPuts()
    expect(puts.length).toBeGreaterThan(0)
    const latest = puts[puts.length - 1]
    expect(latest.scheduleUnit).toBe('round')
    expect(latest.regularSeasonLength).toBe(20)
    expect(latest.matchupCadence).toBe('round')
    expect(latest.headToHeadBehavior).toBe('both')
    expect(latest.lockTimeBehavior).toBe('manual')
    expect(latest.scoringPeriodBehavior).toBe('daily_rolling')
    expect(latest.rescheduleHandling).toBe('use_original_time')
    expect(latest.playoffTransitionPoint).toBe(17)
    expect(latest.scheduleGenerationStrategy).toBe('division_based')

    await expect(page.getByText(/^round$/).first()).toBeVisible()
    await expect(page.getByText(/^20$/).first()).toBeVisible()
  })
})
