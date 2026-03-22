import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@commissioner ai commissioner click audit', () => {
  test('wires commissioner settings, alert actions, and AI explain end-to-end', async ({ page }) => {
    const leagueId = `e2e-ai-commissioner-${Date.now()}`
    const season = 2026

    interface MockAlert {
      alertId: string
      leagueId: string
      sport: string
      alertType: string
      severity: string
      headline: string
      summary: string
      relatedManagerIds: string[]
      relatedTradeId: string | null
      relatedMatchupId: string | null
      status: string
      snoozedUntil: string | null
      createdAt: string
      resolvedAt: string | null
    }

    const configState: {
      configId: string
      leagueId: string
      sport: string
      remindersEnabled: boolean
      disputeAnalysisEnabled: boolean
      collusionMonitoringEnabled: boolean
      voteSuggestionEnabled: boolean
      inactivityMonitoringEnabled: boolean
      commissionerNotificationMode: string
      updatedAt: string
    } = {
      configId: 'cfg-1',
      leagueId,
      sport: 'NFL',
      remindersEnabled: true,
      disputeAnalysisEnabled: true,
      collusionMonitoringEnabled: true,
      voteSuggestionEnabled: true,
      inactivityMonitoringEnabled: true,
      commissionerNotificationMode: 'in_app',
      updatedAt: new Date().toISOString(),
    }
    let alertsState: MockAlert[] = [
      {
        alertId: 'alert-1',
        leagueId,
        sport: 'NFL',
        alertType: 'COLLUSION_SIGNAL',
        severity: 'high',
        headline: 'Potential collusion signal detected',
        summary: 'Repeated trade concentration detected between two managers.',
        relatedManagerIds: ['m-a', 'm-b'],
        relatedTradeId: 'trade-1',
        relatedMatchupId: null,
        status: 'open',
        snoozedUntil: null,
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      },
    ]
    const actionLogs: Array<{
      actionId: string
      actionType: string
      source: string
      summary: string
      createdAt: string
    }> = []

    const configPatches: Array<Record<string, unknown>> = []
    const runPosts: Array<Record<string, unknown>> = []
    const alertPosts: Array<Record<string, unknown>> = []
    const explainPosts: Array<Record<string, unknown>> = []

    const buildOverview = () => ({
      leagueId,
      sport: configState.sport,
      season,
      config: { ...configState },
      alerts: [...alertsState],
      actionLogs: [...actionLogs],
    })

    await page.route(`**/api/commissioner/leagues/${leagueId}/waivers?type=pending**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ claims: [] }) })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/waivers?type=settings**`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ waiver_type: 'faab' }) })
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
    await page.route(`**/api/commissioner/leagues/${leagueId}/lineup`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ lineupLockRule: 'first_game', invalidRosters: [] }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: leagueId, settings: { lineupLockRule: 'first_game' } }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/draft/session`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session: null }) })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/settings`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ settings: { leagueChatThreadId: 'thread-e2e-1' } }),
      })
    })

    await page.route(`**/api/leagues/${leagueId}/ai-commissioner/config`, async (route) => {
      if (route.request().method() === 'PATCH') {
        const payload = route.request().postDataJSON() as Record<string, unknown>
        configPatches.push(payload)
        Object.assign(configState, payload, { updatedAt: new Date().toISOString() })
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(configState),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/ai-commissioner/run`, async (route) => {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      runPosts.push(payload)
      alertsState = [
        {
          alertId: `alert-run-${alertsState.length + 1}`,
          leagueId,
          sport: String(payload.sport ?? configState.sport),
          alertType: 'LINEUP_REMINDER',
          severity: 'medium',
          headline: 'Lineup lock reminders are active',
          summary: 'Commissioner reminders scheduled before lineup lock.',
          relatedManagerIds: [],
          relatedTradeId: null,
          relatedMatchupId: null,
          status: 'open',
          snoozedUntil: null,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
        },
        ...alertsState,
      ]
      actionLogs.unshift({
        actionId: `act-${Date.now()}`,
        actionType: 'RUN_CYCLE',
        source: 'commissioner_ui',
        summary: 'Cycle run completed.',
        createdAt: new Date().toISOString(),
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          config: configState,
          analysis: {},
          createdAlerts: [alertsState[0]],
          touchedAlerts: alertsState.length,
        }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/ai-commissioner/explain`, async (route) => {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      explainPosts.push(payload)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          narrative:
            'This alert is high priority because repeated manager concentration and trade imbalance exceed your configured governance thresholds.',
          source: 'template',
        }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/ai-commissioner/alerts/**`, async (route) => {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      alertPosts.push(payload)
      const url = new URL(route.request().url())
      const alertId = url.pathname.split('/').pop() || ''
      const action = String(payload.action ?? '')
      alertsState = alertsState.map((alert): MockAlert => {
        if (alert.alertId !== alertId) return alert
        if (action === 'approve') return { ...alert, status: 'approved', resolvedAt: null, snoozedUntil: null }
        if (action === 'dismiss') return { ...alert, status: 'dismissed', resolvedAt: new Date().toISOString(), snoozedUntil: null }
        if (action === 'resolve') return { ...alert, status: 'resolved', resolvedAt: new Date().toISOString(), snoozedUntil: null }
        if (action === 'reopen') return { ...alert, status: 'open', resolvedAt: null, snoozedUntil: null }
        if (action === 'snooze') {
          return {
            ...alert,
            status: 'snoozed',
            snoozedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            resolvedAt: null,
          }
        }
        return alert
      })
      actionLogs.unshift({
        actionId: `act-${Date.now()}`,
        actionType: `ALERT_${action.toUpperCase()}`,
        source: 'commissioner_ui',
        summary: `${action} action applied.`,
        createdAt: new Date().toISOString(),
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/ai-commissioner?**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildOverview()),
      })
    })
    await page.route(`**/api/leagues/${leagueId}/ai-commissioner`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildOverview()),
      })
    })

    await page.goto(`/e2e/commissioner?leagueId=${leagueId}`)
    await expect(page.getByRole('heading', { name: /e2e commissioner harness/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /ai commissioner/i })).toBeVisible()

    await page.getByTestId('ai-commissioner-sport').selectOption('NBA')
    await page.getByTestId('ai-commissioner-season').fill('2026')
    await page.getByTestId('ai-commissioner-refresh').click()

    const remindersToggle = page.getByRole('checkbox', { name: /lineup reminders/i }).first()
    await remindersToggle.uncheck()
    await page.getByTestId('ai-commissioner-save-config').click()
    await expect.poll(() => configPatches.length).toBeGreaterThan(0)
    expect(configPatches.some((p) => p.remindersEnabled === false)).toBe(true)

    await page.getByTestId('ai-commissioner-run').click()
    await expect.poll(() => runPosts.length).toBeGreaterThan(0)
    await expect(page.getByText(/lineup lock reminders are active/i)).toBeVisible()

    await page.getByRole('button', { name: 'AI explain' }).first().click()
    await expect.poll(() => explainPosts.length).toBeGreaterThan(0)
    await expect(page.getByText(/high priority because repeated manager concentration/i)).toBeVisible()

    await page.getByRole('button', { name: 'Snooze 24h' }).first().click()
    await expect.poll(() => alertPosts.some((p) => p.action === 'snooze')).toBeTruthy()
    await expect(page.getByText(/status snoozed/i).first()).toBeVisible()

    await page.getByRole('button', { name: 'Send notice' }).first().click()
    await expect.poll(() => alertPosts.some((p) => p.action === 'send_notice')).toBeTruthy()

    await page.getByRole('button', { name: 'Resolve' }).first().click()
    await expect.poll(() => alertPosts.some((p) => p.action === 'resolve')).toBeTruthy()
    await expect(page.getByText(/status resolved/i).first()).toBeVisible()
  })
})
