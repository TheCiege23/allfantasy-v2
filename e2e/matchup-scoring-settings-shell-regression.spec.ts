import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@matchups matchup scoring-settings shell regression', () => {
  test('navigates from matchup detail to settings scoring panel in /app shell', async ({ page }) => {
    const runFullShellE2E = process.env.PLAYWRIGHT_ENABLE_FULL_SHELL === '1'
    test.skip(
      !runFullShellE2E,
      'Set PLAYWRIGHT_ENABLE_FULL_SHELL=1 in a fully configured env to run /app shell regression.'
    )

    const leagueId = `e2e-matchup-scoring-shell-${Date.now()}`

    await page.route(`**/api/leagues/${leagueId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: leagueId,
          name: 'Matchup Scoring Shell League',
          leagueVariant: 'idp',
          leagueType: 'dynasty',
          isDynasty: true,
        }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/check**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isCommissioner: true }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/tournament-context`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tournament: null }),
      })
    })
    await page.route('**/api/sports/live-scores**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ scores: [] }),
      })
    })

    await page.route(`**/api/app/league/${leagueId}/matchups**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          label: 'week',
          selectedWeekOrRound: 1,
          totalWeeksOrRounds: 18,
          availableWeeks: [1],
          matchups: [
            {
              id: 'mu-shell-1',
              teamAName: 'Alpha FC',
              teamBName: 'Bravo FC',
              scoreA: 108.4,
              scoreB: 101.2,
              projA: 114.7,
              projB: 109.1,
              winProbA: 0.64,
              remainingA: 3,
              remainingB: 4,
            },
          ],
        }),
      })
    })
    await page.route('**/api/simulation/matchup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          winProbabilityA: 0.62,
          winProbabilityB: 0.38,
          marginMean: 7,
          marginStdDev: 9,
          projectedScoreA: 113,
          projectedScoreB: 107,
          scoreRangeA: [102, 124],
          scoreRangeB: [96, 118],
          upsetChance: 16,
          volatilityTag: 'medium',
          iterations: 2000,
        }),
      })
    })

    await page.route(`**/api/commissioner/leagues/${leagueId}/settings`, async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: leagueId,
            name: 'Matchup Scoring Shell League',
            description: null,
            sport: 'NFL',
            season: 2026,
            leagueSize: 12,
            rosterSize: 22,
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: leagueId,
          name: 'Matchup Scoring Shell League',
          description: null,
          sport: 'NFL',
          season: 2026,
          leagueSize: 12,
          rosterSize: 22,
        }),
      })
    })

    await page.route(`**/api/app/league/${leagueId}/scoring/config`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leagueId,
          sport: 'NFL',
          leagueVariant: 'IDP',
          formatType: 'IDP-balanced',
          templateId: 'default-NFL-IDP-balanced',
          rules: [
            {
              statKey: 'idp_solo_tackle',
              pointsValue: 1.5,
              multiplier: 1,
              enabled: true,
              defaultPointsValue: 1.5,
              defaultEnabled: true,
              isOverridden: false,
            },
          ],
        }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/scoring?type=settings`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
        }),
      })
    })

    await page.goto(`/app/league/${leagueId}?tab=Matchups`)
    await expect(page).toHaveURL(new RegExp(`/app/league/${leagueId}\\?tab=Matchups`))
    await page.getByRole('button', { name: 'Matchups', exact: true }).click()
    await expect(page.getByTestId('matchup-card-mu-shell-1')).toBeVisible()
    await expect(page.getByTestId('matchup-detail-title')).toContainText('Alpha FC')
    await expect(page.getByTestId('matchup-scoring-settings-link')).toBeVisible()

    await page.getByTestId('matchup-scoring-settings-link').click()
    await expect(page).toHaveURL(new RegExp(`/app/league/${leagueId}\\?tab=Settings`))
    await expect(page.getByRole('heading', { name: 'General Settings', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Scoring Settings', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Scoring Settings', exact: true })
    ).toBeVisible()
    await expect(page.getByLabel('idp_solo_tackle points')).toHaveValue('1.5')
  })
})
