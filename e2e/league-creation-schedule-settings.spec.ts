import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

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

    for (let i = 0; i < 8; i += 1) {
      await page.getByRole('button', { name: /^next$/i }).click()
    }

    await expect(page.getByText(/schedule settings/i)).toBeVisible()

    await page.getByLabel('Schedule unit').selectOption('round')
    await page.getByLabel('Regular season length').fill('20')
    await page.getByLabel('Matchup frequency').selectOption('round')
    await page.getByLabel('Matchup cadence').selectOption('round')
    await page.getByLabel('Head-to-head / points behavior').selectOption('both')
    await page.getByLabel('Lock time behavior').selectOption('manual')
    await page.getByLabel('Lock window behavior').selectOption('manual')
    await page.getByLabel('Scoring period behavior').selectOption('daily_rolling')
    await page.getByLabel('Reschedule handling').selectOption('use_original_time')
    await page.getByLabel('Doubleheader / multi-game handling').selectOption('single_score_per_slot')
    await page.getByLabel('Playoff transition point').fill('17')
    await page.getByLabel('Schedule generation strategy').selectOption('division_based')

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
