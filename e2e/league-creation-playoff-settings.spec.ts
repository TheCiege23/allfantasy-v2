import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@playoff league creation playoff step', () => {
  test('sends playoff defaults from wizard into create payload', async ({ page }) => {
    const createdLeagueId = `league-playoff-e2e-${Date.now()}`
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

    for (let i = 0; i < 7; i += 1) {
      await page.getByRole('button', { name: /^next$/i }).click()
    }

    await expect(page.getByText(/playoff settings/i)).toBeVisible()
    await page.getByLabel('Playoff team count').fill('8')
    await page.getByLabel('Playoff weeks').fill('3')
    await page.getByLabel('Playoff start week').fill('14')
    await page.getByLabel('First-round byes').fill('0')
    await page.getByLabel('Seeding rules').selectOption('division_winners_first')
    await page.getByLabel('Bye rules').selectOption('')
    await page.getByLabel('Reseed behavior').selectOption('reseed_after_round')
    await page.getByLabel('Consolation plays for').selectOption('cash')
    await page.getByLabel('Matchup length').fill('1')
    await page.getByLabel('Total rounds').fill('3')
    await page.getByLabel('Championship length').fill('1')
    await page.getByLabel('Consolation bracket').uncheck()
    await page.getByLabel('Third-place game').check()
    await page.getByLabel('Toilet bowl').check()
    await page.getByLabel('Division record').check()

    for (let i = 0; i < 5; i += 1) {
      await page.getByRole('button', { name: /^next$/i }).click()
    }
    await expect(page.getByRole('button', { name: /create league/i })).toBeVisible()

    await page.getByRole('button', { name: /create league/i }).click()
    await page.waitForURL(`**/app/league/${createdLeagueId}`)

    expect(capturedSettings).toBeTruthy()
    expect(capturedSettings).toMatchObject({
      playoff_team_count: 8,
      standings_tiebreakers: expect.arrayContaining(['division_record']),
      playoff_structure: {
        playoff_team_count: 8,
        playoff_weeks: 3,
        playoff_start_week: 14,
        playoff_start_point: 14,
        first_round_byes: 0,
        seeding_rules: 'division_winners_first',
        bye_rules: null,
        matchup_length: 1,
        total_rounds: 3,
        consolation_bracket_enabled: false,
        third_place_game_enabled: true,
        toilet_bowl_enabled: true,
        championship_length: 1,
        consolation_plays_for: 'cash',
        reseed_behavior: 'reseed_after_round',
      },
    })
  })
})
