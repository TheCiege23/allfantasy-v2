import { expect, test } from '@playwright/test'
import { registerAndLogin } from './helpers/auth-flow'

test.describe.configure({ timeout: 180_000 })

type TrendRequest = {
  list: string
  sport: string
  timeframe: string
}
type StrategyRequest = {
  sport: string
  timeframe: string
}

test('@db player-trend indicators work in authenticated league shell tabs', async ({ page }) => {
  const runAuthedShellE2E = process.env.PLAYWRIGHT_ENABLE_AUTH_DB_E2E === '1'
  test.skip(
    !runAuthedShellE2E,
    'Set PLAYWRIGHT_ENABLE_AUTH_DB_E2E=1 in a DB-configured environment to run authenticated league-shell E2E.'
  )

  await registerAndLogin(page)

  const created = await page.request.post('/api/league/create', {
    data: {
      name: `E2E Trend Shell ${Date.now()}`,
      platform: 'manual',
      sport: 'NFL',
      leagueSize: 12,
      scoring: 'standard',
      isDynasty: true,
    },
  })
  const createdPayload = await created.json().catch(() => ({}))
  expect(created.ok(), JSON.stringify(createdPayload)).toBeTruthy()
  const leagueId = String(createdPayload?.league?.id ?? '')
  expect(leagueId).toBeTruthy()

  const trendRequests: TrendRequest[] = []
  const strategyRequests: StrategyRequest[] = []

  await page.route('**/api/player-trend?**', async (route) => {
    const url = new URL(route.request().url())
    const list = url.searchParams.get('list') ?? ''
    const sport = url.searchParams.get('sport') ?? 'NFL'
    const timeframe = url.searchParams.get('timeframe') ?? '7d'

    if (list !== 'draft_targets' && list !== 'trade_targets') {
      await route.fallback()
      return
    }

    trendRequests.push({ list, sport, timeframe })

    const row = {
      playerId: `${list}-${sport}-${timeframe}-player-1`,
      sport,
      trendScore: 78,
      trendingDirection: list === 'trade_targets' ? 'Hot' : 'Rising',
      addRate: 1.1,
      dropRate: 0.3,
      tradeInterest: list === 'trade_targets' ? 0.42 : 0.18,
      draftFrequency: list === 'draft_targets' ? 0.51 : 0.2,
      lineupStartRate: 0.63,
      injuryImpact: 0.04,
      updatedAt: new Date('2026-03-20T00:00:00.000Z').toISOString(),
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        list,
        sport,
        data: [row],
      }),
    })
  })

  await page.route('**/api/strategy-meta?**', async (route) => {
    const url = new URL(route.request().url())
    const sport = url.searchParams.get('sport') ?? 'NFL'
    const timeframe = url.searchParams.get('timeframe') ?? '7d'
    strategyRequests.push({ sport, timeframe })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            strategyType: 'BalancedBuild',
            strategyLabel: 'Balanced build',
            sport,
            usageRate: 0.31,
            successRate: 0.57,
            trendingDirection: 'Stable',
            leagueFormat: 'dynasty_sf',
            sampleSize: 84,
          },
        ],
      }),
    })
  })

  await page.goto(`/app/league/${leagueId}?tab=Draft`)
  await expect(page).toHaveURL(new RegExp(`/app/league/${leagueId}\\?tab=Draft`))
  await expect(page.getByText('Draft trend indicators')).toBeVisible({ timeout: 45_000 })

  const draftTimeframe = page.getByLabel('Draft trend timeframe')
  await draftTimeframe.selectOption('30d')

  const draftPanel = page.locator('div').filter({ hasText: 'Draft trend indicators' }).first()
  await draftPanel.getByRole('button', { name: 'Refresh' }).click()
  await expect(draftPanel.getByText(/draft .*%/i)).toBeVisible()
  await expect(draftPanel.getByRole('link', { name: 'Open full trend feed' })).toHaveAttribute(
    'href',
    /\/app\/trend-feed\?sport=.*&timeframe=30d/
  )
  await expect(draftPanel.getByText(/Balanced build/i)).toBeVisible()
  await expect(draftPanel.getByRole('link', { name: 'View strategy details' })).toHaveAttribute(
    'href',
    /\/app\/strategy-meta\?sport=.*&timeframe=30d/
  )

  await page.getByRole('button', { name: 'Trades', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/app/league/${leagueId}\\?tab=Trades`))
  await expect(page.getByText('Trade trend indicators')).toBeVisible({ timeout: 45_000 })

  const tradePanel = page.locator('section').filter({ hasText: 'Trade trend indicators' }).first()
  await tradePanel.getByLabel('Trade trend timeframe').selectOption('24h')
  await tradePanel.getByRole('button', { name: 'Refresh' }).click()
  await expect(tradePanel.getByText(/demand .*%/i)).toBeVisible()
  await expect(tradePanel.getByRole('link', { name: 'Open full trend feed' })).toHaveAttribute(
    'href',
    /\/app\/trend-feed\?sport=.*&timeframe=24h/
  )

  await page.getByRole('button', { name: 'Roster', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/app/league/${leagueId}\\?tab=Roster`))
  const rosterPanel = page.locator('div').filter({ hasText: 'Roster strategy widget' }).first()
  await expect(rosterPanel).toBeVisible({ timeout: 45_000 })
  await rosterPanel.getByLabel('Roster strategy timeframe').selectOption('24h')
  await rosterPanel.getByRole('button', { name: 'Refresh' }).click()
  await expect(rosterPanel.getByText(/Balanced build/i)).toBeVisible()
  await expect(rosterPanel.getByRole('link', { name: 'View strategy details' })).toHaveAttribute(
    'href',
    /\/app\/strategy-meta\?sport=.*&timeframe=24h/
  )

  expect(trendRequests.some((r) => r.list === 'draft_targets' && r.timeframe === '30d')).toBe(true)
  expect(trendRequests.some((r) => r.list === 'trade_targets' && r.timeframe === '24h')).toBe(true)
  expect(strategyRequests.some((r) => r.timeframe === '30d')).toBe(true)
  expect(strategyRequests.some((r) => r.timeframe === '24h')).toBe(true)
})
