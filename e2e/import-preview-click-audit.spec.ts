import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

function buildPreviewPayload(provider: string) {
  return {
    dataQuality: {
      fetchedAt: Date.now(),
      sources: {
        users: true,
        rosters: true,
        matchups: true,
        trades: true,
        draftPicks: true,
        playerMap: true,
        history: false,
      },
      rosterCoverage: 100,
      matchupWeeksCovered: 14,
      completenessScore: 87,
      tier: 'FULL',
      signals: [],
      coverageSummary: [
        { key: 'leagueSettings', label: 'League settings', state: 'full', count: 1 },
        { key: 'currentRosters', label: 'Current rosters', state: 'full', count: 3 },
        { key: 'scoringSettings', label: 'Scoring settings', state: 'full', count: 1 },
      ],
    },
    league: {
      id: `preview-${provider}`,
      name: `${provider.toUpperCase()} Import Audit League`,
      sport: 'NFL',
      season: 2026,
      type: 'Dynasty',
      teamCount: 12,
      playoffTeams: 6,
      avatar: 'https://cdn.example/league-avatar.png',
      settings: {
        ppr: true,
        superflex: true,
        tep: false,
      },
    },
    managers: [
      {
        rosterId: 'roster-1',
        ownerId: 'owner-1',
        username: 'manager1',
        displayName: 'Manager One',
        teamName: 'Kansas City',
        teamAbbreviation: 'KC',
        teamLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
        managerAvatar: 'https://cdn.example/manager-1.png',
        avatar: 'https://cdn.example/manager-1.png',
        wins: 11,
        losses: 3,
        ties: 0,
        pointsFor: '1432.54',
        rosterSize: 24,
        starters: ['p1', 'p2'],
        players: ['p1', 'p2', 'p3'],
        reserve: [],
        taxi: [],
      },
      {
        rosterId: 'roster-2',
        ownerId: 'owner-2',
        username: 'manager2',
        displayName: 'Manager Two',
        teamName: 'Dallas',
        teamAbbreviation: 'DAL',
        teamLogo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
        managerAvatar: null,
        avatar: null,
        wins: 8,
        losses: 6,
        ties: 0,
        pointsFor: '1277.12',
        rosterSize: 23,
        starters: ['p4', 'p5'],
        players: ['p4', 'p5', 'p6'],
        reserve: [],
        taxi: [],
      },
      {
        rosterId: 'roster-3',
        ownerId: 'owner-3',
        username: 'manager3',
        displayName: 'Manager Three',
        teamName: 'Unknown Team',
        teamAbbreviation: null,
        teamLogo: null,
        managerAvatar: null,
        avatar: null,
        wins: 6,
        losses: 8,
        ties: 0,
        pointsFor: '1189.50',
        rosterSize: 22,
        starters: ['p7', 'p8'],
        players: ['p7', 'p8', 'p9'],
        reserve: [],
        taxi: [],
      },
    ],
    rosterPositions: ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX'],
    playerMap: {},
    draftPickCount: 42,
    transactionCount: 15,
    matchupWeeks: 14,
    source: {
      source_provider: provider,
      source_league_id: `${provider}-source-123`,
      imported_at: new Date('2026-03-21T00:00:00.000Z').toISOString(),
    },
  }
}

async function switchToImportMode(page: Page) {
  await page.getByRole('combobox', { name: /league creation mode/i }).click()
  await page.getByRole('option', { name: /import existing league/i }).click()
  await expect(page.locator('#import-source-input')).toBeVisible()
}

