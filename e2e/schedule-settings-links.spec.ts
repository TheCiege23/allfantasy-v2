import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

async function mockScheduleReadApis(page: Page, leagueId: string) {
  const config = {
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
    variant: 'STANDARD',
  }

  await page.route(`**/api/app/league/${leagueId}/schedule/config`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(config),
    })
  })

  await page.route(`**/api/commissioner/leagues/${leagueId}/schedule?type=settings`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(config),
    })
  })
}

test.describe('@schedule schedule settings quick links', () => {
  test('matchups and standings links are present and correctly wired', async ({ page }) => {
    const leagueId = `e2e-schedule-links-${Date.now()}`
    await mockScheduleReadApis(page, leagueId)

    await page.goto(`/e2e/schedule-settings?leagueId=${leagueId}`)
    await expect(page.getByRole('heading', { name: 'Schedule Settings', exact: true })).toBeVisible()

    const matchupsLink = page.getByRole('link', { name: /open matchups \/ schedule/i })
    await expect(matchupsLink).toBeVisible()
    await expect(matchupsLink).toHaveAttribute('href', `/league/${leagueId}?tab=Matchups`)

    const standingsLink = page.getByRole('link', { name: /open standings \/ playoffs/i })
    await expect(standingsLink).toBeVisible()
    await expect(standingsLink).toHaveAttribute(
      'href',
      new RegExp(`^/league/${leagueId}\\?tab=Standings%20%2F%20Playoffs$`)
    )
  })
})
