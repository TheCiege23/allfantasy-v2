import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

async function mockPlayoffReadApis(page: Page, leagueId: string) {
  const config = {
    playoff_team_count: 6,
    playoff_weeks: 3,
    playoff_start_week: 15,
    playoff_start_point: 15,
    first_round_byes: 2,
    bracket_type: 'single_elimination',
    matchup_length: 1,
    total_rounds: 3,
    consolation_bracket_enabled: true,
    third_place_game_enabled: true,
    toilet_bowl_enabled: false,
    championship_length: 1,
    consolation_plays_for: 'pick',
    seeding_rules: 'standard_standings',
    tiebreaker_rules: ['points_for', 'head_to_head', 'points_against'],
    bye_rules: 'top_two_seeds_bye',
    reseed_behavior: 'fixed_bracket',
    standings_tiebreakers: ['points_for', 'head_to_head', 'points_against'],
    sport: 'NFL',
    variant: 'STANDARD',
  }

  await page.route(`**/api/app/league/${leagueId}/playoff/config`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(config),
    })
  })

  await page.route(`**/api/commissioner/leagues/${leagueId}/playoffs?type=settings`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(config),
    })
  })
}

test.describe('@playoff playoff settings quick links', () => {
  test('standings and bracket links are present and correctly wired', async ({ page }) => {
    const leagueId = `e2e-links-${Date.now()}`
    await mockPlayoffReadApis(page, leagueId)

    await page.goto(`/e2e/playoff-settings?leagueId=${leagueId}`)
    await expect(page.getByRole('heading', { name: 'Playoff Settings', exact: true })).toBeVisible()

    const standingsLink = page.getByRole('link', { name: /open standings \/ playoffs/i })
    await expect(standingsLink).toBeVisible()
    await expect(standingsLink).toHaveAttribute(
      'href',
      new RegExp(`^/app/league/${leagueId}\\?tab=Standings%20%2F%20Playoffs$`)
    )

    const bracketLink = page.getByRole('link', { name: /open bracket/i })
    await expect(bracketLink).toBeVisible()
    await expect(bracketLink).toHaveAttribute('href', `/brackets/leagues/${leagueId}`)
  })
})
