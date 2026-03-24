import { test, expect } from '@playwright/test'
import { registerAndLogin } from './helpers/auth-flow'

test.describe.configure({ timeout: 90_000 })

async function createLeague(
  page: import('@playwright/test').Page,
  sport: 'NHL' | 'MLB',
  name: string
) {
  const res = await page.request.post('/api/league/create', {
    data: {
      name,
      platform: 'manual',
      sport,
      leagueSize: 12,
      scoring: 'standard',
      isDynasty: false,
    },
  })
  const payload = await res.json().catch(() => ({}))
  expect(res.ok(), JSON.stringify(payload)).toBeTruthy()
  return payload?.league as { id?: string; name?: string; sport?: string } | undefined
}

test('@db creates multi-sport leagues and shows grouped dashboard ordering', async ({ page }) => {
  await registerAndLogin(page)

  const suffix = Date.now()
  const nhlLeagueName = `E2E NHL ${suffix}`
  const mlbLeagueName = `E2E MLB ${suffix}`

  const nhlLeague = await createLeague(page, 'NHL', nhlLeagueName)
  const mlbLeague = await createLeague(page, 'MLB', mlbLeagueName)
  expect(nhlLeague?.id).toBeTruthy()
  expect(mlbLeague?.id).toBeTruthy()

  await page.goto('/dashboard')
  await page.waitForURL('/dashboard')

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
  await expect(nhlCard).toHaveAttribute('href', new RegExp(`^/app/league/${nhlLeague?.id ?? ''}$`))
  await expect(mlbCard).toHaveAttribute('href', new RegExp(`^/app/league/${mlbLeague?.id ?? ''}$`))

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
        /\/chimmy\?/.test(href) &&
        /leagueId=/.test(href) &&
        /sport=(NFL|NHL|MLB|NBA|NCAAF|NCAAB|SOCCER)/i.test(href)
    )
  ).toBeTruthy()
})
