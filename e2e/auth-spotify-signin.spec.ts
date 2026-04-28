import { test, expect } from '@playwright/test'
import { registerAndLoginTo } from './helpers/auth-flow'

test.describe('@auth Spotify sign-in wiring', () => {
  test('login page routes to Spotify OAuth when configured', async ({ page, request }) => {
    const providersRes = await request.get('/api/auth/providers')
    expect(providersRes.ok()).toBeTruthy()

    const providers = (await providersRes.json()) as Record<string, { id?: string }>
    const spotifyConfigured = Boolean(providers?.spotify?.id)
    test.skip(!spotifyConfigured, 'Spotify provider is not configured in this environment.')

    await page.goto('/login')
    const spotifyButton = page.getByRole('button', { name: /continue with spotify/i })
    await expect(spotifyButton).toBeVisible()

    await spotifyButton.click()

    await expect(page).toHaveURL(/(\/api\/auth\/signin\/spotify|accounts\.spotify\.com)/, {
      timeout: 20_000,
    })
  })

  test('mock callback path links Spotify and reflects connected state', async ({ page }) => {
    await registerAndLoginTo(page, '/settings?tab=connected')

    const linkRes = await page.request.post('/api/e2e/auth/spotify/mock-connect')
    expect(linkRes.ok()).toBeTruthy()

    const accountsRes = await page.request.get('/api/user/connected-accounts')
    expect(accountsRes.ok()).toBeTruthy()
    const accountsPayload = (await accountsRes.json()) as {
      providers?: Array<{ id?: string; linked?: boolean }>
    }
    const spotifyProvider = (accountsPayload.providers ?? []).find((provider) => provider.id === 'spotify')
    expect(spotifyProvider?.linked).toBeTruthy()

    await page.goto('/settings?tab=connected')
    await expect(page.getByText(/spotify mock user|spotify connected/i).first()).toBeVisible({
      timeout: 20_000,
    })
  })
})
