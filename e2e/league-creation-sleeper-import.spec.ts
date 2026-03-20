import { test, expect } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

async function mockLeagueTemplates(page: import('@playwright/test').Page) {
  await page.route('**/api/leagues/templates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ templates: [] }),
    })
  })
}

async function mockSleeperPreview(
  page: import('@playwright/test').Page,
  sleeperSourceId: string
) {
  await page.route('**/api/leagues/import/preview', async (route) => {
    const payload = route.request().postDataJSON() as { provider?: string; sourceId?: string }
    expect(payload.provider).toBe('sleeper')
    expect(payload.sourceId).toBe(sleeperSourceId)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        dataQuality: {
          fetchedAt: Date.now(),
          sources: {
            users: true,
            rosters: true,
            matchups: true,
            trades: true,
            draftPicks: true,
            playerMap: true,
            history: true,
          },
          rosterCoverage: 100,
          matchupWeeksCovered: 14,
          completenessScore: 92,
          tier: 'FULL',
          signals: [],
          coverageSummary: [
            { key: 'leagueSettings', label: 'League settings', state: 'full' },
            { key: 'currentRosters', label: 'Current rosters', state: 'full' },
            { key: 'currentSchedule', label: 'Schedule', state: 'full' },
          ],
        },
        league: {
          id: sleeperSourceId,
          name: 'E2E Sleeper League',
          sport: 'NFL',
          season: 2025,
          type: 'Dynasty',
          teamCount: 12,
          playoffTeams: 6,
          avatar: null,
          settings: {
            ppr: true,
            superflex: true,
            tep: false,
            rosterPositions: ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX'],
          },
        },
        managers: [
          {
            rosterId: '1',
            ownerId: 'u1',
            username: 'manager1',
            displayName: 'Manager One',
            avatar: null,
            wins: 8,
            losses: 6,
            ties: 0,
            pointsFor: '1450.20',
            rosterSize: 30,
            starters: ['p1'],
            players: ['p1', 'p2'],
            reserve: [],
            taxi: [],
          },
        ],
        rosterPositions: ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX'],
        playerMap: {
          p1: { name: 'Player One', position: 'QB', team: 'KC' },
        },
        draftPickCount: 48,
        transactionCount: 64,
        matchupWeeks: 14,
        source: {
          source_provider: 'sleeper',
          source_league_id: sleeperSourceId,
          imported_at: new Date().toISOString(),
        },
      }),
    })
  })
}

async function mockImportPreview(
  page: import('@playwright/test').Page,
  args: { provider: string; sourceId: string; leagueName: string; sport: string }
) {
  await page.route('**/api/leagues/import/preview', async (route) => {
    const payload = route.request().postDataJSON() as { provider?: string; sourceId?: string }
    expect(payload.provider).toBe(args.provider)
    expect(payload.sourceId).toBe(args.sourceId)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        dataQuality: {
          fetchedAt: Date.now(),
          sources: {
            users: true,
            rosters: true,
            matchups: true,
            trades: true,
            draftPicks: true,
            playerMap: true,
            history: true,
          },
          rosterCoverage: 100,
          matchupWeeksCovered: 12,
          completenessScore: 90,
          tier: 'FULL',
          signals: [],
          coverageSummary: [
            { key: 'leagueSettings', label: 'League settings', state: 'full' },
            { key: 'currentRosters', label: 'Current rosters', state: 'full' },
            { key: 'currentSchedule', label: 'Schedule', state: 'full' },
          ],
        },
        league: {
          id: args.sourceId,
          name: args.leagueName,
          sport: args.sport,
          season: 2025,
          type: 'Dynasty',
          teamCount: 12,
          playoffTeams: 6,
          avatar: null,
          settings: {
            ppr: true,
            superflex: true,
            tep: false,
            rosterPositions: ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX'],
          },
        },
        managers: [
          {
            rosterId: '1',
            ownerId: 'u1',
            username: 'manager1',
            displayName: 'Manager One',
            avatar: null,
            wins: 8,
            losses: 6,
            ties: 0,
            pointsFor: '1450.20',
            rosterSize: 30,
            starters: ['p1'],
            players: ['p1', 'p2'],
            reserve: [],
            taxi: [],
          },
        ],
        rosterPositions: ['QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX'],
        playerMap: {
          p1: { name: 'Player One', position: 'QB', team: 'KC' },
        },
        draftPickCount: 48,
        transactionCount: 64,
        matchupWeeks: 12,
        source: {
          source_provider: args.provider,
          source_league_id: args.sourceId,
          imported_at: new Date().toISOString(),
        },
      }),
    })
  })
}

