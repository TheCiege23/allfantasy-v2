import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

async function openHarness(page: Page) {
  await page.goto('/e2e/advantage-dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Advantage Dashboard Harness' })).toBeVisible()
  await expect(page.getByTestId('advantage-hydrated-flag')).toContainText(/hydrat/i)
  await expect(page.getByTestId('advantage-card-trend-alerts')).toBeVisible()
}

test.describe('@advantage dashboard click audit', () => {
  test('dashboard renders live previews for each intelligence surface', async ({ page }) => {
    await openHarness(page)

    await expect(page.getByTestId('advantage-hero-summary')).toContainText(/advantage pulse/i)
    await expect(page.getByTestId('advantage-card-trend-alerts')).toContainText('Sky Moore')
    await expect(page.getByTestId('advantage-card-coach-advice')).toContainText('Open Waiver AI')
    await expect(page.getByTestId('advantage-card-power-rankings')).toContainText('Alpha Gridiron')
    await expect(page.getByTestId('advantage-card-simulation-insights')).toContainText(
      'NFL Alpha'
    )
  })

  test('every dashboard card opens its related tool', async ({ page }) => {
    await openHarness(page)

    const trendCard = page.getByTestId('advantage-card-trend-alerts')
    await expect(trendCard).toHaveAttribute('href', '/app/trend-feed')
    await Promise.all([
      page.waitForURL(/\/app\/trend-feed/, { timeout: 15_000 }),
      trendCard.click(),
    ])

    await openHarness(page)

    const coachCard = page.getByTestId('advantage-card-coach-advice')
    await expect(coachCard).toHaveAttribute('href', '/app/coach')
    await Promise.all([
      page.waitForURL(/\/app\/coach/, { timeout: 15_000 }),
      coachCard.click(),
    ])

    await openHarness(page)

    const powerCard = page.getByTestId('advantage-card-power-rankings')
    await expect(powerCard).toHaveAttribute('href', '/app/power-rankings')
    await Promise.all([
      page.waitForURL(/\/app\/power-rankings/, { timeout: 15_000 }),
      powerCard.click(),
    ])

    await openHarness(page)

    const simulationCard = page.getByTestId('advantage-card-simulation-insights')
    await expect(simulationCard).toHaveAttribute('href', '/app/matchup-simulation')
    await Promise.all([
      page.waitForURL(/\/app\/matchup-simulation/, { timeout: 15_000 }),
      simulationCard.click(),
    ])
  })
})
