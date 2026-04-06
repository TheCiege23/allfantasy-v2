import { test, expect } from '@playwright/test'

test.describe.configure({ timeout: 90_000 })

test('shows grouped multi-sport dashboard ordering without DB dependency', async ({ page }) => {
  const nhlLeagueId = 'nhl-e2e-123'
  const mlbLeagueId = 'mlb-e2e-456'
  const nhlLeagueName = 'E2E NHL Harness League'
  const mlbLeagueName = 'E2E MLB Harness League'

  await page.route('**/api/league/list', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagues: [
          {
            id: nhlLeagueId,
            name: nhlLeagueName,
            sport: 'NHL',
            sport_type: 'NHL',
            leagueVariant: 'STANDARD',
            league_variant: 'STANDARD',
            platform: 'manual',
            leagueSize: 12,
            isDynasty: false,
            syncStatus: 'manual',
            rosters: [],
          },
          {
            id: mlbLeagueId,
            name: mlbLeagueName,
            sport: 'MLB',
            sport_type: 'MLB',
            leagueVariant: 'STANDARD',
            league_variant: 'STANDARD',
            platform: 'manual',
            leagueSize: 12,
            isDynasty: false,
            syncStatus: 'manual',
            rosters: [],
          },
        ],
      }),
    })
  })

  await page.route('**/api/league/roster**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ roster: [], faabRemaining: null, waiverPriority: null }),
    })
  })

  await page.route('**/api/bracket/leagues/**/standings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ standings: [] }),
    })
  })

  await page.route('**/api/bracket/leagues/**/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ messages: [] }),
    })
  })

  await page.route('**/api/content-feed**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })

  await page.route('**/api/sports/news**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ news: [] }),
    })
  })

  await page.route('**/api/sports/weather**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ weather: null }),
    })
  })

  await page.goto('/e2e/dashboard-soccer-grouping')
  await expect(page.getByText(/Welcome back,/i).first()).toBeVisible()

  // Switch to the My Leagues tab where sport groups are rendered
  await page.getByRole('button', { name: 'My Leagues' }).click()

  // Trigger a fresh fetch (leagues were created after initial mount-time fetch)
  await page.getByRole('button', { name: 'Refresh' }).click()

  // Wait for loading indicator to clear before asserting sections
  await expect(page.locator('text=Loading your connected leagues...')).not.toBeVisible({ timeout: 20_000 })

  const nhlSection = page.locator('section').filter({ has: page.getByRole('heading', { name: /^NHL$/ }) }).first()
  const mlbSection = page.locator('section').filter({ has: page.getByRole('heading', { name: /^MLB$/ }) }).first()

  // League cards must route directly into league detail pages.
  const nhlCard = nhlSection.getByRole('link', { name: new RegExp(nhlLeagueName) }).first()
  const mlbCard = mlbSection.getByRole('link', { name: new RegExp(mlbLeagueName) }).first()
  await expect(nhlCard).toBeVisible({ timeout: 45_000 })
  await expect(mlbCard).toBeVisible({ timeout: 45_000 })
  await expect(nhlSection).toBeVisible()
  await expect(mlbSection).toBeVisible()
  await expect(nhlCard).toHaveAttribute('href', new RegExp(`^/league/${nhlLeagueId}$`))
  await expect(mlbCard).toHaveAttribute('href', new RegExp(`^/league/${mlbLeagueId}$`))

  const headingOrder = await page.getByRole('heading', { level: 3 }).evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() || '').filter(Boolean)
  )
  const nhlIndex = headingOrder.indexOf('NHL')
  const mlbIndex = headingOrder.indexOf('MLB')
  expect(nhlIndex).toBeGreaterThanOrEqual(0)
  expect(mlbIndex).toBeGreaterThanOrEqual(0)
  expect(nhlIndex).toBeLessThan(mlbIndex)

  // Tab transitions: verify click handlers switch dashboard sections.
  await page.locator('[data-dashboard-tab="Sports"]').click()
  await expect(page.getByRole('heading', { name: /^Sports$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /NCAA Football Fantasy/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /NCAA Basketball Fantasy/i })).toBeVisible()
  await page.locator('[data-dashboard-tab="AI"]').click()
  await expect(page.getByRole('heading', { name: /^AI$/ })).toBeVisible()

  // AI launch points must carry league context.
  const askChimmyHrefs = await page.getByRole('link', { name: 'Ask Chimmy' }).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('href') || '')
  )
  expect(
    askChimmyHrefs.some(
      (href) =>
        /\/messages\?tab=ai/.test(href) &&
        /leagueId=/.test(href) &&
        /sport=(NFL|NHL|MLB|NBA|NCAAF|NCAAB|SOCCER)/i.test(href)
    )
  ).toBeTruthy()
})
