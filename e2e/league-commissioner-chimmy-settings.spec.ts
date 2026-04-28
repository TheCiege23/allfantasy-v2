import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

async function gotoCommissionerHarnessReady(page: Parameters<typeof test>[0]['page'], leagueId: string) {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    await page.goto(`/e2e/league-commissioner-chimmy-settings?leagueId=${leagueId}`)
    const headingVisible = await page
      .getByRole('heading', { name: /league commissioner chimmy settings harness/i })
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false)
    if (headingVisible) return

    const notFoundVisible = await page
      .getByRole('heading', { name: 'This page could not be found.' })
      .isVisible()
      .catch(() => false)

    if (!notFoundVisible && attempt >= 4) {
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => null)
    }

    if (attempt >= 7) {
      await page.goto(`/e2e/league-commissioner-chimmy-settings?leagueId=${leagueId}`).catch(() => null)
    }
    await page.waitForTimeout(500 * attempt)
  }

  throw new Error('Commissioner Chimmy harness never became ready')
}

test.describe('@commissioner league commissioner Chimmy settings', () => {
  test('renders Chimmy commissioner controls and persists key preference changes', async ({ page }) => {
    const leagueId = `e2e-league-chimmy-${Date.now()}`

    let prefsState: Record<string, unknown> = {
      frequency: 'normal',
      sensitivity: 'normal',
      mutedClasses: [],
      mutedTypes: [],
      channelPreferences: {
        disablePush: false,
        disableEmail: false,
        disableSms: false,
      },
      commissionerPrefs: {
        enabled: true,
        receiveSuspiciousTradeAlerts: true,
        receiveOrphanTeamAlerts: true,
        receiveIntegrityAlerts: true,
      },
    }

    const prefPatches: Array<Record<string, unknown>> = []

    await page.route(`**/api/league/settings?leagueId=${leagueId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userRole: 'commissioner',
          hasAfCommissionerSub: true,
          canEdit: true,
          league: {
            id: leagueId,
            name: 'E2E Chimmy League',
            sport: 'NFL',
            season: 2026,
            timezone: 'America/New_York',
            teamCount: 12,
            isDynasty: false,
            leagueType: 'redraft',
            leagueVariant: 'standard',
            bestBallMode: false,
            autoCoachEnabled: true,
            rosterSize: 18,
            totalRosterSlots: 18,
            teams: [
              {
                id: 'team-1',
                teamName: 'Alpha',
                ownerName: 'Commissioner Alpha',
                isCommissioner: true,
              },
              {
                id: 'team-2',
                teamName: 'Beta',
                ownerName: 'Manager Beta',
                isCommissioner: false,
                isCoCommissioner: false,
              },
            ],
          },
          settings: {
            draftDateUtc: new Date('2026-08-20T23:00:00.000Z').toISOString(),
            timezone: 'America/New_York',
            draftType: 'snake',
            pickTimerPreset: '120s',
            rounds: 15,
            draftOrderMethod: 'manual',
            draftOrderSlots: [
              { slot: 1, ownerId: 'team-1', ownerName: 'Alpha' },
              { slot: 2, ownerId: 'team-2', ownerName: 'Beta' },
            ],
            randomizeHistory: [],
            aiRiskUpsideNotes: true,
          },
        }),
      })
    })

    await page.route('**/api/subscription/entitlements**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hasAccess: true,
          entitlement: {
            plans: ['commissioner'],
            status: 'active',
            currentPeriodEnd: null,
            gracePeriodEnd: null,
          },
        }),
      })
    })

    await page.route(`**/api/leagues/${leagueId}/integrity`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            settings: {
              id: 'integrity-1',
              leagueId,
              collusionSensitivity: 'medium',
              tankingMonitorEnabled: true,
              tankingSensitivity: 'medium',
              tankingStartWeek: 4,
              tankingIllegalLineupCheck: true,
              tankingBenchPatternCheck: true,
              tankingWaiverPatternCheck: false,
            },
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          settings: {
            id: 'integrity-1',
            leagueId,
            collusionSensitivity: 'medium',
            tankingMonitorEnabled: true,
            tankingSensitivity: 'medium',
            tankingStartWeek: 4,
            tankingIllegalLineupCheck: true,
            tankingBenchPatternCheck: true,
            tankingWaiverPatternCheck: false,
          },
          stats: {
            openCollusion: 0,
            openTanking: 0,
          },
        }),
      })
    })

    await page.route('**/api/ai/alerts/preferences', async (route) => {
      if (route.request().method() === 'PATCH') {
        const patch = route.request().postDataJSON() as Record<string, unknown>
        prefPatches.push(patch)
        prefsState = {
          ...prefsState,
          ...patch,
          channelPreferences: {
            ...((prefsState.channelPreferences as Record<string, unknown> | undefined) ?? {}),
            ...((patch.channelPreferences as Record<string, unknown> | undefined) ?? {}),
          },
          commissionerPrefs: {
            ...((prefsState.commissionerPrefs as Record<string, unknown> | undefined) ?? {}),
            ...((patch.commissionerPrefs as Record<string, unknown> | undefined) ?? {}),
          },
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, prefs: prefsState }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ prefs: prefsState }),
      })
    })

    await gotoCommissionerHarnessReady(page, leagueId)

    await expect(page.getByRole('heading', { name: /league commissioner chimmy settings harness/i })).toBeVisible()
    await expect(page.getByText('Chimmy Commissioner Alerts')).toBeVisible()
    await expect(page.getByText('Chimmy Alert Settings')).toBeVisible()

    await page.getByRole('button', { name: 'Reduced' }).click()
    await expect.poll(() => prefPatches.some((p) => p.frequency === 'reduced')).toBe(true)

    await page.getByRole('button', { name: 'Trades' }).click()
    await expect.poll(() =>
      prefPatches.some((p) => Array.isArray(p.mutedClasses) && (p.mutedClasses as string[]).includes('trade')),
    ).toBe(true)

    await page.getByRole('button', { name: 'Push notifications' }).click()
    await expect.poll(() =>
      prefPatches.some(
        (p) =>
          typeof p.channelPreferences === 'object' &&
          p.channelPreferences !== null &&
          (p.channelPreferences as Record<string, unknown>).disablePush === true,
      ),
    ).toBe(true)

    await page.getByRole('button', { name: 'Enable commissioner alerts' }).click()
    await expect.poll(() =>
      prefPatches.some(
        (p) =>
          typeof p.commissionerPrefs === 'object' &&
          p.commissionerPrefs !== null &&
          (p.commissionerPrefs as Record<string, unknown>).enabled === false,
      ),
    ).toBe(true)
  })
})