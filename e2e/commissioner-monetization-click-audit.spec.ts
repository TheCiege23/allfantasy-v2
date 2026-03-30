import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@commissioner commissioner monetization click audit', () => {
  test('locked premium tools show upgrade state while free tools remain usable', async ({ page }) => {
    const leagueId = `e2e-commissioner-monetization-${Date.now()}`
    let waiverRuns = 0

    await page.route('**/api/subscription/entitlements**', async (route) => {
      const url = new URL(route.request().url())
      const feature = String(url.searchParams.get('feature') ?? '')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entitlement: {
            plans: ['pro'],
            status: 'active',
            currentPeriodEnd: null,
            gracePeriodEnd: null,
          },
          hasAccess: false,
          message: 'Upgrade to AF Commissioner to unlock this tool.',
          requiredPlan: feature ? 'AF Commissioner' : null,
          upgradePath: feature
            ? `/commissioner-upgrade?feature=${encodeURIComponent(feature)}`
            : '/commissioner-upgrade',
        }),
      })
    })

    await page.route(`**/api/commissioner/leagues/${leagueId}/waivers?type=pending**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ claims: [] }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/waivers?type=settings**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ waiver_type: 'faab' }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/waivers`, async (route) => {
      if (route.request().method() === 'POST') {
        waiverRuns += 1
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ processed: 0 }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/invite**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          inviteCode: 'abc123',
          inviteLink: `https://example.test/join?code=abc123`,
          joinUrl: `https://example.test/join?code=abc123`,
        }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/managers`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          teams: [],
          rosters: [],
          managers: [{ rosterId: 'r1', userId: 'u1', username: 'manager1', displayName: 'Manager One' }],
        }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/lineup`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ lineupLockRule: 'first_game', invalidRosters: [] }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/draft/session`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session: null }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/settings`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ settings: { leagueChatThreadId: null } }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/prestige-governance?**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ snapshot: null }),
      })
    })
    await page.route(`**/api/tokens/spend/preview?**`, async (route) => {
      const url = new URL(route.request().url())
      const ruleCode = String(url.searchParams.get('ruleCode') ?? '')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preview: {
            ruleCode,
            featureLabel: 'Commissioner action',
            tokenCost: 2,
            currentBalance: 10,
            canSpend: true,
            requiresConfirmation: true,
          },
        }),
      })
    })

    await page.goto(`/e2e/commissioner?leagueId=${leagueId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /e2e commissioner harness/i })).toBeVisible()
    await expect(page.getByText(/commissioner control center/i)).toBeVisible({ timeout: 20_000 })

    await expect(page.getByTestId('commissioner-monetization-overview')).toBeVisible()
    await expect(page.getByTestId('commissioner-paid-league-boundary-copy')).toBeVisible()
    await expect(page.getByTestId('commissioner-monetization-upgrade-link')).toHaveAttribute('href', /commissioner-upgrade/)

    await expect(page.getByTestId('commissioner-tab-advanced-scoring-link')).toHaveAttribute(
      'href',
      /commissioner-upgrade\?feature=advanced_scoring/
    )
    await expect(page.getByTestId('commissioner-tab-ai-team-managers-link')).toHaveAttribute(
      'href',
      /commissioner-upgrade\?feature=ai_team_managers/
    )

    await page.getByRole('button', { name: /run waiver processing now/i }).click()
    await expect.poll(() => waiverRuns).toBe(1)

    const scoringUpgradeHref = await page
      .getByTestId('commissioner-tab-advanced-scoring-link')
      .getAttribute('href')
    expect(scoringUpgradeHref).toMatch(/commissioner-upgrade\?feature=advanced_scoring/)
  })
})

