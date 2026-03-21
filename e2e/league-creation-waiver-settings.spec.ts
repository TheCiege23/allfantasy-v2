import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@waiver league creation waiver step', () => {
  test('sends waiver defaults from wizard into create payload', async ({ page }) => {
    const createdLeagueId = `league-waiver-e2e-${Date.now()}`
    let capturedSettings: Record<string, unknown> | null = null

    await page.route('**/api/leagues/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ templates: [] }),
      })
    })

    await page.route('**/api/league/create', async (route) => {
      const payload = route.request().postDataJSON() as { settings?: Record<string, unknown> }
      capturedSettings = payload.settings ?? null
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          league: {
            id: createdLeagueId,
            name: 'NFL League',
            sport: 'NFL',
          },
        }),
      })
    })

    await page.goto('/create-league?e2eAuth=1')
    await expect(page.getByRole('heading', { name: /create league/i })).toBeVisible()

    for (let i = 0; i < 6; i += 1) {
      await page.getByRole('button', { name: /^next$/i }).click()
    }

    await expect(page.getByText(/waiver settings/i)).toBeVisible()

    await page.getByLabel('Waiver type').selectOption('rolling')
    await page.getByLabel('Processing time (UTC)').fill('09:30')
    await page.getByLabel('Thu').check()
    await page.getByLabel('Claim priority').selectOption('priority_lowest_first')
    await page.getByLabel('Max claims per period').fill('8')
    await page.getByLabel('Free agent unlock').selectOption('daily')
    await page.getByLabel('Game lock behavior').selectOption('first_game')
    await page.getByLabel('Same-day add/drop').selectOption('disallow')
    await page.getByLabel('Continuous waivers').check()
    await page.getByLabel('Enable FAAB').check()
    await page.getByLabel('FAAB budget').fill('150')

    for (let i = 0; i < 6; i += 1) {
      await page.getByRole('button', { name: /^next$/i }).click()
    }
    await expect(page.getByRole('button', { name: /create league/i })).toBeVisible()

    await page.getByRole('button', { name: /create league/i }).click()
    await page.waitForURL(`**/app/league/${createdLeagueId}`)
    await expect(page).toHaveURL(new RegExp(`/app/league/${createdLeagueId}$`))

    expect(capturedSettings).toBeTruthy()
    expect(capturedSettings).toMatchObject({
      waiver_type: 'faab',
      waiver_processing_time_utc: '09:30',
      faab_enabled: true,
      faab_budget: 150,
      waiver_claim_priority_behavior: 'priority_lowest_first',
      waiver_free_agent_unlock_behavior: 'daily',
      waiver_game_lock_behavior: 'first_game',
      waiver_same_day_add_drop_rules: 'disallow',
      waiver_continuous_waivers_behavior: true,
      waiver_max_claims_per_period: 8,
    })
    const settingsRecord = (capturedSettings ?? {}) as Record<string, unknown>
    const days = Array.isArray(settingsRecord.waiver_processing_days)
      ? (settingsRecord.waiver_processing_days as number[])
      : []
    expect(days).toContain(4)
  })
})
