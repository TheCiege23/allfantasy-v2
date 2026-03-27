import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

async function gotoWithRetry(page: Page, url: string): Promise<void> {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      return
    } catch (error) {
      const message = String((error as Error)?.message ?? error)
      const canRetry =
        attempt < 6 &&
        (
          message.includes('net::ERR_ABORTED') ||
          message.includes('NS_BINDING_ABORTED') ||
          message.includes('net::ERR_CONNECTION_RESET') ||
          message.includes('NS_ERROR_CONNECTION_REFUSED') ||
          message.includes('Failure when receiving data from the peer') ||
          message.includes('Could not connect to server') ||
          message.includes('interrupted by another navigation')
        )
      if (!canRetry) throw error
      await page.waitForTimeout(500 * attempt)
    }
  }
}

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
  const sourceInput = page.locator('#import-source-input')
  const creationModeSelect = page.getByTestId('league-creation-mode-select').first()
  const importCardButton = page.getByRole('button', { name: /Import Existing League/i }).first()

  const importModeSelected = async () => {
    const text = ((await creationModeSelect.textContent().catch(() => '')) ?? '').toLowerCase()
    return text.includes('import existing league')
  }

  const forceImportModeViaDom = async () => {
    await page
      .evaluate(() => {
        const importCard = Array.from(document.querySelectorAll('button')).find((button) => {
          const text = button.textContent?.toLowerCase() ?? ''
          return text.includes('import existing league') && text.includes('sleeper')
        })
        if (importCard instanceof HTMLElement) {
          importCard.click()
        }

        const importOption = Array.from(document.querySelectorAll('[role="option"]')).find((option) => {
          const text = option.textContent?.toLowerCase() ?? ''
          return text.includes('import existing league')
        })
        if (importOption instanceof HTMLElement) {
          importOption.click()
        }
      })
      .catch(() => null)
  }

  const selectImportViaDropdown = async () => {
    if (!(await creationModeSelect.isVisible().catch(() => false))) return
    await creationModeSelect.click({ force: true, timeout: 1_500 }).catch(() => null)
    const importOption = page.getByRole('option', { name: /import existing league/i }).first()
    if (await importOption.isVisible().catch(() => false)) {
      await importOption.click({ force: true, timeout: 1_500 }).catch(() => null)
    }
    await page.keyboard.press('Escape').catch(() => null)
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await sourceInput.isVisible().catch(() => false)) return

    if (await importCardButton.isVisible().catch(() => false)) {
      await importCardButton.click({ force: true, timeout: 1_500 }).catch(() => null)
      await importCardButton.evaluate((button) => (button as HTMLButtonElement).click()).catch(() => null)
    }

    await forceImportModeViaDom()
    if (!(await importModeSelected())) {
      await selectImportViaDropdown()
    }

    await expect
      .poll(async () => sourceInput.isVisible().catch(() => false), {
        timeout: 2_500,
        intervals: [150, 250, 400, 600, 800],
      })
      .toBe(true)
      .catch(() => null)
  }

  for (let refreshAttempt = 0; refreshAttempt < 1; refreshAttempt += 1) {
    if (await sourceInput.isVisible().catch(() => false)) return
    await gotoWithRetry(page, '/create-league?e2eAuth=1')
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (await sourceInput.isVisible().catch(() => false)) return
      if (await importCardButton.isVisible().catch(() => false)) {
        await importCardButton.click({ force: true, timeout: 1_500 }).catch(() => null)
      }
      await selectImportViaDropdown()
      await forceImportModeViaDom()
      await page.waitForTimeout(200)
    }
  }

  await expect(sourceInput).toBeVisible({ timeout: 10_000 })
}

test.describe('@import import preview click audit', () => {
  test('audits import preview, back action, submit errors, and success redirects', async ({ page }) => {
    const previewRequests: Array<{ provider?: string; sourceId?: string }> = []
    const sleeperCreateRequests: Array<Record<string, unknown>> = []
    const commitRequests: Array<Record<string, unknown>> = []

    await page.route('**/api/sport-defaults**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sport: 'NFL',
          metadata: {
            display_name: 'National Football League',
            short_name: 'NFL',
            icon: 'football',
            logo_strategy: 'team_logo',
          },
          league: {
            default_league_name_pattern: 'NFL League',
            default_team_count: 12,
            default_playoff_team_count: 6,
            default_regular_season_length: 14,
            default_matchup_unit: 'week',
            default_trade_deadline_logic: 'week_11',
          },
          roster: {
            starter_slots: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1 },
            bench_slots: 8,
            IR_slots: 2,
            flex_definitions: [{ slotName: 'FLEX', allowedPositions: ['RB', 'WR', 'TE'] }],
          },
          scoring: { scoring_template_id: 'nfl-ppr', scoring_format: 'PPR', category_type: 'points' },
          draft: {
            draft_type: 'snake',
            rounds_default: 16,
            timer_seconds_default: 60,
            pick_order_rules: 'snake',
          },
          waiver: {
            waiver_type: 'faab',
            processing_days: [2, 4],
            FAAB_budget_default: 100,
            processing_time_utc: '08:00',
            faab_enabled: true,
            claim_priority_behavior: 'faab_highest',
            continuous_waivers_behavior: false,
            free_agent_unlock_behavior: 'after_waiver_run',
            game_lock_behavior: 'game_time',
            max_claims_per_period: null,
          },
          rosterTemplate: {
            templateId: 'nfl-default',
            name: 'NFL Default',
            formatType: 'NFL',
            slots: [
              {
                slotName: 'QB',
                allowedPositions: ['QB'],
                starterCount: 1,
                benchCount: 0,
                isFlexibleSlot: false,
                slotOrder: 1,
              },
            ],
          },
          scoringTemplate: {
            templateId: 'nfl-ppr',
            name: 'NFL PPR',
            formatType: 'PPR',
            rules: [],
          },
          defaultLeagueSettings: {
            playoff_team_count: 6,
            playoff_weeks: 3,
            regular_season_length: 14,
            schedule_unit: 'week',
            matchup_frequency: 'weekly',
            trade_review_mode: 'commissioner',
          },
        }),
      })
    })

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

    await gotoWithRetry(page, '/create-league?e2eAuth=1')
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
    await gotoWithRetry(page, '/create-league?e2eAuth=1')
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
