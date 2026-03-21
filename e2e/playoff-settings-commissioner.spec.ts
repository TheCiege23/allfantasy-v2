import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

async function mockPlayoffSettingsApi(page: Page, leagueId: string) {
  let persisted: Record<string, unknown> = {
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
    variant: 'IDP',
  }

  const capturedPuts: Array<Record<string, unknown>> = []

  await page.route(`**/api/app/league/${leagueId}/playoff/config`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(persisted),
    })
  })

  await page.route(`**/api/commissioner/leagues/${leagueId}/playoffs?type=settings`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(persisted),
    })
  })

  await page.route(`**/api/commissioner/leagues/${leagueId}/playoffs**`, async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.fallback()
      return
    }
    const patch = route.request().postDataJSON() as Record<string, unknown>
    capturedPuts.push(patch)
    persisted = {
      ...persisted,
      playoff_team_count: patch.playoffTeamCount ?? persisted.playoff_team_count,
      playoff_weeks: patch.playoffWeeks ?? persisted.playoff_weeks,
      playoff_start_week: patch.playoffStartWeek ?? persisted.playoff_start_week,
      playoff_start_point: patch.playoffStartWeek ?? persisted.playoff_start_point,
      first_round_byes: patch.firstRoundByes ?? persisted.first_round_byes,
      matchup_length: patch.matchupLength ?? persisted.matchup_length,
      total_rounds: patch.totalRounds ?? persisted.total_rounds,
      consolation_bracket_enabled:
        patch.consolationBracketEnabled ?? persisted.consolation_bracket_enabled,
      third_place_game_enabled: patch.thirdPlaceGameEnabled ?? persisted.third_place_game_enabled,
      toilet_bowl_enabled: patch.toiletBowlEnabled ?? persisted.toilet_bowl_enabled,
      championship_length: patch.championshipLength ?? persisted.championship_length,
      consolation_plays_for: patch.consolationPlaysFor ?? persisted.consolation_plays_for,
      seeding_rules: patch.seedingRules ?? persisted.seeding_rules,
      tiebreaker_rules: patch.tiebreakerRules ?? persisted.tiebreaker_rules,
      bye_rules: patch.byeRules ?? persisted.bye_rules,
      reseed_behavior: patch.reseedBehavior ?? persisted.reseed_behavior,
      standings_tiebreakers: patch.standingsTiebreakers ?? persisted.standings_tiebreakers,
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

test.describe('@playoff commissioner playoff settings panel', () => {
  test('commissioner can edit and save playoff settings overrides', async ({ page }) => {
    const leagueId = `e2e-playoff-${Date.now()}`
    const mocks = await mockPlayoffSettingsApi(page, leagueId)

    await page.goto(`/e2e/playoff-settings?leagueId=${leagueId}`)
    await expect(page.getByRole('heading', { name: /e2e playoff settings harness/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Playoff Settings', exact: true })).toBeVisible()

    await page.getByTestId('playoff-settings-edit-toggle').click()
    await page.getByLabel('Playoff team count').fill('8')
    await page.getByLabel('Reseed behavior').selectOption('reseed_after_round')
    await page.getByLabel('Consolation bracket').uncheck()
    await page.getByLabel('Toilet bowl').check()

    const divisionRecordInPlayoffRules = page
      .locator('label', { hasText: 'Division record' })
      .locator('input[type="checkbox"]')
      .first()
    await divisionRecordInPlayoffRules.check()

    const putRequestPromise = page.waitForRequest((request) => {
      return (
        request.method() === 'PUT' &&
        request.url().includes(`/api/commissioner/leagues/${leagueId}/playoffs`)
      )
    })
    await page.getByTestId('playoff-settings-save').click()
    await putRequestPromise

    const puts = mocks.getPuts()
    expect(puts.length).toBeGreaterThan(0)
    const latest = puts[puts.length - 1]
    expect(latest.playoffTeamCount).toBe(8)
    expect(latest.reseedBehavior).toBe('reseed_after_round')
    expect(latest.consolationBracketEnabled).toBe(false)
    expect(latest.toiletBowlEnabled).toBe(true)
    expect((latest.tiebreakerRules as string[]) ?? []).toContain('division_record')

    await expect(page.getByText(/^8$/).first()).toBeVisible()
    await expect(page.getByText(/reseed_after_round/i)).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Playoff Settings', exact: true })).toBeVisible()
    await expect(page.getByText(/^8$/).first()).toBeVisible()
    await expect(page.getByText(/reseed_after_round/i)).toBeVisible()
  })
})