async function openImportPreviewFlow(
  page: import('@playwright/test').Page,
  sleeperSourceId: string
) {
  await page.goto('/create-league?e2eAuth=1')
  await expect(page.getByRole('heading', { name: /create league/i })).toBeVisible()

  await page.getByRole('combobox', { name: /league creation mode/i }).click()
  await page.getByRole('option', { name: /import existing league/i }).click()
  await page.fill('#import-source-input', sleeperSourceId)
  await page.getByRole('button', { name: /fetch & preview/i }).click()
  await expect(page.getByText(/import preview: e2e sleeper league/i)).toBeVisible()
}

async function openImportPreviewFlowForProvider(
  page: import('@playwright/test').Page,
  args: { providerLabel: RegExp; sourceId: string; leagueName: RegExp }
) {
  await page.goto('/create-league?e2eAuth=1')
  await expect(page.getByRole('heading', { name: /create league/i })).toBeVisible()

  await page.getByRole('combobox', { name: /league creation mode/i }).click()
  await page.getByRole('option', { name: /import existing league/i }).click()

  const providerSelect = page.getByRole('combobox').nth(1)
  await providerSelect.click()
  await page.getByRole('option', { name: args.providerLabel }).click()

  await page.fill('#import-source-input', args.sourceId)
  await page.getByRole('button', { name: /fetch & preview/i }).click()
  await expect(page.getByText(args.leagueName)).toBeVisible()
}

test('creates league from Sleeper import via creation UI', async ({ page }) => {
  const mockedLeagueId = `league-imported-e2e-${Date.now()}`
  const sleeperSourceId = `123456789${Date.now()}`

  await mockLeagueTemplates(page)
  await mockSleeperPreview(page, sleeperSourceId)

  await page.route('**/api/league/create', async (route) => {
    const payload = route.request().postDataJSON() as {
      platform?: string
      createFromSleeperImport?: boolean
      sleeperLeagueId?: string
    }
    expect(payload.platform).toBe('sleeper')
    expect(payload.createFromSleeperImport).toBe(true)
    expect(payload.sleeperLeagueId).toBe(sleeperSourceId)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        league: {
          id: mockedLeagueId,
          name: 'E2E Sleeper League',
          sport: 'NFL',
        },
        historicalBackfill: {
          status: 'queued',
        },
      }),
    })
  })

  await openImportPreviewFlow(page, sleeperSourceId)
  await expect(page.getByText(/data quality: full/i)).toBeVisible()
  await expect(page.getByText(/manager one/i)).toBeVisible()

  await page.getByRole('button', { name: /create league from import/i }).click()
  await page.waitForURL(`**/app/league/${mockedLeagueId}`)
  await expect(page).toHaveURL(new RegExp(`/app/league/${mockedLeagueId}$`))
})

test('creates league from ESPN import via creation UI', async ({ page }) => {
  const sourceId = `2025:${Date.now()}`
  const mockedLeagueId = `league-imported-espn-${Date.now()}`

  await mockLeagueTemplates(page)
  await mockImportPreview(page, {
    provider: 'espn',
    sourceId,
    leagueName: 'E2E ESPN League',
    sport: 'NBA',
  })

  await page.route('**/api/leagues/import/commit', async (route) => {
    const payload = route.request().postDataJSON() as { provider?: string; sourceId?: string }
    expect(payload.provider).toBe('espn')
    expect(payload.sourceId).toBe(sourceId)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagueId: mockedLeagueId,
        name: 'E2E ESPN League',
        sport: 'NBA',
        league: { id: mockedLeagueId, name: 'E2E ESPN League', sport: 'NBA' },
      }),
    })
  })

  await openImportPreviewFlowForProvider(page, {
    providerLabel: /^ESPN$/i,
    sourceId,
    leagueName: /import preview: e2e espn league/i,
  })
  await page.getByRole('button', { name: /create league from import/i }).click()
  await page.waitForURL(`**/app/league/${mockedLeagueId}`)
  await expect(page).toHaveURL(new RegExp(`/app/league/${mockedLeagueId}$`))
})

