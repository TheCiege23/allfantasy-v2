import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 240_000 })

test.describe('@commissioner commissioner control panel click audit', () => {
  test('commissioner settings, actions, and reset flows are wired end-to-end', async ({ page }) => {
    const leagueId = `e2e-commissioner-control-${Date.now()}`

    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })

    const settingsPatches: Array<Record<string, unknown>> = []
    const waiverPuts: Array<Record<string, unknown>> = []
    const draftPatches: Array<Record<string, unknown>> = []
    const transferPosts: Array<Record<string, unknown>> = []
    const removedRosterIds: string[] = []
    const resetModes: string[] = []
    const broadcasts: string[] = []

    const settingsState: {
      id: string
      name: string
      description: string
      sport: string
      season: number
      leagueSize: number
      rosterSize: number
      starters: Record<string, number>
      settings: Record<string, unknown>
    } = {
      id: leagueId,
      name: 'Commissioner Audit League',
      description: 'Initial commissioner league',
      sport: 'NFL',
      season: 2026,
      leagueSize: 12,
      rosterSize: 20,
      starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 },
      settings: {
        leagueChatThreadId: 'thread-e2e-commissioner',
        benchSize: 6,
        rosterPositions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
        tradeReviewType: 'commissioner',
        vetoThreshold: 4,
      },
    }

    let waiverState: Record<string, unknown> = {
      waiver_type: 'faab',
      processing_days: [2],
      processing_time_utc: '08:00',
      claim_limit_per_period: 5,
      game_lock_behavior: 'game_time',
      free_agent_unlock_behavior: 'after_waivers',
      continuous_waivers: false,
      faab_enabled: true,
      faab_budget: 100,
      faab_reset_rules: null,
      claim_priority_behavior: 'faab_highest',
      tiebreak_rule: 'faab_highest',
      instant_fa_after_clear: false,
      sport: 'NFL',
      variant: 'DYNASTY',
    }

    let scoringState: {
      leagueId: string
      sport: string
      leagueVariant: string | null
      formatType: string
      templateId: string
      rules: Array<{
        statKey: string
        pointsValue: number
        multiplier: number
        enabled: boolean
        defaultPointsValue: number
        defaultEnabled: boolean
        isOverridden: boolean
      }>
    } = {
      leagueId,
      sport: 'NFL',
      leagueVariant: 'DYNASTY',
      formatType: 'standard',
      templateId: 'NFL-standard',
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
          statKey: 'rushing_td',
          pointsValue: 6,
          multiplier: 1,
          enabled: true,
          defaultPointsValue: 6,
          defaultEnabled: true,
          isOverridden: false,
        },
      ],
    }

    let draftState: {
      config: Record<string, unknown>
      draftUISettings: Record<string, unknown>
      isCommissioner: boolean
      draftOrderMode: string
      lotteryConfig: null
      sessionPreDraft: boolean
      sessionVariant: null
    } = {
      config: {
        draft_type: 'snake',
        rounds: 15,
        timer_seconds: 60,
        snake_or_linear: 'snake',
        pick_order_rules: 'snake',
        third_round_reversal: false,
        autopick_behavior: 'queue-first',
        queue_size_limit: 50,
        pre_draft_ranking_source: 'adp',
        roster_fill_order: 'starter_first',
        position_filter_behavior: 'by_eligibility',
        sport: 'NFL',
        variant: 'DYNASTY',
        leagueSize: 12,
      },
      draftUISettings: {
        tradedPickColorModeEnabled: true,
        tradedPickOwnerNameRedEnabled: true,
        aiAdpEnabled: true,
        aiQueueReorderEnabled: true,
        orphanTeamAiManagerEnabled: false,
        orphanDrafterMode: 'cpu',
        liveDraftChatSyncEnabled: false,
        autoPickEnabled: false,
        timerMode: 'per_pick',
        commissionerForceAutoPickEnabled: true,
        draftOrderRandomizationEnabled: true,
        pickTradeEnabled: true,
        auctionAutoNominationEnabled: false,
      },
      isCommissioner: true,
      draftOrderMode: 'randomize',
      lotteryConfig: null,
      sessionPreDraft: true,
      sessionVariant: null,
    }

    let managersState: Array<{ rosterId: string; userId: string; username: string; displayName: string }> = [
      { rosterId: 'roster-1', userId: 'user-1', username: 'user1', displayName: 'Manager One' },
      { rosterId: 'roster-2', userId: 'user-2', username: 'user2', displayName: 'Manager Two' },
    ]

    await page.route(`**/api/commissioner/leagues/${leagueId}/settings`, async (route) => {
      if (route.request().method() === 'PATCH') {
        const payload = route.request().postDataJSON() as Record<string, unknown>
        settingsPatches.push(payload)
        if (typeof payload.name === 'string') settingsState.name = payload.name
        if (typeof payload.description === 'string') settingsState.description = payload.description
        if (typeof payload.sport === 'string') settingsState.sport = payload.sport
        if (typeof payload.season === 'number') settingsState.season = payload.season
        if (typeof payload.leagueSize === 'number') settingsState.leagueSize = payload.leagueSize
        if (typeof payload.rosterSize === 'number') settingsState.rosterSize = payload.rosterSize
        if (payload.starters && typeof payload.starters === 'object') {
          settingsState.starters = payload.starters as Record<string, number>
        }
        const settingsKeys = [
          'benchSize',
          'rosterPositions',
          'tradeReviewType',
          'vetoThreshold',
          'leagueChatThreadId',
        ] as const
        for (const key of settingsKeys) {
          if (payload[key] !== undefined) settingsState.settings[key] = payload[key]
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(settingsState),
      })
    })

    await page.route(`**/api/app/league/${leagueId}/waiver/config`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(waiverState),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/waivers?type=settings**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(waiverState),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/waivers`, async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fallback()
        return
      }
      const patch = route.request().postDataJSON() as Record<string, unknown>
      waiverPuts.push(patch)
      waiverState = {
        ...waiverState,
        waiver_type: patch.waiverType ?? waiverState.waiver_type,
        processing_days:
          patch.processingDayOfWeek == null
            ? []
            : [Number(patch.processingDayOfWeek)],
        processing_time_utc: patch.processingTimeUtc ?? null,
        claim_limit_per_period: patch.claimLimitPerPeriod ?? null,
        faab_budget: patch.faabBudget ?? null,
        tiebreak_rule: patch.tiebreakRule ?? null,
        game_lock_behavior: patch.lockType ?? null,
        instant_fa_after_clear: patch.instantFaAfterClear === true,
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(waiverState),
      })
    })

    await page.route(`**/api/app/league/${leagueId}/scoring/config`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scoringState),
      })
    })
    await page.route(`**/api/commissioner/leagues/${leagueId}/scoring?type=settings**`, async (route) => {
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
      const patch = route.request().postDataJSON() as { rules?: Array<{ statKey: string; pointsValue: number; enabled: boolean }> }
      const nextRules = patch.rules ?? []
      scoringState = {
        ...scoringState,
        rules: scoringState.rules.map((rule) => {
          const next = nextRules.find((entry) => entry.statKey === rule.statKey)
          if (!next) return rule
          return {
            ...rule,
            pointsValue: Number(next.pointsValue),
            enabled: next.enabled !== false,
            isOverridden:
              Math.abs(Number(next.pointsValue) - rule.defaultPointsValue) > 0.0001 ||
              (next.enabled !== false) !== rule.defaultEnabled,
          }
        }),
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scoringState),
      })
    })

    await page.route(`**/api/leagues/${leagueId}/draft/settings`, async (route) => {
      if (route.request().method() === 'PATCH') {
        const patch = route.request().postDataJSON() as Record<string, unknown>
        draftPatches.push(patch)
        draftState = {
          ...draftState,
          config: {
            ...draftState.config,
            draft_type: patch.draft_type ?? draftState.config.draft_type,
            timer_seconds: patch.timer_seconds ?? draftState.config.timer_seconds,
            rounds: patch.rounds ?? draftState.config.rounds,
          },
          draftOrderMode: (patch.draft_order_mode as string) ?? draftState.draftOrderMode,
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(draftState),
      })
    })

    await page.route(`**/api/commissioner/leagues/${leagueId}/managers`, async (route) => {
      if (route.request().method() === 'DELETE') {
        const body = route.request().postDataJSON() as { rosterId?: string }
        const rosterId = String(body?.rosterId ?? '')
        if (rosterId) {
          removedRosterIds.push(rosterId)
          managersState = managersState.map((manager) =>
            manager.rosterId === rosterId
              ? { ...manager, userId: `orphan-${rosterId}`, username: '', displayName: `${manager.displayName} (orphan)` }
              : manager
          )
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok', rosterId }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ teams: [], rosters: [], managers: managersState }),
      })
    })

    await page.route(`**/api/commissioner/leagues/${leagueId}/transfer`, async (route) => {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      transferPosts.push(payload)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      })
    })

    await page.route('**/api/shared/chat/threads/**/broadcast', async (route) => {
      const payload = route.request().postDataJSON() as { announcement?: string }
      broadcasts.push(String(payload.announcement ?? ''))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      })
    })

    await page.route(`**/api/commissioner/leagues/${leagueId}/reset`, async (route) => {
      const payload = route.request().postDataJSON() as { mode?: string }
      resetModes.push(String(payload?.mode ?? 'soft'))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          mode: payload?.mode ?? 'soft',
          waiverClaimsRemoved: 3,
          waiverTransactionsRemoved: 2,
          waiverPickupsRemoved: 1,
          standingsRowsReset: 12,
          chatMessagesRemoved: payload?.mode === 'full' ? 9 : 0,
          aiAlertsRemoved: payload?.mode === 'full' ? 2 : 0,
          aiActionLogsRemoved: payload?.mode === 'full' ? 5 : 0,
          draftSessionReset: true,
        }),
      })
    })

    await page.goto(`/e2e/commissioner-control-panel?leagueId=${leagueId}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /commissioner control panel harness/i })).toBeVisible()
    await page.addStyleTag({
      content: '[data-sonner-toaster], section[aria-label^="Notifications"] { pointer-events: none !important; }',
    })

    const openPanelButton = page.getByTestId('commissioner-panel-open')
    const generalEditButton = page.getByTestId('commissioner-general-edit')
    for (let i = 0; i < 16; i += 1) {
      if (await generalEditButton.isVisible().catch(() => false)) break
      if (await openPanelButton.isVisible().catch(() => false)) {
        await openPanelButton.click().catch(() => {})
      }
      await page.waitForTimeout(250)
    }
    await expect(generalEditButton).toBeVisible({ timeout: 20_000 })

    // General settings
    await generalEditButton.click()
    await page.getByTestId('commissioner-general-name-input').fill('Commissioner Audit League Updated')
    await page.getByTestId('commissioner-general-sport-select').selectOption('SOCCER')
    await page.getByTestId('commissioner-general-season-input').fill('2027')
    await page.getByTestId('commissioner-general-save').click()
    expect(settingsPatches.some((patch) => patch.name === 'Commissioner Audit League Updated')).toBe(true)

    // Roster settings
    await page.getByTestId('commissioner-section-roster').click({ force: true })
    await page.getByTestId('commissioner-roster-edit').click()
    await page.getByTestId('commissioner-roster-size-input').fill('24')
    await page.getByTestId('commissioner-bench-size-input').fill('8')
    await page.getByTestId('commissioner-roster-positions-input').fill('GK, DEF, DEF, MID, MID, FWD, FLEX')
    await page.getByTestId('commissioner-roster-save').click()
    await expect.poll(() => settingsPatches.some((patch) => Number(patch.benchSize) === 8)).toBe(true)

    // Scoring settings
    await page.getByTestId('commissioner-section-scoring').click({ force: true })
    await page.getByTestId('scoring-settings-edit-toggle').click()
    await page.getByLabel('passing_td points').fill('5')
    await page.getByTestId('scoring-settings-save').click()
    await expect(page.getByTestId('scoring-settings-override-count')).toBeVisible()

    // Waiver settings
    await page.getByTestId('commissioner-section-waiver').click({ force: true })
    await page.getByTestId('commissioner-waiver-edit-toggle').click()
    await page.getByTestId('commissioner-waiver-type-select').selectOption('faab')
    await page.getByTestId('commissioner-waiver-faab-budget-input').fill('175')
    await page.getByTestId('commissioner-waiver-instant-fa-toggle').check()
    await page.getByTestId('commissioner-waiver-save').click()
    await expect.poll(() => waiverPuts.length).toBeGreaterThan(0)

    // Trade settings (cancel + save)
    await page.getByTestId('commissioner-section-trade').click({ force: true })
    await page.getByTestId('commissioner-trade-edit').click()
    await page.getByTestId('commissioner-trade-review-type-select').selectOption('league_vote')
    await page.getByTestId('commissioner-trade-cancel').click()
    await page.getByTestId('commissioner-trade-edit').click()
    await page.getByTestId('commissioner-trade-review-type-select').selectOption('league_vote')
    await page.getByTestId('commissioner-veto-threshold-input').fill('5')
    await page.getByTestId('commissioner-trade-save').click()
    expect(settingsPatches.some((patch) => patch.tradeReviewType === 'league_vote')).toBe(true)

    // Draft settings
    await page.getByTestId('commissioner-section-draft').click({ force: true })
    await page.getByTestId('commissioner-draft-type-select').selectOption('linear')
    await page.getByTestId('commissioner-draft-timer-input').fill('45')
    await page.getByTestId('commissioner-draft-save').click()
    expect(draftPatches.length).toBeGreaterThan(0)

    // Member settings
    await page.getByTestId('commissioner-section-members').click({ force: true })
    await expect(page.getByTestId('commissioner-member-remove-roster-1')).toBeVisible()
    await page.getByTestId('commissioner-member-remove-roster-1').click()
    await expect.poll(() => removedRosterIds.includes('roster-1')).toBe(true)
    await page.getByTestId('commissioner-transfer-select').selectOption('user-2')
    await page.getByTestId('commissioner-transfer-confirm').check()
    await page.getByTestId('commissioner-transfer-submit').click()
    await expect.poll(() => transferPosts.length).toBeGreaterThan(0)

    // Commissioner controls / announcements
    await page.getByTestId('commissioner-section-controls').click({ force: true })
    await page.getByTestId('commissioner-announcement-input').fill('Commissioner notice: waivers process tonight.')
    await page.getByTestId('commissioner-announcement-send').click()
    await expect.poll(() => broadcasts.length).toBeGreaterThan(0)

    // Reset league
    await page.getByTestId('commissioner-section-reset').click({ force: true })
    await page.getByTestId('commissioner-reset-mode').selectOption('full')
    await page.getByTestId('commissioner-reset-league-button').click()
    await expect(page.getByTestId('commissioner-reset-result')).toBeVisible()
    await expect.poll(() => resetModes.includes('full')).toBe(true)

    // Reload persistence check for saved setting values
    await page.reload({ waitUntil: 'domcontentloaded' })
    for (let i = 0; i < 12; i += 1) {
      if (await page.getByTestId('commissioner-general-edit').isVisible().catch(() => false)) break
      if (await page.getByTestId('commissioner-panel-open').isVisible().catch(() => false)) {
        await page.getByTestId('commissioner-panel-open').click().catch(() => {})
      }
      await page.waitForTimeout(200)
    }
    await page.getByTestId('commissioner-general-edit').click()
    await expect(page.getByTestId('commissioner-general-name-input')).toHaveValue('Commissioner Audit League Updated')
  })
})
