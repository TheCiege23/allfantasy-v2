import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

test.describe('@settings general variant context', () => {
  test('shows sport + variant context and keeps variant read-only', async ({ page }) => {
    const patchRequests: Array<Record<string, unknown>> = []
    const state = {
      id: 'e2e-league-settings-context',
      name: 'Audit League',
      description: 'Initial description',
      sport: 'NFL',
      leagueVariant: 'DYNASTY_IDP',
      season: 2026,
      leagueSize: 12,
      rosterSize: 22,
      settings: {
        league_variant: 'DYNASTY_IDP',
      },
    }

    await page.route('**/api/commissioner/leagues/e2e-league-settings-context/settings', async (route) => {
      if (route.request().method() === 'PATCH') {
        const payload = route.request().postDataJSON() as Record<string, unknown>
        patchRequests.push(payload)
        state.name = typeof payload.name === 'string' ? payload.name : state.name
        state.description = typeof payload.description === 'string' ? payload.description : state.description
        state.sport = typeof payload.sport === 'string' ? payload.sport : state.sport
        state.season = typeof payload.season === 'number' ? payload.season : state.season
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(state),
      })
    })

    await page.goto('/e2e/general-settings-context')

    await expect(
      page.getByRole('heading', { name: /general settings variant context harness/i })
    ).toBeVisible()
    await expect(page.getByText('League variant')).toBeVisible()
    await expect(page.getByText('Dynasty IDP')).toBeVisible()

    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByText('League variant (read-only)')).toBeVisible()
    await expect(page.getByText('Dynasty IDP')).toBeVisible()

    await page.getByPlaceholder('My League').fill('Updated Audit League')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    expect(patchRequests.length).toBeGreaterThan(0)
    await expect(page.getByText('League variant')).toBeVisible()
    await expect(page.getByText('Dynasty IDP')).toBeVisible()
  })
})
