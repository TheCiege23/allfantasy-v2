import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

test.describe('@league-shell follow-up tab navigation', () => {
  test('clicking roster/draft/waivers/settings updates tab state and URL', async ({ page }) => {
    await page.goto('/e2e/league-shell-follow-up')

    await expect(page.getByRole('heading', { name: /league shell follow-up navigation harness/i })).toBeVisible()
    await expect(page.getByTestId('league-follow-up-overview-panel')).toBeVisible()

    await page.getByRole('button', { name: 'Roster' }).click()
    await expect(page).toHaveURL(/tab=Roster/)
    await expect(page.getByTestId('league-follow-up-roster-panel')).toBeVisible()

    await page.getByRole('button', { name: 'Draft' }).click()
    await expect(page).toHaveURL(/tab=Draft/)
    await expect(page.getByTestId('league-follow-up-draft-panel')).toBeVisible()

    await page.getByRole('button', { name: 'Waivers' }).click()
    await expect(page).toHaveURL(/tab=Waivers/)
    await expect(page.getByTestId('league-follow-up-waivers-panel')).toBeVisible()

    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/tab=Settings/)
    await expect(page.getByTestId('league-follow-up-settings-general')).toBeVisible()
  })
})
