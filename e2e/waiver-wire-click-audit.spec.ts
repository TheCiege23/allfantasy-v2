import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@waiver waiver wire click audit', () => {
  test('waiver tabs, filters, claim submit, update, and cancel paths work', async ({ page }) => {
    await page.goto('/e2e/waiver-wire')
    await expect(page.getByRole('heading', { name: /waiver wire/i })).toBeVisible()

    await page.getByTestId('waiver-search-input').fill('Alpha')
    await expect(page.getByText('Alpha Runner')).toBeVisible()

    await page.getByRole('button', { name: 'Trending' }).click()
    await expect(page.getByText('Alpha Runner')).toBeVisible()

    await page.getByRole('button', { name: 'Claimed' }).click()
    await expect(page.getByText(/add player-1/i)).toBeVisible()

    await page.getByRole('button', { name: 'Dropped' }).click()
    await expect(page.getByText(/drop roster-1/i)).toBeVisible()

    await page.getByRole('button', { name: /available players/i }).click()
    await page.getByTestId('waiver-claim-open-player-1').click()

    await page.getByRole('button', { name: /pending claims/i }).click()
    await expect(page.getByText(/add player-2/i)).toBeVisible()

    await page.locator('input[type="number"]').first().fill('2')
    await page.getByRole('button', { name: /^Save$/ }).first().click()
    await expect(page.getByText(/add player-2/i)).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).first().click()
    await expect(page.getByText(/add player-2/i)).not.toBeVisible()

    await page.getByRole('button', { name: /processed history/i }).click()
    await expect(page.getByText(/add player-1/i)).toBeVisible()
  })
})