test('creates league from Yahoo import via creation UI', async ({ page }) => {
  const sourceId = `461.l.${Date.now()}`
  const mockedLeagueId = `league-imported-yahoo-${Date.now()}`

  await mockLeagueTemplates(page)
  await mockImportPreview(page, {
    provider: 'yahoo',
    sourceId,
    leagueName: 'E2E Yahoo League',
    sport: 'NHL',
  })

  await page.route('**/api/leagues/import/commit', async (route) => {
    const payload = route.request().postDataJSON() as { provider?: string; sourceId?: string }
    expect(payload.provider).toBe('yahoo')
    expect(payload.sourceId).toBe(sourceId)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagueId: mockedLeagueId,
        name: 'E2E Yahoo League',
        sport: 'NHL',
        league: { id: mockedLeagueId, name: 'E2E Yahoo League', sport: 'NHL' },
      }),
    })
  })

  await openImportPreviewFlowForProvider(page, {
    providerLabel: /^Yahoo$/i,
    sourceId,
    leagueName: /import preview: e2e yahoo league/i,
  })
  await page.getByRole('button', { name: /create league from import/i }).click()
  await page.waitForURL(`**/app/league/${mockedLeagueId}`)
  await expect(page).toHaveURL(new RegExp(`/app/league/${mockedLeagueId}$`))
})

test('creates league from MFL import via creation UI', async ({ page }) => {
  const sourceId = `2026:${Date.now()}`
  const mockedLeagueId = `league-imported-mfl-${Date.now()}`

  await mockLeagueTemplates(page)
  await mockImportPreview(page, {
    provider: 'mfl',
    sourceId,
    leagueName: 'E2E MFL League',
    sport: 'NCAAF',
  })

  await page.route('**/api/leagues/import/commit', async (route) => {
    const payload = route.request().postDataJSON() as { provider?: string; sourceId?: string }
    expect(payload.provider).toBe('mfl')
    expect(payload.sourceId).toBe(sourceId)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagueId: mockedLeagueId,
        name: 'E2E MFL League',
        sport: 'NCAAF',
        league: { id: mockedLeagueId, name: 'E2E MFL League', sport: 'NCAAF' },
      }),
    })
  })

  await openImportPreviewFlowForProvider(page, {
    providerLabel: /^MyFantasyLeague \(MFL\)$/i,
    sourceId,
    leagueName: /import preview: e2e mfl league/i,
  })
  await page.getByRole('button', { name: /create league from import/i }).click()
  await page.waitForURL(`**/app/league/${mockedLeagueId}`)
  await expect(page).toHaveURL(new RegExp(`/app/league/${mockedLeagueId}$`))
})

test('shows conflict toast and stays on create page when import already exists', async ({ page }) => {
  const sleeperSourceId = `123456789${Date.now()}`
  let createRequestCount = 0

  await mockLeagueTemplates(page)
  await mockSleeperPreview(page, sleeperSourceId)

  await page.route('**/api/league/create', async (route) => {
    createRequestCount += 1
    const payload = route.request().postDataJSON() as {
      platform?: string
      createFromSleeperImport?: boolean
      sleeperLeagueId?: string
    }
    expect(payload.platform).toBe('sleeper')
    expect(payload.createFromSleeperImport).toBe(true)
    expect(payload.sleeperLeagueId).toBe(sleeperSourceId)

    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'This league already exists in your account',
      }),
    })
  })

  await openImportPreviewFlow(page, sleeperSourceId)
  await page.getByRole('button', { name: /create league from import/i }).click()

  await expect(page).toHaveURL(/\/create-league(?:\?.*)?$/)
  await expect(page.getByText(/this league already exists in your account/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /create league from import/i })).toBeEnabled()
  expect(createRequestCount).toBe(1)
})

test('shows provider-ready list with sleeper enabled first', async ({ page }) => {
  await mockLeagueTemplates(page)

  await page.goto('/create-league?e2eAuth=1')
  await expect(page.getByRole('heading', { name: /create league/i })).toBeVisible()

  await page.getByRole('combobox', { name: /league creation mode/i }).click()
  await page.getByRole('option', { name: /import existing league/i }).click()

  const providerSelect = page.getByRole('combobox').nth(1)
  await providerSelect.click()

  await expect(page.getByRole('option', { name: /^Sleeper$/ })).toBeVisible()
  await expect(page.getByRole('option', { name: /^ESPN$/i })).toBeVisible()
  await expect(page.getByRole('option', { name: /^Yahoo$/i })).toBeVisible()
  await expect(page.getByRole('option', { name: /^Fantrax$/i })).toBeVisible()
  await expect(page.getByRole('option', { name: /^MyFantasyLeague \(MFL\)$/i })).toBeVisible()

  await expect(page.getByRole('option', { name: /^ESPN$/i })).not.toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByRole('option', { name: /^Yahoo$/i })).not.toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByRole('option', { name: /^MyFantasyLeague \(MFL\)$/i })).not.toHaveAttribute('aria-disabled', 'true')

  await page.keyboard.press('Escape')
  await expect(page.locator('#import-source-input')).toBeVisible()
  await expect(page.locator('#import-source-input')).toHaveAttribute('placeholder', /123456789/)
})