test.describe('@import import preview click audit', () => {
  test('audits import preview, back action, submit errors, and success redirects', async ({ page }) => {
    const previewRequests: Array<{ provider?: string; sourceId?: string }> = []
    const sleeperCreateRequests: Array<Record<string, unknown>> = []
    const commitRequests: Array<Record<string, unknown>> = []

    await page.route('**/api/leagues/templates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ templates: [] }),
      })
    })

    let previewCallCount = 0
    await page.route('**/api/leagues/import/preview', async (route) => {
      const payload = route.request().postDataJSON() as { provider?: string; sourceId?: string }
      previewRequests.push(payload)

      // First preview call intentionally fails to exercise error path.
      if (previewCallCount === 0) {
        previewCallCount += 1
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'League not found in provider import' }),
        })
        return
      }

      const provider = String(payload.provider ?? 'sleeper')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildPreviewPayload(provider)),
      })
    })

    let sleeperCreateCallCount = 0
    await page.route('**/api/league/create', async (route) => {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      sleeperCreateRequests.push(payload)
      sleeperCreateCallCount += 1

      // First create call fails to exercise error path; second succeeds.
      if (sleeperCreateCallCount === 1) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'This league already exists in your account' }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          league: {
            id: 'imported-sleeper-league',
            name: 'Sleeper Imported League',
            sport: 'NFL',
          },
        }),
      })
    })

    await page.route('**/api/leagues/import/commit', async (route) => {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      commitRequests.push(payload)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leagueId: 'imported-espn-league',
          name: 'ESPN Imported League',
          sport: 'NFL',
          league: {
            id: 'imported-espn-league',
            name: 'ESPN Imported League',
            sport: 'NFL',
          },
        }),
      })
    })

    await page.goto('/create-league?e2eAuth=1')
    await switchToImportMode(page)

    // Preview error path.
    await page.getByLabel(/sleeper league id/i).fill('sleeper-bad-id')
    await page.getByRole('button', { name: /fetch & preview/i }).click()
    await expect(page.getByTestId('import-preview-panel')).toHaveCount(0)
    await expect(page).toHaveURL(/\/create-league\?e2eAuth=1/)

    // Preview success path + identity/logo rendering.
    await page.getByLabel(/sleeper league id/i).fill('sleeper-good-id')
    await page.getByRole('button', { name: /fetch & preview/i }).click()
    await expect(page.getByTestId('import-preview-panel')).toBeVisible()
    await expect(page.getByTestId('import-preview-team-logo-count')).toContainText('2/3')
    await expect(page.getByTestId('import-preview-manager-row-roster-1')).toContainText('Manager: Manager One')
    await expect(page.getByTestId('import-preview-team-logo-roster-1')).toBeVisible()
    await expect(page.getByTestId('import-preview-manager-avatar-roster-1')).toBeVisible()
    await expect(page.getByTestId('import-preview-manager-row-roster-3')).toContainText('Unknown Team')

    // Back action should clear preview and let the user re-fetch.
    await page.getByTestId('import-preview-back-button').click()
    await expect(page.getByTestId('import-preview-panel')).toHaveCount(0)
    await page.getByRole('button', { name: /fetch & preview/i }).click()
    await expect(page.getByTestId('import-preview-panel')).toBeVisible()

    // Sleeper create path: error then success.
    await page.getByTestId('import-preview-create-button').click()
    await expect(page).toHaveURL(/\/create-league\?e2eAuth=1/)
    await page.getByTestId('import-preview-create-button').click()
    await page.waitForURL('**/app/league/imported-sleeper-league')
    await expect(page).toHaveURL(/\/app\/league\/imported-sleeper-league$/)

    // Non-sleeper create path should use /api/leagues/import/commit.
    await page.goto('/create-league?e2eAuth=1')
    await switchToImportMode(page)
    await page.getByRole('combobox', { name: /import provider/i }).click()
    await page.getByRole('option', { name: /^ESPN$/i }).click()
    await page.getByLabel(/espn league id/i).fill('espn-league-id-123')
    await page.getByRole('button', { name: /fetch & preview/i }).click()
    await expect(page.getByTestId('import-preview-panel')).toBeVisible()
    await page.getByTestId('import-preview-create-button').click()
    await page.waitForURL('**/app/league/imported-espn-league')
    await expect(page).toHaveURL(/\/app\/league\/imported-espn-league$/)

    expect(previewRequests.length).toBeGreaterThanOrEqual(4)
    expect(previewRequests.some((r) => r.provider === 'sleeper')).toBe(true)
    expect(previewRequests.some((r) => r.provider === 'espn')).toBe(true)

    expect(sleeperCreateRequests.length).toBe(2)
    expect(sleeperCreateRequests[0]).toMatchObject({
      platform: 'sleeper',
      createFromSleeperImport: true,
      sleeperLeagueId: 'sleeper-good-id',
    })

    expect(commitRequests.length).toBe(1)
    expect(commitRequests[0]).toMatchObject({
      provider: 'espn',
      sourceId: 'espn-league-id-123',
    })
  })
})
