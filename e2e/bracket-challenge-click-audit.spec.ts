import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@bracket bracket challenge click audit', () => {
  test('harness click paths are fully wired', async ({ page }) => {
    const pickCalls: Array<{ nodeId: string; pickedTeamName: string }> = []

    await page.route('**/api/bracket/live?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          tournamentId: 'e2e-tournament',
          games: [],
          standings: [],
          sleeperTeams: [],
          hasLiveGames: false,
          pollIntervalMs: 60_000,
        }),
      })
    })

    await page.route('**/api/bracket/entries/e2e-entry/pick', async (route) => {
      const payload = route.request().postDataJSON() as { nodeId: string; pickedTeamName: string }
      pickCalls.push(payload)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route('**/api/bracket/entries/e2e-entry/submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route('**/api/bracket/entries/e2e-entry/insurance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route('**/api/bracket/auto-fill', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto('/e2e/bracket-challenge')
    await expect(page.getByTestId('bracket-open-challenge-button')).toBeVisible()
    await page.getByTestId('bracket-open-challenge-button').click()

    await expect(page.getByTestId('bracket-empty-state')).toBeVisible()
    await page.getByTestId('bracket-entry-name-input').fill('Playoff Entry')
    await page.getByTestId('bracket-tiebreak-input').fill('47')
    await page.getByTestId('bracket-create-bracket-button').click()

    await expect(page.getByTestId('bracket-generic-board')).toBeVisible()
    await expect(page.getByTestId('bracket-mobile-navigation')).toBeVisible()
    await expect(page.getByTestId('bracket-refresh-button')).toBeVisible()
    await expect(page.getByTestId('bracket-save-picks-button')).toBeVisible()

    await page.getByTestId('bracket-pick-team-r1g1-home').click()
    await page.getByTestId('bracket-pick-team-r1g2-away').click()
    await page.getByTestId('bracket-pick-team-r1g3-home').click()
    await page.getByTestId('bracket-pick-team-r1g4-away').click()
    expect(pickCalls.length).toBeGreaterThan(0)

    await page.getByTestId('bracket-save-picks-button').click()
    await page.getByTestId('bracket-refresh-button').click()

    await expect(page.getByTestId('bracket-leaderboard-link')).toBeVisible()
    await expect(page.getByTestId('bracket-scoring-info-link')).toBeVisible()

    await expect(page.getByTestId('bracket-lock-state-message')).toContainText('editable')
    await page.getByTestId('bracket-edit-toggle-button').click()
    await expect(page.getByTestId('bracket-lock-state-message')).toContainText('locked')

    await page.getByTestId('bracket-submit-bracket-button').click()
    await expect(page.getByTestId('bracket-submit-message')).toContainText(/submitted/i)

    await page.getByTestId('bracket-harness-back-button').click()
    await expect(page.getByTestId('bracket-open-challenge-button')).toBeVisible()
  })

  test('create pool supports playoff challenge for all sports', async ({ page }) => {
    await page.goto('/brackets/leagues/new?sport=NFL&challengeType=playoff_challenge')

    await expect(page.getByTestId('bracket-create-form')).toBeVisible()
    await expect(page.getByTestId('bracket-create-sport-NFL')).toBeVisible()
    await expect(page.getByTestId('bracket-create-sport-NHL')).toBeVisible()
    await expect(page.getByTestId('bracket-create-sport-NBA')).toBeVisible()
    await expect(page.getByTestId('bracket-create-sport-MLB')).toBeVisible()
    await expect(page.getByTestId('bracket-create-sport-NCAAF')).toBeVisible()
    await expect(page.getByTestId('bracket-create-sport-NCAAB')).toBeVisible()
    await expect(page.getByTestId('bracket-create-sport-SOCCER')).toBeVisible()

    await expect(page.getByTestId('bracket-create-challenge-type-playoff_challenge')).toBeVisible()
    await page.getByTestId('bracket-create-sport-NCAAB').click()
    await expect(page.getByTestId('bracket-create-challenge-type-mens_ncaa')).toBeVisible()

    await page.getByTestId('bracket-create-name-input').fill('E2E Playoff Pool')
    await page.getByTestId('bracket-create-visibility-public').click()
    await expect(page.getByTestId('bracket-create-max-entries-slider')).toBeVisible()
  })
})
