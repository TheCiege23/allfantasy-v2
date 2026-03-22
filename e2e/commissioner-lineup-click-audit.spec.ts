import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@commissioner commissioner lineup click audit', () => {
  test('loads lineup validity, updates lock rule, and force-corrects invalid roster', async ({ page }) => {
    const leagueId = `e2e-commissioner-${Date.now()}`
    let lineupState: {
      lineupLockRule: string | null
      invalidRosters: Array<{ rosterId: string; platformUserId: string | null; reason: string }>
      message?: string
    } = {
      lineupLockRule: 'first_game',
      invalidRosters: [
        {
          rosterId: 'roster-bad-1',
          platformUserId: 'u-1',
          reason: 'STARTERS has 12 players, max 10.',
        },
      ],
      message: 'Roster validity is checked against the league sport/variant template.',
    }
    const lineupPosts: Array<Record<string, unknown>> = []

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
            removedPlayerIds: ['player-removed-1'],
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

    await page.goto(`/e2e/commissioner?leagueId=${leagueId}`)
    await expect(page.getByRole('heading', { name: /e2e commissioner harness/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /lineup \/ roster/i })).toBeVisible()
    await expect(page.getByTestId('commissioner-lineup-lock-rule-input')).toHaveValue('first_game')
    await expect(
      page.getByTestId('commissioner-lineup-invalid-roster-roster-bad-1')
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
    await page.getByTestId('commissioner-lineup-force-correct-roster-bad-1').click()
    await forceCorrectRequest

    expect(lineupPosts.some((p) => p.forceCorrectRosterId === 'roster-bad-1')).toBe(true)
    await expect(page.getByTestId('commissioner-lineup-invalid-roster-roster-bad-1')).not.toBeVisible()
    await expect(page.getByTestId('commissioner-lineup-no-invalid-rosters')).toBeVisible()
  })
})
