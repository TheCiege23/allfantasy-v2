import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

function getSlotForOverall(overall: number, teamCount: number): { round: number; slot: number; pickLabel: string } {
  const round = Math.ceil(overall / teamCount)
  let slot = ((overall - 1) % teamCount) + 1
  if (round % 2 === 0) slot = teamCount - slot + 1
  const pickInRound = ((overall - 1) % teamCount) + 1
  return {
    round,
    slot,
    pickLabel: `${round}.${String(pickInRound).padStart(2, '0')}`,
  }
}

async function mockDraftRoomApis(page: Page, leagueId: string) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    })
  })

  await page.route('**/api/auth/config-check', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })

  await page.route('**/api/user/profile', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })

  const slotOrder = [
    { slot: 1, rosterId: 'roster-1', displayName: 'Alpha' },
    { slot: 2, rosterId: 'roster-2', displayName: 'Beta' },
    { slot: 3, rosterId: 'roster-3', displayName: 'Gamma' },
    { slot: 4, rosterId: 'roster-4', displayName: 'Delta' },
  ]

  const settings = {
    draftOrderRandomizationEnabled: true,
    pickTradeEnabled: true,
    tradedPickColorModeEnabled: true,
    tradedPickOwnerNameRedEnabled: true,
    aiAdpEnabled: false,
    aiQueueReorderEnabled: true,
    orphanTeamAiManagerEnabled: false,
    orphanDrafterMode: 'cpu' as const,
    liveDraftChatSyncEnabled: true,
    autoPickEnabled: false,
    timerMode: 'per_pick',
    slowDraftPauseWindow: null,
    commissionerForceAutoPickEnabled: false,
  }

  const poolEntries = [
    { playerId: 'p-1', name: 'Atlas Runner', position: 'RB', team: 'NYJ', adp: 12.1 },
    { playerId: 'p-2', name: 'Blaze Catcher', position: 'WR', team: 'DAL', adp: 15.4 },
    { playerId: 'p-3', name: 'Core Signal', position: 'QB', team: 'KC', adp: 21.2 },
    { playerId: 'p-4', name: 'Delta Edge', position: 'TE', team: 'SEA', adp: 25.3 },
    { playerId: 'p-5', name: 'Echo Guard', position: 'RB', team: 'MIA', adp: 31.8 },
  ]

  const pickRequests: Array<Record<string, unknown>> = []
  const queuePutRequests: Array<Array<{ playerName: string; position: string; team?: string | null }>> = []
  const controlsRequests: Array<Record<string, unknown>> = []
  const resyncHits: string[] = []

  const state = {
    queue: [
      { playerName: 'Atlas Runner', position: 'RB', team: 'NYJ' },
      { playerName: 'Blaze Catcher', position: 'WR', team: 'DAL' },
    ],
    chat: [
      { id: 'm1', from: 'Commissioner', text: 'Welcome to the draft room.', at: new Date().toISOString() },
    ],
    version: 1,
    picks: [
      {
        id: 'pick-1',
        overall: 1,
        round: 1,
        slot: 1,
        rosterId: 'roster-1',
        displayName: 'Alpha',
        playerName: 'Keeper One',
        position: 'QB',
        team: 'BUF',
        byeWeek: 8,
        playerId: 'k-1',
        tradedPickMeta: null,
        source: 'user',
        pickLabel: '1.01',
        createdAt: new Date().toISOString(),
      },
    ] as Array<Record<string, unknown>>,
  }

  const buildSession = () => {
    const overall = state.picks.length + 1
    const current = getSlotForOverall(overall, slotOrder.length)
    const roster = slotOrder[current.slot - 1]
    return {
      id: 'session-e2e-1',
      leagueId,
      status: 'in_progress',
      draftType: 'snake',
      rounds: 4,
      teamCount: slotOrder.length,
      thirdRoundReversal: false,
      timerSeconds: 90,
      timerEndAt: new Date(Date.now() + 55_000).toISOString(),
      pausedRemainingSeconds: null,
      slotOrder,
      tradedPicks: [],
      version: state.version,
      picks: state.picks,
      currentPick: {
        overall,
        round: current.round,
        slot: current.slot,
        rosterId: roster.rosterId,
        displayName: roster.displayName,
        pickLabel: current.pickLabel,
      },
      timer: {
        status: 'running',
        remainingSeconds: 55,
        timerEndAt: new Date(Date.now() + 55_000).toISOString(),
      },
      updatedAt: new Date().toISOString(),
      currentUserRosterId: 'roster-2',
      orphanRosterIds: [],
      aiManagerEnabled: false,
      orphanDrafterMode: 'cpu',
    }
  }

  await page.route(`**/api/leagues/${leagueId}/draft/session`, async (route) => {
    if (route.request().method() === 'GET') {
      resyncHits.push('session')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leagueId, session: buildSession() }),
      })
      return
    }
    const body = route.request().postDataJSON() as Record<string, unknown>
    if (body.action === 'start') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leagueId, session: buildSession() }),
      })
      return
    }
    await route.fallback()
  })

  await page.route(`**/api/leagues/${leagueId}/draft/events**`, async (route) => {
    resyncHits.push('events')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagueId,
        updated: true,
        updatedAt: new Date().toISOString(),
        session: buildSession(),
      }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/settings`, async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          config: { queue_size_limit: 50 },
          draftUISettings: settings,
          idpRosterSummary: null,
        }),
      })
      return
    }
    if (method === 'PATCH') {
      const patch = route.request().postDataJSON() as Record<string, unknown>
      Object.assign(settings, patch)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          config: { queue_size_limit: 50 },
          draftUISettings: settings,
          idpRosterSummary: null,
        }),
      })
      return
    }
    await route.fallback()
  })

  await page.route(`**/api/leagues/${leagueId}/draft/pool`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entries: poolEntries,
        sport: 'NFL',
        count: poolEntries.length,
      }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/queue`, async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leagueId, queue: state.queue }),
      })
      return
    }
    if (method === 'PUT') {
      const body = route.request().postDataJSON() as { queue?: Array<{ playerName: string; position: string; team?: string | null }> }
      state.queue = body.queue ?? []
      queuePutRequests.push(state.queue)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, queue: state.queue }),
      })
      return
    }
    await route.fallback()
  })

  await page.route(`**/api/leagues/${leagueId}/draft/queue/ai-reorder`, async (route) => {
    const body = route.request().postDataJSON() as { queue?: Array<{ playerName: string; position: string; team?: string | null }> }
    const reordered = [...(body.queue ?? state.queue)].reverse()
    state.queue = reordered
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reordered,
        explanation: 'Balanced by roster need and ADP value.',
      }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/pick`, async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    pickRequests.push(body)

    const playerName = String(body.playerName ?? '')
    if (!playerName) {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'playerName required' }) })
      return
    }
    if (state.picks.some((pick) => pick.playerName === playerName)) {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Duplicate pick' }) })
      return
    }
    const overall = state.picks.length + 1
    const pos = String(body.position ?? 'FLEX')
    const slot = getSlotForOverall(overall, slotOrder.length)
    const roster = slotOrder[slot.slot - 1]

    state.picks.push({
      id: `pick-${overall}`,
      overall,
      round: slot.round,
      slot: slot.slot,
      rosterId: roster.rosterId,
      displayName: roster.displayName,
      playerName,
      position: pos,
      team: (body.team as string | null) ?? null,
      byeWeek: null,
      playerId: null,
      tradedPickMeta: null,
      source: 'user',
      pickLabel: slot.pickLabel,
      createdAt: new Date().toISOString(),
    })
    state.version += 1
    state.queue = state.queue.filter((entry) => entry.playerName !== playerName)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        pick: state.picks[state.picks.length - 1],
        session: buildSession(),
      }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/chat`, async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: state.chat }),
      })
      return
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as { text?: string }
      const msg = {
        id: `m-${state.chat.length + 1}`,
        from: 'You',
        text: body.text ?? '',
        at: new Date().toISOString(),
      }
      state.chat.push(msg)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: msg }),
      })
      return
    }
    await route.fallback()
  })

  await page.route(`**/api/leagues/${leagueId}/draft/trade-proposals`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        proposals: [
          { id: 'tp-1', status: 'pending', receiverRosterId: 'roster-2' },
        ],
      }),
    })
  })

  await page.route('**/api/draft/recommend', async (route) => {
    const body = route.request().postDataJSON() as { available?: Array<{ name: string; position: string; team?: string | null; adp?: number | null }> }
    const first = body.available?.[0] ?? { name: 'Atlas Runner', position: 'RB', team: 'NYJ', adp: 12.1 }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        recommendation: {
          player: first,
          reason: 'Best value and strong roster fit.',
          confidence: 87,
        },
        alternatives: [
          { player: { name: 'Blaze Catcher', position: 'WR', team: 'DAL' }, reason: 'High ceiling route tree.', confidence: 79 },
        ],
        reachWarning: null,
        valueWarning: 'Good ADP value at current slot.',
        scarcityInsight: 'RB tier drop expected in next 6 picks.',
        byeNote: null,
        explanation: 'Drafting RB now balances your construction and preserves flexibility.',
        caveats: ['Monitor teammate stack exposure.'],
      }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/controls`, async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    controlsRequests.push(body)
    const action = String(body.action ?? '')
    if (action === 'pause') {
      state.version += 1
    } else if (action === 'resume') {
      state.version += 1
    } else if (action === 'undo_pick') {
      if (state.picks.length > 1) state.picks.pop()
      state.version += 1
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        action,
        session: buildSession(),
      }),
    })
  })

  await page.route('**/api/commissioner/leagues', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagues: [
          { id: leagueId, name: 'E2E Draft Room' },
          { id: 'league-other', name: 'Other League' },
        ],
      }),
    })
  })

  await page.route('**/api/commissioner/broadcast', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })

  return {
    getPickRequests: () => pickRequests,
    getQueuePutRequests: () => queuePutRequests,
    getControlsRequests: () => controlsRequests,
    getResyncHits: () => resyncHits,
  }
}

async function openDraftRoomHarness(page: Page) {
  const button = page.getByTestId('draft-enter-room-button')
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const visible = await button.isVisible().catch(() => false)
    if (!visible) {
      await page.waitForTimeout(150)
      continue
    }
    try {
      await button.click({ timeout: 1500 })
      break
    } catch {
      await page.evaluate(() => {
        const el = document.querySelector('[data-testid="draft-enter-room-button"]') as HTMLButtonElement | null
        el?.click()
      })
    }
    await page.waitForTimeout(150)
  }
  await expect(page.getByTestId('draft-room-shell')).toBeVisible()
}

test.describe('@draft-room click audit', () => {
  test('full draft room interaction flow is wired end-to-end', async ({ page }) => {
    const leagueId = `e2e-draft-room-${Date.now()}`
    const mocks = await mockDraftRoomApis(page, leagueId)

    await page.goto(`/e2e/draft-room?leagueId=${leagueId}&sport=NFL`)
    await openDraftRoomHarness(page)
    const desktop = page.getByTestId('draft-desktop-layout')

    await expect(desktop.getByTestId('draft-board')).toBeVisible()

    await desktop.getByTestId('draft-board-toggle-view-mode').click()
    await expect(desktop.getByTestId('draft-board-round-label')).toContainText(/Round 1 of 4/i)
    await desktop.getByTestId('draft-board-next-round').click()
    await expect(desktop.getByTestId('draft-board-round-label')).toContainText(/Round 2 of 4/i)
    await desktop.getByTestId('draft-board-prev-round').click()
    await desktop.getByTestId('draft-board-round-selector').selectOption('3')
    await expect(desktop.getByTestId('draft-board-round-3')).toBeVisible()

    await desktop.getByTestId('draft-player-search-input').fill('Atlas')
    await desktop.getByTestId('draft-position-filter').selectOption('RB')
    await desktop.getByTestId('draft-clear-filters').click()

    await desktop.getByTestId('draft-player-card-0').click()
    await expect(desktop.getByTestId('draft-selected-player-panel')).toBeVisible()

    await desktop.getByTestId('draft-queue-add-0').click()
    await desktop.getByTestId('draft-queue-add-1').click()
    await expect(desktop.getByTestId('draft-queue-item-0')).toBeVisible()

    await desktop.getByTestId('draft-queue-move-down-0').click()
    await desktop.getByTestId('draft-queue-move-up-1').click()
    await desktop.getByTestId('draft-queue-ai-reorder').click()
    await desktop.getByTestId('draft-queue-remove-1').click()
    expect(mocks.getQueuePutRequests().length).toBeGreaterThan(0)

    await desktop.getByTestId('draft-player-button-0').click()
    await expect(desktop.getByTestId('draft-pick-confirmation')).toBeVisible()
    await desktop.getByTestId('draft-cancel-pick-button').click()
    await desktop.getByTestId('draft-player-button-0').click()
    await desktop.getByTestId('draft-confirm-pick-button').click()
    expect(mocks.getPickRequests().length).toBeGreaterThan(0)
    await desktop.getByTestId('draft-board-round-selector').selectOption('1')
    await expect(desktop.getByTestId('draft-board-round-1')).toContainText(/atlas runner|blaze catcher|core signal|delta edge|echo guard/i)

    const helperRefresh = page.getByTestId('draft-helper-refresh').first()
    if (await helperRefresh.isVisible().catch(() => false)) {
      await helperRefresh.click()
      const aiLink = page.getByTestId('draft-ai-suggestion-button').first()
      await expect(aiLink).toHaveAttribute('href', /insightType=draft/)

      const warRoomToggle = page.getByTestId('draft-open-war-room-button').first()
      await warRoomToggle.click()
      await expect(page.getByTestId('draft-war-room-panel').first()).toBeVisible()
      await warRoomToggle.click()
    }

    await desktop.getByTestId('draft-chat-input').fill('Queue looks strong.')
    await desktop.getByTestId('draft-chat-send').click()
    await expect(page.getByText('Queue looks strong.')).toBeVisible()

    await desktop.getByTestId('draft-open-broadcast-button').click()
    await expect(page.getByTestId('draft-broadcast-modal')).toBeVisible()
    await page.getByTestId('draft-broadcast-message-input').fill('Stay active on queue updates.')
    await page.getByTestId('draft-broadcast-send').click()
    await expect(page.getByTestId('draft-broadcast-overlay')).toHaveCount(0)

    await page.getByTestId('draft-resync-button').click()
    expect(mocks.getResyncHits().length).toBeGreaterThan(0)

    await page.getByTestId('draft-open-commissioner-controls').click()
    await expect(page.getByTestId('draft-commissioner-modal')).toBeVisible()
    await page.getByTestId('draft-commissioner-pause').click()
    await page.getByTestId('draft-commissioner-resync').click()
    await page.getByTestId('draft-commissioner-close').click()
    expect(mocks.getControlsRequests().length).toBeGreaterThan(0)
  })

  test('mobile navigation between board and player/queue/chat works', async ({ page }) => {
    const leagueId = `e2e-draft-room-mobile-${Date.now()}`
    await mockDraftRoomApis(page, leagueId)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/e2e/draft-room?leagueId=${leagueId}&sport=NFL`)
    await openDraftRoomHarness(page)
    const mobile = page.getByTestId('draft-mobile-layout')

    await page.getByTestId('draft-mobile-tab-players').click()
    await expect(mobile.getByTestId('draft-player-panel')).toBeVisible()
    await page.getByTestId('draft-mobile-tab-queue').click()
    await expect(mobile.getByTestId('draft-queue-panel')).toBeVisible()
    await page.getByTestId('draft-mobile-tab-helper').click()
    await expect(mobile.getByTestId('draft-open-war-room-button')).toBeVisible()
    await page.getByTestId('draft-mobile-tab-chat').click()
    await expect(mobile.getByTestId('draft-chat-panel')).toBeVisible()
    await page.getByTestId('draft-mobile-tab-board').click()
    await expect(mobile.getByTestId('draft-board')).toBeVisible()
  })
})
