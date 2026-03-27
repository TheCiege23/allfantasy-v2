import { expect, test, type Page, type Route } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

async function pickSelectOption(page: Page, testId: string, label: string) {
  await page.getByTestId(testId).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

test.describe('@matchup-simulator click audit', () => {
  test('standalone matchup simulator flow is fully wired', async ({ page }) => {
    const simulationRequests: Array<Record<string, unknown>> = []
    const deriveMean = (team: { mean?: number; lineup?: Array<{ projection?: number }> }, fallback: number) => {
      const lineupMean = Array.isArray(team.lineup)
        ? team.lineup.reduce((sum, slot) => sum + Number(slot.projection ?? 0), 0)
        : 0
      const explicitMean = Number(team.mean ?? NaN)
      if (Number.isFinite(explicitMean)) return explicitMean
      return lineupMean > 0 ? Number(lineupMean.toFixed(1)) : fallback
    }

    await page.route('**/api/simulation/matchup', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      simulationRequests.push(body)

      const teamA = (body.teamA ?? {}) as { mean?: number; lineup?: Array<{ projection?: number }> }
      const teamB = (body.teamB ?? {}) as { mean?: number; lineup?: Array<{ projection?: number }> }
      const meanA = deriveMean(teamA, 100)
      const meanB = deriveMean(teamB, 95)
      const winA = meanA / Math.max(1, meanA + meanB)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          simulationId: 'sim_matchup_audit_1',
          winProbabilityA: Number(winA.toFixed(3)),
          winProbabilityB: Number((1 - winA).toFixed(3)),
          marginMean: Number((meanA - meanB).toFixed(1)),
          marginStdDev: 9.2,
          projectedScoreA: meanA,
          projectedScoreB: meanB,
          scoreRangeA: [Math.max(0, meanA - 11), meanA + 11],
          scoreRangeB: [Math.max(0, meanB - 11), meanB + 11],
          upsetChance: 18.4,
          volatilityTag: 'medium',
          iterations: 1500,
          deterministicSeed: 782331,
          upsideScenario: { teamA: meanA + 10, teamB: meanB + 9, percentile: 90 },
          downsideScenario: { teamA: Math.max(0, meanA - 10), teamB: Math.max(0, meanB - 9), percentile: 10 },
          scoreDistributionA: Array.from({ length: 50 }, (_, i) => meanA - 10 + i * 0.45),
          scoreDistributionB: Array.from({ length: 50 }, (_, i) => meanB - 10 + i * 0.45),
          providerInsights: {
            deepseek: 'Distribution overlap is narrow enough for the favorite to hold most outcomes, but the underdog still has one live swing lane.',
            grok: 'This projects as a favorite with enough chaos to stay dramatic.',
            openai: 'The favorite is ahead because the adjusted lineup total is stronger, but the underdog can still flip it with one upside slot.',
          },
        }),
      })
    })

    await page.route('**/api/share/generate-copy', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          caption: 'AllFantasy caption generated for matchup simulator e2e',
        }),
      })
    })

    await page.goto('/app/matchup-simulation')
    await expect(page.getByTestId('matchup-open-simulator')).toBeVisible()
    await page.getByTestId('matchup-open-simulator').click()

    await pickSelectOption(page, 'matchup-sport-selector', 'Soccer')
    await pickSelectOption(page, 'matchup-team-a-selector', 'High Press City')
    await pickSelectOption(page, 'matchup-team-b-selector', 'Counter Attack XI')

    await page.getByTestId('matchup-week-period-input').fill('4')
    await expect(page.getByTestId('matchup-current-detection')).toContainText('High Press City vs Counter Attack XI')

    await page.getByTestId('matchup-compare-button').click()
    await expect(page.locator('[data-audit="win-probability-meter"]')).toBeVisible()
    await expect(page.getByTestId('matchup-position-comparison-list')).toBeVisible()

    await page.getByTestId('matchup-chart-toggle-scorerange').click()
    await expect(page.getByTestId('matchup-score-range-display')).toBeVisible()
    await page.getByTestId('matchup-chart-toggle-distribution').click()
    await expect(page.locator('[data-audit="simulation-chart"]')).toBeVisible()

    await page.getByTestId('matchup-position-tab-edges').click()
    await expect(page.getByTestId('matchup-position-comparison-list')).toBeVisible()
    await page.getByTestId('matchup-position-tab-all').click()

    const aiLink = page.getByTestId('matchup-ai-explanation-button')
    await expect(aiLink).toHaveAttribute('href', /insightType=matchup/)
    await expect(aiLink).toHaveAttribute('href', /sport=SOCCER/)
    await expect(page.getByText('DeepSeek Distribution Read')).toBeVisible()

    await page.getByTestId('matchup-team-a-lineup-GKP-projection-input').fill('14')
    await expect
      .poll(() => simulationRequests.length, { timeout: 10_000 })
      .toBe(2)
    const lineupChangeRequest = simulationRequests.at(-1) as {
      teamA?: { lineup?: Array<{ slotId?: string; projection?: number }> }
    }
    expect(
      lineupChangeRequest.teamA?.lineup?.find((slot) => slot.slotId === 'GKP')?.projection
    ).toBe(14)

    await page.getByTestId('matchup-rerun-button').click()
    expect(simulationRequests.length).toBeGreaterThan(2)
    expect(simulationRequests.some((req) => req.sport === 'SOCCER' && req.weekOrPeriod === 4)).toBe(true)

    await page.getByTestId('matchup-clear-button').click()
    await expect(page.locator('[data-audit="win-probability-meter"]')).toHaveCount(0)

    await page.getByTestId('matchup-reset-button').click()
    await expect(page.getByTestId('matchup-week-period-input')).toHaveValue('1')

    await page.getByTestId('matchup-back-button').click()
    await expect(page.getByTestId('matchup-open-simulator')).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByTestId('matchup-open-simulator').click()
    await page.getByTestId('matchup-compare-button').click()
    await expect(page.getByTestId('matchup-position-tab-edges')).toBeVisible()
  })

  test('league matchup detail comparison interactions are wired', async ({ page }) => {
    const simulationRequests: Array<Record<string, unknown>> = []
    const matchupRequests: Array<{ week: string | null }> = []

    await page.route('**/api/simulation/matchup', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      simulationRequests.push(body)

      const teamA = (body.teamA ?? {}) as { mean?: number }
      const teamB = (body.teamB ?? {}) as { mean?: number }
      const meanA = Number(teamA.mean ?? 114)
      const meanB = Number(teamB.mean ?? 109)
      const winA = meanA / Math.max(1, meanA + meanB)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          winProbabilityA: Number(winA.toFixed(3)),
          winProbabilityB: Number((1 - winA).toFixed(3)),
          marginMean: Number((meanA - meanB).toFixed(1)),
          marginStdDev: 9.5,
          projectedScoreA: meanA,
          projectedScoreB: meanB,
          scoreRangeA: [Math.max(0, meanA - 12), meanA + 12],
          scoreRangeB: [Math.max(0, meanB - 12), meanB + 12],
          upsetChance: 20.1,
          volatilityTag: 'medium',
          iterations: 1200,
        }),
      })
    })

    const fulfillMatchups = async (route: Route) => {
      const url = new URL(route.request().url())
      const week = url.searchParams.get('week')
      matchupRequests.push({ week })
      const selected = week ? Number(week) : 1

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sport: 'NBA',
          label: 'week',
          selectedWeekOrRound: selected,
          totalWeeksOrRounds: 5,
          availableWeeks: [1, 2, 3, 4, 5],
          matchups: [
            {
              id: `m-${selected}`,
              teamAId: 'teamA',
              teamBId: 'teamB',
              weekOrRound: selected,
              teamAName: 'Alpha',
              teamBName: 'Bravo',
              scoreA: 111.2,
              scoreB: 108.1,
              projA: 120.1,
              projB: 115.3,
              winProbA: 0.62,
              remainingA: 3,
              remainingB: 4,
            },
          ],
        }),
      })
    }

    await page.route('**/api/app/league/league_sim_ux_1/matchups**', fulfillMatchups)
    await page.route('**/api/leagues/league_sim_ux_1/matchups**', fulfillMatchups)

    await page.goto('/e2e/matchups?leagueId=league_sim_ux_1')
    await expect(page.getByText('E2E Matchups Harness')).toBeVisible()

    await page.getByTestId('tab-refresh-button').first().click()
    await page.getByTestId('matchups-next-period').click()
    await page.getByTestId('matchups-prev-period').click()

    await page.getByTestId('matchup-card-m-1').click()
    await expect(page.getByTestId('matchup-detail-title')).toContainText('Alpha')
    await expect(page.getByTestId('matchup-scoring-settings-link')).toBeVisible()

    await page.getByTestId('matchup-card-rerun').click()
    await expect(page.getByTestId('matchup-card-position-tab-edges')).toBeVisible()
    await page.getByTestId('matchup-card-position-tab-edges').click()
    await page.getByTestId('matchup-card-position-tab-all').click()

    const explainLink = page.getByTestId('matchup-card-ai-explain')
    await expect(explainLink).toHaveAttribute('href', /insightType=matchup/)
    await expect(explainLink).toHaveAttribute('href', /leagueId=league_sim_ux_1/)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Clear selection' }).click()
    await expect(page.getByText('Select a matchup to see full lineups and live scoring details.')).toBeVisible()

    expect(matchupRequests.length).toBeGreaterThan(0)
    expect(simulationRequests.some((req) => req.sport === 'NBA' && req.persist === true)).toBe(true)
  })
})
