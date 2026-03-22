import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@commissioner commissioner lineup full-shell regression', () => {
  test('supports lock rule save and force-correct from /app/league shell', async ({ page }) => {
    const runFullShellE2E = process.env.PLAYWRIGHT_ENABLE_FULL_SHELL === '1'
    test.skip(
      !runFullShellE2E,
      'Set PLAYWRIGHT_ENABLE_FULL_SHELL=1 in a fully configured env to run /app shell regression.'
    )

    const leagueId = `e2e-commissioner-shell-${Date.now()}`
    let lineupState: {
      lineupLockRule: string | null
      invalidRosters: Array<{ rosterId: string; platformUserId: string | null; reason: string }>
      message?: string
    } = {
      lineupLockRule: 'first_game',
      invalidRosters: [
        {
          rosterId: 'roster-shell-bad-1',
          platformUserId: 'u-1',
          reason: 'Starter position DE is not eligible for this league template.',
        },
      ],
      message: 'Roster validity is checked against the league sport/variant template.',
    }
    const lineupPosts: Array<Record<string, unknown>> = []

    await page.route(`**/api/leagues/${leagueId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: leagueId,
          name: 'Commissioner Shell League',
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
        body: JSON.stringify({ label: 'week', selectedWeekOrRound: 1, matchups: [] }),
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
    await page.route(`**/api/commissioner/leagues/${leagueId}/invite`, async (route) => {
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
        body: JSON.stringify({ teams: [], rosters: [], managers: [] }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/settings`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ settings: { leagueChatThreadId: null } }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/draft/session`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session: null }),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/lineup`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(lineupState),
        })
        return
      }
      const payload = route.request().postDataJSON() as Record<string, unknown>
      lineupPosts.push(payload)
      if (typeof payload.lineupLockRule === 'string' || payload.lineupLockRule === null) {
        lineupState = {
          ...lineupState,
          lineupLockRule: (payload.lineupLockRule as string | null) ?? null,
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: leagueId, settings: { lineupLockRule: lineupState.lineupLockRule } }),
        })
        return
      }
      if (typeof payload.forceCorrectRosterId === 'string') {
        lineupState = {
          ...lineupState,
          invalidRosters: lineupState.invalidRosters.filter((r) => r.rosterId !== payload.forceCorrectRosterId),
          message: 'All roster lineups currently match this league template.',
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            message: 'Roster corrected to match template. Removed 1 overflow/ineligible player(s).',
            rosterId: payload.forceCorrectRosterId,
            removedPlayerIds: ['player-shell-removed-1'],
            remainingPlayerCount: 10,
          }),
        })
        return
      }
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unsupported payload in test mock' }),
      })
    })

    await page.goto(`/app/league/${leagueId}?tab=Commissioner`)
    await expect(page).toHaveURL(new RegExp(`/app/league/${leagueId}\\?tab=Commissioner`))
    await expect(page.getByTestId('commissioner-lineup-lock-rule-input')).toBeVisible()
    await expect(page.getByTestId('commissioner-lineup-lock-rule-input')).toHaveValue('first_game')
    await expect(
      page.getByTestId('commissioner-lineup-invalid-roster-roster-shell-bad-1')
    ).toBeVisible()

    const lockRuleRequest = page.waitForRequest((request) => {
      return (
        request.method() === 'POST' &&
        request.url().includes(`/api/commissioner/leagues/${leagueId}/lineup`) &&
        (request.postData()?.includes('lineupLockRule') ?? false)
      )
    })
    await page.getByTestId('commissioner-lineup-lock-rule-input').fill('manual_lock')
    await page.getByTestId('commissioner-lineup-lock-rule-save').click()
    await lockRuleRequest

    expect(lineupPosts.some((p) => p.lineupLockRule === 'manual_lock')).toBe(true)
    await expect(page.getByText(/lock rule: manual_lock/i)).toBeVisible()

    const forceCorrectRequest = page.waitForRequest((request) => {
      return (
        request.method() === 'POST' &&
        request.url().includes(`/api/commissioner/leagues/${leagueId}/lineup`) &&
        (request.postData()?.includes('forceCorrectRosterId') ?? false)
      )
    })
    await page.getByTestId('commissioner-lineup-force-correct-roster-shell-bad-1').click()
    await forceCorrectRequest

    expect(lineupPosts.some((p) => p.forceCorrectRosterId === 'roster-shell-bad-1')).toBe(true)
    await expect(
      page.getByTestId('commissioner-lineup-invalid-roster-roster-shell-bad-1')
    ).not.toBeVisible()
    await expect(page.getByTestId('commissioner-lineup-no-invalid-rosters')).toBeVisible()
  })
})
