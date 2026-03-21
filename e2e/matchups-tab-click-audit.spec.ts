import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

async function mockMatchupsApi(page: Page, leagueId: string) {
  const byWeek: Record<number, any[]> = {
    1: [
      {
        id: 'mu-1',
        teamAName: 'Alpha FC',
        teamBName: 'Bravo FC',
        scoreA: 101.5,
        scoreB: 95.2,
        projA: 112.4,
        projB: 108.6,
        winProbA: 0.67,
        remainingA: 3,
        remainingB: 4,
      },
      {
        id: 'mu-2',
        teamAName: 'Charlie FC',
        teamBName: 'Delta FC',
        scoreA: 88.1,
        scoreB: 89.3,
        projA: 104.2,
        projB: 106.8,
        winProbA: 0.44,
        remainingA: 5,
        remainingB: 5,
      },
    ],
    2: [
      {
        id: 'mu-3',
        teamAName: 'Echo FC',
        teamBName: 'Foxtrot FC',
        scoreA: 77.9,
        scoreB: 81.4,
        projA: 98.5,
        projB: 99.2,
        winProbA: 0.47,
        remainingA: 6,
        remainingB: 5,
      },
    ],
  }

  await page.route(`**/api/app/league/${leagueId}/matchups**`, async (route) => {
    const url = new URL(route.request().url())
    const week = Number(url.searchParams.get('week') || 1)
    const selectedWeekOrRound = byWeek[week] ? week : 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        label: 'week',
        selectedWeekOrRound,
        totalWeeksOrRounds: 18,
        availableWeeks: [1, 2],
        matchups: byWeek[selectedWeekOrRound] ?? [],
      }),
    })
  })

  await page.route('**/api/simulation/matchup', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        winProbabilityA: 0.61,
        winProbabilityB: 0.39,
        marginMean: 8,
        marginStdDev: 11,
        projectedScoreA: 110,
        projectedScoreB: 102,
        scoreRangeA: [95, 125],
        scoreRangeB: [90, 115],
        upsetChance: 18,
        volatilityTag: 'medium',
        iterations: 2000,
      }),
    })
  })
}

test.describe('@matchups matchups tab click audit', () => {
  test('period navigation and matchup detail selection are wired', async ({ page }) => {
    const leagueId = `e2e-matchups-${Date.now()}`
    await mockMatchupsApi(page, leagueId)

    await page.goto(`/e2e/matchups?leagueId=${leagueId}`)
    await expect(page.getByRole('heading', { name: /e2e matchups harness/i })).toBeVisible()
    await expect(page.getByText(/viewing week 1 of 18/i)).toBeVisible()

    await page.getByTestId('matchup-card-mu-2').click()
    await expect(page.getByTestId('matchup-detail-title')).toContainText('Charlie FC')
    await expect(page.getByTestId('matchup-detail-title')).toContainText('Delta FC')

    await page.getByTestId('matchups-next-period').click()
    await expect(page.getByText(/viewing week 2 of 18/i)).toBeVisible()
    await expect(page.getByTestId('matchup-card-mu-3')).toBeVisible()

    await page.getByLabel('Matchup period selector').selectOption('1')
    await expect(page.getByText(/viewing week 1 of 18/i)).toBeVisible()
    await expect(page.getByTestId('matchup-card-mu-1')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Matchups', exact: true })).toBeVisible()
    await expect(page.getByTestId('matchup-card-mu-1')).toBeVisible()
  })
})
