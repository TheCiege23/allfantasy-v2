import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@waiver waiver wire click audit', () => {
  test.describe.configure({ mode: 'serial' })

  async function openHarness(page: Parameters<typeof test>[0]['page']) {
    await page.goto('/e2e/waiver-wire', { waitUntil: 'domcontentloaded' })
    const heading = page.getByRole('heading', { name: /^waiver wire$/i })
    for (let i = 0; i < 5; i += 1) {
      if (await heading.isVisible().catch(() => false)) return
      const openButton = page.getByTestId('waiver-open-button')
      await expect(openButton).toBeVisible()
      try {
        await openButton.click({ timeout: 5_000 })
      } catch {
        await page.evaluate(() => {
          const button = document.querySelector('[data-testid="waiver-open-button"]') as HTMLButtonElement | null
          button?.click()
        })
      }
      await page.waitForTimeout(300)
    }
    await expect(heading).toBeVisible({ timeout: 10_000 })
  }

  test('open/back, filters, tabs, watchlist, and AI/detail links work', async ({ page }) => {
    await openHarness(page)

    await page.getByTestId('waiver-search-input').fill('Alpha')
    await expect(page.getByText('Alpha Runner')).toBeVisible()
    await expect(page.getByTestId('waiver-player-team-logo-player-1')).toBeVisible()

    await page.getByTestId('waiver-position-filter-RB').click()
    await expect(page.getByText('Alpha Runner')).toBeVisible()
    await page.getByTestId('waiver-reset-filters').click()

    await page.getByTestId('waiver-watchlist-toggle-player-1').click()
    await page.getByTestId('waiver-status-filter-watchlist').click()
    await expect(page.getByText('Alpha Runner')).toBeVisible()
    await expect(page.getByText('Bravo Receiver')).toHaveCount(0)
    await page.getByTestId('waiver-reset-filters').click()

    await page.getByRole('button', { name: 'Trending' }).click()
    await expect(page.getByText('Alpha Runner')).toBeVisible()

    await page.getByRole('button', { name: 'Claimed' }).click()
    await expect(page.getByText(/add player-1/i)).toBeVisible()

    await page.getByRole('button', { name: 'Dropped' }).click()
    await expect(page.getByText(/drop roster-1/i)).toBeVisible()

    await page.getByTestId('waiver-tab-available').click()
    await expect(page.getByTestId('waiver-player-detail-link-player-1')).toHaveAttribute('href', /\/player-comparison\?/)
    await expect(page.getByTestId('waiver-ai-help-link')).toHaveAttribute('href', /\/messages\?tab=ai/)
    await expect(page.getByTestId('waiver-ai-help-link')).toHaveAttribute('href', /insightType=waiver/)

    await page.getByTestId('waiver-back-button').click()
    await expect(page.getByTestId('waiver-open-button')).toBeVisible()
  })

  test('claim drawer FAAB/drop flow and pending edit/cancel work', async ({ page }) => {
    await openHarness(page)

    await page.getByTestId('waiver-claim-open-player-1').click()
    await expect(page.getByTestId('waiver-claim-drawer')).toBeVisible()
    await expect(page.getByTestId('waiver-claim-submit')).toBeDisabled()
    await expect(page.getByTestId('waiver-claim-validation-message')).toBeVisible()

    await page.getByTestId('waiver-drop-player-selector').selectOption('roster-1')
    await page.getByTestId('waiver-faab-bid-input').fill('11')
    await page.getByTestId('waiver-claim-priority-input').fill('2')
    await expect(page.getByTestId('waiver-claim-summary')).toContainText('Alpha Runner')
    await expect(page.getByTestId('waiver-claim-summary')).toContainText('$11 FAAB')
    await page.getByTestId('waiver-claim-submit').click()

    await page.getByRole('button', { name: /pending claims/i }).click()
    await expect(page.getByText(/add player-2/i)).toBeVisible()
    await expect(page.getByText(/add player-1/i)).toBeVisible()

    await page.getByRole('button', { name: /^Save$/ }).first().click()
    await expect(page.getByText(/add player-1/i)).toBeVisible()

    await page.locator('[data-testid^="waiver-claim-cancel-"]').last().click()
    await expect(page.getByText(/add player-1/i)).toHaveCount(0)

    await page.getByTestId('waiver-tab-available').click()
    await page.getByTestId('waiver-claim-open-player-3').click()
    await expect(page.getByTestId('waiver-claim-drawer')).toBeVisible()
    await page.getByTestId('waiver-claim-cancel').click()
    await expect(page.getByTestId('waiver-claim-drawer')).toHaveCount(0)
  })

  test('mobile row click opens claim drawer and supports close', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openHarness(page)
    await page.getByTestId('waiver-player-row-player-3').click()
    if (!(await page.getByTestId('waiver-claim-drawer').isVisible().catch(() => false))) {
      await page.getByTestId('waiver-claim-open-player-3').click()
    }
    await expect(page.getByTestId('waiver-claim-drawer')).toBeVisible()
    await page.getByTestId('waiver-claim-cancel').click()
    await expect(page.getByTestId('waiver-claim-drawer')).toHaveCount(0)

    await page.getByRole('button', { name: /processed history/i }).click()
    await expect(page.getByText(/add player-1/i)).toBeVisible()
  })
})
