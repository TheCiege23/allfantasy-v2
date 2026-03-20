import { test, expect } from '@playwright/test'

function makeTestCredentials() {
  const now = Date.now()
  const email = `e2e+${now}@example.com`
  const username = `e2e${now}`
  const password = 'Password123!'
  return { email, username, password }
}

async function registerAndLogin(page: import('@playwright/test').Page) {
  const { email, username, password } = makeTestCredentials()

  const registerResponse = await page.request.post('/api/auth/register', {
    data: {
      username,
      email,
      password,
      displayName: username,
      ageConfirmed: true,
      verificationMethod: 'EMAIL',
      timezone: 'America/New_York',
      preferredLanguage: 'en',
      avatarPreset: 'crest',
      disclaimerAgreed: true,
      termsAgreed: true,
    },
  })
  expect(registerResponse.ok()).toBeTruthy()

  await page.goto('/login?callbackUrl=/dashboard')
  await page.fill('#login-identifier', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
}

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
  expect(res.ok()).toBeTruthy()
}

test('creates multi-sport leagues and shows grouped dashboard ordering', async ({ page }) => {
  await registerAndLogin(page)

  const suffix = Date.now()
  const nhlLeagueName = `E2E NHL ${suffix}`
  const mlbLeagueName = `E2E MLB ${suffix}`

  await createLeague(page, 'NHL', nhlLeagueName)
  await createLeague(page, 'MLB', mlbLeagueName)

  await page.goto('/dashboard')

  await expect(page.getByText(nhlLeagueName)).toBeVisible()
  await expect(page.getByText(mlbLeagueName)).toBeVisible()

  const nhlHeader = page.locator('h4', { hasText: 'NHL' }).first()
  const mlbHeader = page.locator('h4', { hasText: 'MLB' }).first()

  await expect(nhlHeader).toBeVisible()
  await expect(mlbHeader).toBeVisible()

  const nhlBox = await nhlHeader.boundingBox()
  const mlbBox = await mlbHeader.boundingBox()

  expect(nhlBox).not.toBeNull()
  expect(mlbBox).not.toBeNull()
  expect((nhlBox as { y: number }).y).toBeLessThan((mlbBox as { y: number }).y)
})
