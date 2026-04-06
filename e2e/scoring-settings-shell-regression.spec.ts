import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@scoring scoring settings full-shell regression', () => {
  test('edits and persists scoring overrides from /app/league shell settings tab', async ({ page }) => {
    const runFullShellE2E = process.env.PLAYWRIGHT_ENABLE_FULL_SHELL === '1'
    test.skip(
      !runFullShellE2E,
      'Set PLAYWRIGHT_ENABLE_FULL_SHELL=1 in a fully configured env to run /app shell regression.'
    )

    const leagueId = `e2e-scoring-shell-${Date.now()}`
    let scoringState = {
      leagueId,
      sport: 'NFL',
      leagueVariant: 'IDP',
      formatType: 'IDP-balanced',
      templateId: 'default-NFL-IDP-balanced',
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
          statKey: 'idp_solo_tackle',
          pointsValue: 1.5,
          multiplier: 1,
          enabled: true,
          defaultPointsValue: 1,
          defaultEnabled: true,
          isOverridden: true,
        },
        {
          statKey: 'idp_interception',
          pointsValue: 3,
          multiplier: 1,
          enabled: true,
          defaultPointsValue: 3,
          defaultEnabled: true,
          isOverridden: false,
        },
      ],
    }
    const scoringPuts: Array<Record<string, unknown>> = []

    await page.route(`**/api/leagues/${leagueId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: leagueId,
          name: 'Scoring Shell League',
          leagueVariant: 'idp',
          leagueType: 'dynasty',
          isDynasty: true,
        }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/check**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isCommissioner: true }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/matchups`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          label: 'week',
          selectedWeekOrRound: 1,
          totalWeeksOrRounds: 18,
          availableWeeks: [1],
          matchups: [],
        }),
      })
    })
    await page.route('**/api/sports/live-scores**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ scores: [] }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/tournament-context`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tournament: null }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/settings`, async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: leagueId,
            name: 'Scoring Shell League',
            description: null,
            sport: 'NFL',
            season: 2026,
            leagueSize: 12,
            rosterSize: 22,
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: leagueId,
          name: 'Scoring Shell League',
          description: null,
          sport: 'NFL',
          season: 2026,
          leagueSize: 12,
          rosterSize: 22,
        }),
      })
    })
    await page.route(`**/api/app/league/${leagueId}/scoring/config`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scoringState),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/scoring?type=settings`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scoringState),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/scoring`, async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fallback()
        return
      }
      const payload = route.request().postDataJSON() as Record<string, unknown>
      scoringPuts.push(payload)
      const nextRules = Array.isArray(payload.rules)
        ? payload.rules.map((row: any) => ({
            statKey: String(row.statKey),
            pointsValue: Number(row.pointsValue),
            enabled: row.enabled !== false,
          }))
        : []

      scoringState = {
        ...scoringState,
        rules: scoringState.rules.map((rule) => {
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
        body: JSON.stringify(scoringState),
      })
    })

    await page.goto(`/league/${leagueId}?tab=Settings`)
    await expect(page).toHaveURL(new RegExp(`/league/${leagueId}\\?tab=Settings`))
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Scoring Settings', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Scoring Settings', exact: true })
    ).toBeVisible()

    await page.getByTestId('scoring-settings-edit-toggle').click()
    await page.getByLabel('idp_solo_tackle points').fill('2.25')
    await page.getByLabel('idp_interception enabled').uncheck()
    await page.getByTestId('scoring-settings-save').click()

    expect(scoringPuts.length).toBeGreaterThan(0)
    const latest = scoringPuts[scoringPuts.length - 1] as { rules?: Array<Record<string, unknown>> }
    const solo = latest.rules?.find((r) => r.statKey === 'idp_solo_tackle')
    const interception = latest.rules?.find((r) => r.statKey === 'idp_interception')
    expect(solo?.pointsValue).toBe(2.25)
    expect(interception?.enabled).toBe(false)
    await expect(page.getByTestId('scoring-settings-override-count')).toHaveText('2')

    await page.reload()
    await page.getByRole('button', { name: 'Scoring Settings', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Scoring Settings', exact: true })
    ).toBeVisible()
    await page.getByTestId('scoring-settings-edit-toggle').click()
    await expect(page.getByLabel('idp_solo_tackle points')).toHaveValue('2.25')
    await expect(page.getByLabel('idp_interception enabled')).not.toBeChecked()
  })
})
