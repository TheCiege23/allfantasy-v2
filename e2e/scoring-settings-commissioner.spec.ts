import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

async function mockScoringSettingsApi(page: Page, leagueId: string) {
  let persisted = {
    leagueId,
    sport: 'NFL',
    leagueVariant: 'IDP',
    formatType: 'IDP-balanced',
    templateId: 'NFL-IDP-balanced',
    rules: [
      {
        statKey: 'passing_td',
        pointsValue: 4,
        multiplier: 1,
        enabled: true,
        defaultPointsValue: 4,
        defaultEnabled: true,
        isOverridden: false,
      },
      {
        statKey: 'solo_tackle',
        pointsValue: 1.5,
        multiplier: 1,
        enabled: true,
        defaultPointsValue: 1.25,
        defaultEnabled: true,
        isOverridden: true,
      },
      {
        statKey: 'interception',
        pointsValue: 2,
        multiplier: 1,
        enabled: true,
        defaultPointsValue: 2,
        defaultEnabled: true,
        isOverridden: false,
      },
    ],
  }

  const capturedPuts: Array<Record<string, unknown>> = []

  await page.route(`**/api/app/league/${leagueId}/scoring/config`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(persisted),
    })
  })

  await page.route(`**/api/commissioner/leagues/${leagueId}/scoring?type=settings`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(persisted),
    })
  })

  await page.route(`**/api/commissioner/leagues/${leagueId}/scoring`, async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.fallback()
      return
    }
    const patch = route.request().postDataJSON() as Record<string, unknown>
    capturedPuts.push(patch)
    const nextRules = Array.isArray(patch.rules)
      ? patch.rules.map((row: any) => ({
          statKey: String(row.statKey),
          pointsValue: Number(row.pointsValue),
          enabled: row.enabled !== false,
        }))
      : []

    persisted = {
      ...persisted,
      rules: persisted.rules.map((rule) => {
        const updated = nextRules.find((r) => r.statKey === rule.statKey)
        if (!updated) return rule
        return {
          ...rule,
          pointsValue: updated.pointsValue,
          enabled: updated.enabled,
          isOverridden:
            Math.abs(updated.pointsValue - rule.defaultPointsValue) > 0.0001 ||
            updated.enabled !== rule.defaultEnabled,
        }
      }),
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(persisted),
    })
  })

  return {
    getPuts: () => capturedPuts,
  }
}

test.describe('@scoring commissioner scoring settings panel', () => {
  test('commissioner can edit scoring categories and persist overrides', async ({ page }) => {
    const leagueId = `e2e-scoring-${Date.now()}`
    const mocks = await mockScoringSettingsApi(page, leagueId)

    await page.goto(`/e2e/scoring-settings?leagueId=${leagueId}`)
    await expect(page.getByRole('heading', { name: /e2e scoring settings harness/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Scoring Settings', exact: true })).toBeVisible()

    await page.getByTestId('scoring-settings-edit-toggle').click()
    await page.getByLabel('solo_tackle points').fill('2.5')
    await page.getByLabel('interception enabled').uncheck()
    await page.getByTestId('scoring-settings-save').click()

    const puts = mocks.getPuts()
    expect(puts.length).toBeGreaterThan(0)
    const latest = puts[puts.length - 1] as { rules?: Array<Record<string, unknown>> }
    expect(Array.isArray(latest.rules)).toBe(true)
    const solo = latest.rules?.find((r) => r.statKey === 'solo_tackle')
    const interception = latest.rules?.find((r) => r.statKey === 'interception')
    expect(solo?.pointsValue).toBe(2.5)
    expect(interception?.enabled).toBe(false)

    await expect(page.getByTestId('scoring-settings-override-count')).toHaveText('2')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Scoring Settings', exact: true })).toBeVisible()
    await page.getByTestId('scoring-settings-edit-toggle').click()
    await expect(page.getByLabel('solo_tackle points')).toHaveValue('2.5')
    await expect(page.getByLabel('interception enabled')).not.toBeChecked()
  })
})
