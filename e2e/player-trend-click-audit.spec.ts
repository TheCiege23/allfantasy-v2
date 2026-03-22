import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

function buildTrendRows(sport: string, prefix: string) {
  return Array.from({ length: 8 }).map((_, idx) => ({
    playerId: `${prefix}-player-${idx + 1}`,
    sport,
    trendScore: 82 - idx * 3,
    trendingDirection: idx % 2 === 0 ? 'Rising' : 'Hot',
    addRate: 1.2,
    dropRate: 0.35,
    tradeInterest: 0.28,
    draftFrequency: 0.5,
    lineupStartRate: 0.64,
    injuryImpact: 0.06,
    updatedAt: new Date('2026-03-20T00:00:00.000Z').toISOString(),
  }))
}

function buildFeedRows(sport: string) {
  return [
    {
      trendType: 'hot_streak',
      playerId: `${sport}-player-hot`,
      sport,
      displayName: `${sport} Hot Player`,
      signals: {
        performanceDelta: 6,
        usageChange: 0.24,
        minutesOrSnapShare: 0.72,
        efficiencyScore: 81,
      },
      trendScore: 81,
      direction: 'Hot',
      updatedAt: new Date('2026-03-20T00:00:00.000Z').toISOString(),
    },
    {
      trendType: 'breakout_candidate',
      playerId: `${sport}-player-breakout`,
      sport,
      displayName: `${sport} Breakout`,
      signals: {
        performanceDelta: 3,
        usageChange: 0.18,
        minutesOrSnapShare: 0.61,
        efficiencyScore: 74,
      },
      trendScore: 74,
      direction: 'Rising',
      updatedAt: new Date('2026-03-20T00:00:00.000Z').toISOString(),
    },
  ]
}

test.describe('@player-trend full click audit', () => {
  test('audits trend panels, feed controls, insight, and navigation links', async ({ page }) => {
    const trendListRequests: Array<{ sport: string; list: string; timeframe: string }> = []
    const trendFeedRequests: Array<{ sport: string; timeframe: string }> = []
    const insightRequests: Array<{ sport: string; playerId: string }> = []

    await page.route('**/api/player-trend?**', async (route) => {
      const url = new URL(route.request().url())
      const list = url.searchParams.get('list') ?? 'hottest'
      const sport = url.searchParams.get('sport') ?? 'NFL'
      const timeframe = url.searchParams.get('timeframe') ?? '7d'
      trendListRequests.push({ sport, list, timeframe })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          list,
          sport,
          data: buildTrendRows(sport, list),
        }),
      })
    })

    await page.route('**/api/strategy-meta?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              strategyType: 'ZeroRB',
              sport: 'NFL',
              usageRate: 0.29,
              successRate: 0.57,
              trendingDirection: 'Rising',
              leagueFormat: 'dynasty_sf',
              sampleSize: 80,
            },
          ],
        }),
      })
    })

    await page.route('**/api/global-meta?**', async (route) => {
      const url = new URL(route.request().url())
      const sport = url.searchParams.get('sport') ?? 'NFL'
      const timeframe = url.searchParams.get('timeframe') ?? '7d'
      const summary = url.searchParams.get('summary')
      if (summary === 'ai') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              summary: `${sport} ${timeframe} trend explanation`,
              topTrends: [`${sport} alpha`, `${sport} beta`],
              sportContext: sport,
            },
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ metaType: 'StrategyMeta', data: { sport, timeframe } }],
        }),
      })
    })

    await page.route('**/api/player-trend/feed?**', async (route) => {
      const url = new URL(route.request().url())
      const sport = url.searchParams.get('sport') ?? 'NFL'
      const timeframe = url.searchParams.get('timeframe') ?? '7d'
      trendFeedRequests.push({ sport, timeframe })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sport,
          timeframe,
          data: buildFeedRows(sport),
        }),
      })
    })

    await page.route('**/api/player-trend/insight?**', async (route) => {
      const url = new URL(route.request().url())
      const sport = url.searchParams.get('sport') ?? 'NFL'
      const playerId = url.searchParams.get('playerId') ?? 'unknown'
      insightRequests.push({ sport, playerId })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          insight: {
            mathValidation: `${playerId} math checked`,
            hypeDetection: `${sport} hype normal`,
            actionableExplanation: 'Add if bench slot available.',
          },
        }),
      })
    })

    await page.goto('/app/meta-insights')
    await expect(page.getByRole('heading', { name: 'Meta insights' })).toBeVisible({ timeout: 45_000 })

    await page.getByRole('combobox', { name: 'Sport filter' }).selectOption('NCAAF')
    await page.getByRole('combobox', { name: 'Timeframe filter' }).selectOption('30d')
    await page.getByRole('button', { name: /Show add\/drop rates/i }).first().click()
    await expect(page.getByRole('button', { name: /Hide add\/drop rates/i }).first()).toBeVisible()
    await page.getByRole('button', { name: /View trend details for hottest-player-1/i }).first().click()
    await expect(page.getByRole('dialog', { name: 'Trend details' })).toBeVisible()
    await page.getByRole('button', { name: 'Close trend details' }).click()
    await expect(page.getByRole('dialog', { name: 'Trend details' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Trend feed' }).first()).toHaveAttribute(
      'href',
      '/app/trend-feed?sport=NCAAF&timeframe=30d'
    )
    await expect(page.getByRole('link', { name: 'Waiver AI' }).first()).toHaveAttribute('href', '/waiver-ai')

    await page.goto('/app/trend-feed?sport=NBA&timeframe=30d')
    await expect(page.getByRole('heading', { name: 'Player trend feed' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Sport' })).toHaveValue('NBA')
    await expect(page.getByRole('combobox', { name: 'Timeframe' })).toHaveValue('30d')
    await page.getByRole('button', { name: 'Get AI insight' }).first().click()
    await expect(page.getByText('Math:')).toBeVisible()
    await expect(page.getByText('Action:')).toBeVisible()
    await page.getByRole('combobox', { name: 'Sport' }).selectOption('SOCCER')
    await page.getByRole('combobox', { name: 'Timeframe' }).selectOption('24h')
    await page.getByRole('button', { name: 'Refresh' }).click()
    await expect(page.getByRole('link', { name: '← App home' })).toHaveAttribute('href', '/app/home')

    await page.goto('/waiver-ai')
    await expect(page.getByRole('link', { name: 'Meta insights' })).toHaveAttribute(
      'href',
      /\/app\/meta-insights\?sport=/
    )

    expect(trendListRequests.some((r) => r.sport === 'NCAAF' && r.timeframe === '30d' && r.list === 'hottest')).toBe(true)
    expect(trendFeedRequests.some((r) => r.sport === 'NBA' && r.timeframe === '30d')).toBe(true)
    expect(trendFeedRequests.some((r) => r.sport === 'SOCCER' && r.timeframe === '24h')).toBe(true)
    expect(insightRequests.some((r) => r.sport === 'NBA')).toBe(true)
  })
})
