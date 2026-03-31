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

async function openCommissionerControls(page: Page) {
  const openButton = page.getByTestId('draft-open-commissioner-controls')
  const modal = page.getByTestId('draft-commissioner-modal')
  const overlay = page.getByTestId('draft-commissioner-overlay')
  const dialogFallback = page.getByRole('dialog', { name: /Commissioner control center/i })

  const isControlsVisible = async () =>
    (await modal.isVisible().catch(() => false)) ||
    (await dialogFallback.isVisible().catch(() => false)) ||
    (await overlay.isVisible().catch(() => false))

  const assertControlsVisible = async () => {
    const modalVisible = await modal.isVisible().catch(() => false)
    const dialogVisible = await dialogFallback.isVisible().catch(() => false)
    if (!modalVisible && !dialogVisible) {
      await expect(dialogFallback).toBeVisible({ timeout: 15_000 })
      return
    }
    if (modalVisible) {
      await expect(modal).toBeVisible({ timeout: 15_000 })
      return
    }
    await expect(dialogFallback).toBeVisible({ timeout: 15_000 })
  }

  if (await isControlsVisible()) {
    await assertControlsVisible()
    return
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await isControlsVisible()) {
      await assertControlsVisible()
      return
    }
    await openButton.click()
    await expect
      .poll(async () => (await isControlsVisible()) || (await openButton.isVisible().catch(() => false)), {
        timeout: 10_000,
      })
      .toBe(true)
    if (await isControlsVisible()) {
      await assertControlsVisible()
      return
    }
    await page.waitForTimeout(200)
  }

  await assertControlsVisible()
}

async function mockDraftRoomApis(
  page: Page,
  leagueId: string,
  options?: { initialStatus?: 'pre_draft' | 'in_progress' | 'paused' | 'completed' }
) {
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
  const settingsPatchRequests: Array<Record<string, unknown>> = []
  const resyncHits: string[] = []
  const aiPickRequests: Array<Record<string, unknown>> = []
  const tradeOfferRequests: Array<Record<string, unknown>> = []
  const tradeReviewRequests: Array<string> = []
  const tradeRespondRequests: Array<{ proposalId: string; action: string }> = []
  const orphanRecentActions: Array<{ action: string; createdAt: string; reason: string | null; rosterId?: string }> = []

  const state: {
    queue: Array<{ playerName: string; position: string; team?: string | null }>
    chat: Array<{ id: string; from: string; text: string; at: string }>
    version: number
    sessionStatus: 'pre_draft' | 'in_progress' | 'paused' | 'completed'
    picks: Array<Record<string, unknown>>
    tradedPicks: Array<{
      round: number
      originalRosterId: string
      previousOwnerName: string
      newRosterId: string
      newOwnerName: string
    }>
    proposals: Array<{
      id: string
      proposerRosterId: string
      receiverRosterId: string
      giveRound: number
      giveSlot: number
      giveOriginalRosterId: string
      receiveRound: number
      receiveSlot: number
      receiveOriginalRosterId: string
      proposerName: string
      receiverName: string
      status: string
      createdAt: string
    }>
  } = {
    queue: [
      { playerName: 'Atlas Runner', position: 'RB', team: 'NYJ' },
      { playerName: 'Blaze Catcher', position: 'WR', team: 'DAL' },
    ],
    chat: [
      { id: 'm1', from: 'Commissioner', text: 'Welcome to the draft room.', at: new Date().toISOString() },
    ],
    version: 1,
    sessionStatus: options?.initialStatus ?? 'in_progress',
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
    tradedPicks: [],
    proposals: [
      {
        id: 'tp-1',
        proposerRosterId: 'roster-1',
        receiverRosterId: 'roster-2',
        giveRound: 2,
        giveSlot: 1,
        giveOriginalRosterId: 'roster-1',
        receiveRound: 3,
        receiveSlot: 2,
        receiveOriginalRosterId: 'roster-2',
        proposerName: 'Alpha',
        receiverName: 'Beta',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tp-2',
        proposerRosterId: 'roster-3',
        receiverRosterId: 'roster-2',
        giveRound: 2,
        giveSlot: 3,
        giveOriginalRosterId: 'roster-3',
        receiveRound: 4,
        receiveSlot: 2,
        receiveOriginalRosterId: 'roster-2',
        proposerName: 'Gamma',
        receiverName: 'Beta',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tp-3',
        proposerRosterId: 'roster-4',
        receiverRosterId: 'roster-2',
        giveRound: 2,
        giveSlot: 4,
        giveOriginalRosterId: 'roster-4',
        receiveRound: 4,
        receiveSlot: 2,
        receiveOriginalRosterId: 'roster-2',
        proposerName: 'Delta',
        receiverName: 'Beta',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ],
  }
  if (state.sessionStatus === 'completed' && state.picks.length < 4) {
    state.picks.push(
      {
        id: 'pick-2',
        overall: 2,
        round: 1,
        slot: 2,
        rosterId: 'roster-2',
        displayName: 'Beta',
        playerName: 'Atlas Runner',
        position: 'RB',
        team: 'NYJ',
        byeWeek: null,
        playerId: 'p-1',
        tradedPickMeta: null,
        source: 'user',
        pickLabel: '1.02',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pick-3',
        overall: 3,
        round: 1,
        slot: 3,
        rosterId: 'roster-3',
        displayName: 'Gamma',
        playerName: 'Blaze Catcher',
        position: 'WR',
        team: 'DAL',
        byeWeek: null,
        playerId: 'p-2',
        tradedPickMeta: null,
        source: 'user',
        pickLabel: '1.03',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pick-4',
        overall: 4,
        round: 1,
        slot: 4,
        rosterId: 'roster-4',
        displayName: 'Delta',
        playerName: 'Core Signal',
        position: 'QB',
        team: 'KC',
        byeWeek: null,
        playerId: 'p-3',
        tradedPickMeta: null,
        source: 'user',
        pickLabel: '1.04',
        createdAt: new Date().toISOString(),
      }
    )
  }

  const buildSession = () => {
    const overall = state.picks.length + 1
    const current = getSlotForOverall(overall, slotOrder.length)
    const roster = slotOrder[current.slot - 1]
    const currentPick =
      state.sessionStatus === 'completed'
        ? null
        : {
            overall,
            round: current.round,
            slot: current.slot,
            rosterId: roster.rosterId,
            displayName: roster.displayName,
            pickLabel: current.pickLabel,
          }
    return {
      id: 'session-e2e-1',
      leagueId,
      status: state.sessionStatus,
      draftType: 'snake',
      rounds: 4,
      teamCount: slotOrder.length,
      thirdRoundReversal: false,
      timerSeconds: 90,
      timerEndAt: new Date(Date.now() + 55_000).toISOString(),
      pausedRemainingSeconds: null,
      slotOrder,
      tradedPicks: state.tradedPicks,
      version: state.version,
      picks: state.picks,
      currentPick,
      timer: {
        status:
          state.sessionStatus === 'paused'
            ? 'paused'
            : state.sessionStatus === 'in_progress'
              ? 'running'
              : 'none',
        remainingSeconds: state.sessionStatus === 'in_progress' || state.sessionStatus === 'paused' ? 55 : null,
        timerEndAt: state.sessionStatus === 'in_progress' ? new Date(Date.now() + 55_000).toISOString() : null,
      },
      updatedAt: new Date().toISOString(),
      currentUserRosterId: 'roster-2',
      orphanRosterIds: settings.orphanTeamAiManagerEnabled ? slotOrder.map((entry) => entry.rosterId) : [],
      aiManagerEnabled: settings.orphanTeamAiManagerEnabled,
      orphanDrafterMode: settings.orphanDrafterMode,
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
      state.sessionStatus = 'in_progress'
      state.version += 1
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
          config: { queue_size_limit: 50, autopick_behavior: 'skip' },
          draftUISettings: settings,
          idpRosterSummary: null,
          orphanStatus: {
            orphanRosterIds: settings.orphanTeamAiManagerEnabled ? slotOrder.map((entry) => entry.rosterId) : [],
            recentActions: orphanRecentActions.slice(0, 10),
          },
        }),
      })
      return
    }
    if (method === 'PATCH') {
      const patch = route.request().postDataJSON() as Record<string, unknown>
      settingsPatchRequests.push(patch)
      Object.assign(settings, patch)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          config: { queue_size_limit: 50, autopick_behavior: 'skip' },
          draftUISettings: settings,
          idpRosterSummary: null,
          orphanStatus: {
            orphanRosterIds: settings.orphanTeamAiManagerEnabled ? slotOrder.map((entry) => entry.rosterId) : [],
            recentActions: orphanRecentActions.slice(0, 10),
          },
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

  await page.route(`**/api/leagues/${leagueId}/draft/ai-pick`, async (route) => {
    const payload = route.request().postDataJSON() as Record<string, unknown>
    aiPickRequests.push(payload)
    const current = buildSession().currentPick
    if (!current) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No current pick' }),
      })
      return
    }
    const fallback = poolEntries.find((entry) => !state.picks.some((pick) => pick.playerName === entry.name)) ?? poolEntries[0]
    const playerName = fallback?.name ?? `AI Pick ${current.overall}`
    const position = fallback?.position ?? 'WR'
    const team = fallback?.team ?? null
    state.picks.push({
      id: `pick-ai-${current.overall}`,
      overall: current.overall,
      round: current.round,
      slot: current.slot,
      rosterId: current.rosterId,
      displayName: current.displayName,
      playerName,
      position,
      team,
      byeWeek: null,
      playerId: null,
      tradedPickMeta: null,
      source: 'auto',
      pickLabel: current.pickLabel,
      createdAt: new Date().toISOString(),
    })
    state.version += 1
    orphanRecentActions.unshift({
      action: 'draft_pick',
      createdAt: new Date().toISOString(),
      reason: `AI manager selected ${playerName}.`,
      rosterId: current.rosterId,
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        pick: {
          playerName,
          position,
          overall: current.overall,
          round: current.round,
          slot: current.slot,
        },
        reason: `AI manager selected ${playerName}.`,
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
        body: JSON.stringify({
          messages: state.chat,
          syncActive: settings.liveDraftChatSyncEnabled && buildSession().status === 'in_progress',
        }),
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
        body: JSON.stringify({
          message: msg,
          syncActive: settings.liveDraftChatSyncEnabled && buildSession().status === 'in_progress',
        }),
      })
      return
    }
    await route.fallback()
  })

  await page.route(`**/api/leagues/${leagueId}/draft/trade-proposals`, async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ proposals: state.proposals }),
      })
      return
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      tradeOfferRequests.push(body)
      const receiveSlot = Number(body.receiveSlot ?? 1)
      const giveSlot = Number(body.giveSlot ?? 1)
      const giveOriginalRosterId = slotOrder.find((entry) => entry.slot === giveSlot)?.rosterId ?? 'roster-2'
      const receiveOriginalRosterId = slotOrder.find((entry) => entry.slot === receiveSlot)?.rosterId ?? String(body.receiverRosterId ?? 'roster-3')
      const proposalId = `tp-new-${state.proposals.length + 1}`
      const receiverName = slotOrder.find((entry) => entry.rosterId === String(body.receiverRosterId ?? ''))?.displayName ?? 'Manager'
      const created = {
        id: proposalId,
        proposerRosterId: 'roster-2',
        receiverRosterId: String(body.receiverRosterId ?? ''),
        giveRound: Number(body.giveRound ?? 1),
        giveSlot,
        giveOriginalRosterId,
        receiveRound: Number(body.receiveRound ?? 1),
        receiveSlot,
        receiveOriginalRosterId,
        proposerName: 'Beta',
        receiverName,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      state.proposals.unshift(created)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          proposal: created,
          privateAiReviewQueued: true,
          privacy: { aiReview: 'private' },
        }),
      })
      return
    }
    await route.fallback()
  })

  await page.route(`**/api/leagues/${leagueId}/draft/trade-proposals/*/review`, async (route) => {
    const url = route.request().url()
    const match = url.match(/trade-proposals\/([^/?]+)\/review/)
    const proposalId = match?.[1] ?? 'unknown'
    tradeReviewRequests.push(proposalId)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        verdict: 'counter',
        summary: 'The offer is close, but you should ask for a stronger return.',
        reasons: ['Value is near fair, but you are giving up the earlier premium slot.'],
        declineReasons: ['Current package underpays your side in the next tier break.'],
        counterReasons: ['Request an additional move-up in a later round.'],
        suggestedCounterPackage: 'Ask for their Round 4 slot 1 in addition to the current return.',
        private: true,
      }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/trade-proposals/*/respond`, async (route) => {
    const url = route.request().url()
    const match = url.match(/trade-proposals\/([^/?]+)\/respond/)
    const proposalId = match?.[1] ?? ''
    const body = route.request().postDataJSON() as { action?: string }
    const action = String(body.action ?? 'reject')
    tradeRespondRequests.push({ proposalId, action })
    const proposal = state.proposals.find((entry) => entry.id === proposalId)
    if (!proposal) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Proposal not found' }),
      })
      return
    }

    if (action === 'accept') {
      proposal.status = 'accepted'
      const previousGive = slotOrder.find((entry) => entry.rosterId === proposal.giveOriginalRosterId)?.displayName ?? 'Team'
      const previousReceive = slotOrder.find((entry) => entry.rosterId === proposal.receiveOriginalRosterId)?.displayName ?? 'Team'
      state.tradedPicks.push(
        {
          round: proposal.giveRound,
          originalRosterId: proposal.giveOriginalRosterId,
          previousOwnerName: previousGive,
          newRosterId: proposal.receiverRosterId,
          newOwnerName: proposal.receiverName,
        },
        {
          round: proposal.receiveRound,
          originalRosterId: proposal.receiveOriginalRosterId,
          previousOwnerName: previousReceive,
          newRosterId: proposal.proposerRosterId,
          newOwnerName: proposal.proposerName,
        }
      )
      state.version += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, action: 'accepted', session: buildSession() }),
      })
      return
    }
    if (action === 'counter') {
      proposal.status = 'countered'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, action: 'countered' }),
      })
      return
    }
    proposal.status = 'rejected'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, action: 'rejected' }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/post-draft-summary`, async (route) => {
    const pickLog = state.picks.map((pick) => ({
      id: String(pick.id),
      overall: Number(pick.overall),
      round: Number(pick.round),
      slot: Number(pick.slot),
      rosterId: String(pick.rosterId),
      displayName: (pick.displayName as string | null) ?? null,
      playerName: String(pick.playerName),
      position: String(pick.position),
      team: (pick.team as string | null) ?? null,
      pickLabel: String(pick.pickLabel),
      amount: null,
    }))
    const byPosition = pickLog.reduce<Record<string, number>>((acc, pick) => {
      acc[pick.position] = (acc[pick.position] ?? 0) + 1
      return acc
    }, {})
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagueId,
        leagueName: 'E2E Draft Room',
        sport: 'NFL',
        draftType: 'snake',
        status: state.sessionStatus,
        rounds: 4,
        teamCount: slotOrder.length,
        totalPicks: 16,
        pickCount: pickLog.length,
        byPosition,
        pickLog,
        teamResults: slotOrder.map((entry) => ({
          rosterId: entry.rosterId,
          displayName: entry.displayName,
          slot: entry.slot,
          pickCount: pickLog.filter((pick) => pick.rosterId === entry.rosterId).length,
          picks: pickLog.filter((pick) => pick.rosterId === entry.rosterId),
        })),
        valueReach: [
          { position: 'QB', earliestOverall: 1, firstPickBy: 'Alpha' },
          { position: 'RB', earliestOverall: 2, firstPickBy: 'Beta' },
          { position: 'WR', earliestOverall: 3, firstPickBy: 'Gamma' },
        ],
      }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/replay`, async (route) => {
    const pickLog = state.picks.map((pick) => ({
      id: String(pick.id),
      overall: Number(pick.overall),
      round: Number(pick.round),
      slot: Number(pick.slot),
      rosterId: String(pick.rosterId),
      displayName: (pick.displayName as string | null) ?? null,
      playerName: String(pick.playerName),
      position: String(pick.position),
      team: (pick.team as string | null) ?? null,
      pickLabel: String(pick.pickLabel),
      amount: null,
    }))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagueId,
        leagueName: 'E2E Draft Room',
        sport: 'NFL',
        draftType: 'snake',
        rounds: 4,
        teamCount: slotOrder.length,
        pickCount: pickLog.length,
        pickLog,
      }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/recap`, async (route) => {
    const includeAiExplanation = Boolean((route.request().postDataJSON() as { includeAiExplanation?: boolean } | null)?.includeAiExplanation)
    const sections = {
      leagueNarrativeRecap:
        'Deterministic recap: Alpha opened QB early, Beta prioritized RB value, and positional balance held through the board.',
      strategyRecap:
        'Managers opened with core starters and shifted into depth/value in rounds 3-4, preserving roster flexibility.',
      bestWorstValueExplanation:
        'Best value came from Atlas Runner at #2. Largest reach came from Keeper One at #1 relative to ADP.',
      chimmyDraftDebrief:
        'Chimmy debrief: review your bench leverage spots and set early waiver contingencies this week.',
      teamGradeExplanations: [
        {
          rank: 1,
          rosterId: 'roster-1',
          displayName: 'Alpha',
          grade: 'A',
          score: 91.2,
          explanation: 'Alpha captured strong value and maintained balanced positional construction.',
        },
      ],
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        recap: includeAiExplanation
          ? 'AI recap: Alpha combined board value with stable roster balance, while Beta built strong RB leverage with manageable reach exposure.'
          : sections.leagueNarrativeRecap,
        deterministicRecap: sections.leagueNarrativeRecap,
        sections,
        execution: { mode: includeAiExplanation ? 'ai_explained' : 'instant_automated' },
      }),
    })
  })

  await page.route('**/api/draft/recommend', async (route) => {
    const body = route.request().postDataJSON() as {
      available?: Array<{ name: string; position: string; team?: string | null; adp?: number | null }>
      includeAIExplanation?: boolean
    }
    const first = body.available?.[0] ?? { name: 'Atlas Runner', position: 'RB', team: 'NYJ', adp: 12.1 }
    const includeAIExplanation = Boolean(body.includeAIExplanation)
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
        stackInsight: 'Stack path: Atlas Runner correlates with your NYJ QB.',
        correlationInsight: 'Correlation watch: you already roster 2 NYJ players.',
        formatInsight: 'FLEX lineup structure supports this position.',
        byeNote: null,
        explanation: includeAIExplanation
          ? 'AI explanation: Drafting RB now balances your construction and preserves flexibility, with Blaze Catcher as immediate fallback if sniped.'
          : 'Drafting RB now balances your construction and preserves flexibility.',
        evidence: [
          'Context: Round 1, Pick 2 (overall 2).',
          'Need score (RB): 82/100.',
          'Market edge: +3.1 picks vs ADP.',
        ],
        caveats: ['Monitor teammate stack exposure.'],
        uncertainty: 'Uncertainty: Limited ADP coverage in this pool; confidence is reduced.',
        execution: { mode: includeAIExplanation ? 'ai_explained' : 'instant_automated' },
      }),
    })
  })

  await page.route(`**/api/leagues/${leagueId}/draft/controls`, async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>
    controlsRequests.push(body)
    const action = String(body.action ?? '')
    if (action === 'pause') {
      state.sessionStatus = 'paused'
      state.version += 1
    } else if (action === 'resume') {
      state.sessionStatus = 'in_progress'
      state.version += 1
    } else if (action === 'undo_pick') {
      if (state.picks.length > 1) state.picks.pop()
      state.version += 1
    } else if (action === 'skip_pick') {
      const current = buildSession().currentPick
      if (current) {
        state.picks.push({
          id: `pick-skip-${current.overall}`,
          overall: current.overall,
          round: current.round,
          slot: current.slot,
          rosterId: current.rosterId,
          displayName: current.displayName,
          playerName: '(Skipped)',
          position: 'SKIP',
          team: null,
          byeWeek: null,
          playerId: null,
          tradedPickMeta: null,
          source: 'commissioner',
          pickLabel: current.pickLabel,
          createdAt: new Date().toISOString(),
        })
      }
      state.version += 1
    } else if (action === 'force_autopick') {
      const current = buildSession().currentPick
      if (current) {
        const fallback =
          poolEntries.find((entry) => !state.picks.some((pick) => pick.playerName === entry.name)) ?? poolEntries[0]
        const playerName = fallback?.name ?? `Force Auto Pick ${current.overall}`
        const position = fallback?.position ?? 'WR'
        const team = fallback?.team ?? null
        state.picks.push({
          id: `pick-force-${current.overall}`,
          overall: current.overall,
          round: current.round,
          slot: current.slot,
          rosterId: current.rosterId,
          displayName: current.displayName,
          playerName,
          position,
          team,
          byeWeek: null,
          playerId: fallback?.playerId ?? null,
          tradedPickMeta: null,
          source: 'commissioner',
          pickLabel: current.pickLabel,
          createdAt: new Date().toISOString(),
        })
      }
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
    getSettingsPatchRequests: () => settingsPatchRequests,
    getResyncHits: () => resyncHits,
    getAiPickRequests: () => aiPickRequests,
    getTradeOfferRequests: () => tradeOfferRequests,
    getTradeReviewRequests: () => tradeReviewRequests,
    getTradeRespondRequests: () => tradeRespondRequests,
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
    page.on('dialog', async (dialog) => {
      await dialog.dismiss()
    })

    await page.goto(`/e2e/draft-room?leagueId=${leagueId}&sport=NFL`)
    await openDraftRoomHarness(page)
    const desktop = page.getByTestId('draft-desktop-layout')

    await expect(desktop.getByTestId('draft-board')).toBeVisible()

    const roundLabel = desktop.getByTestId('draft-board-round-label')
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await desktop.getByTestId('draft-board-toggle-view-mode').click()
      const labelText = (await roundLabel.textContent()) ?? ''
      if (/Round 1 of 4/i.test(labelText)) break
      await page.waitForTimeout(120)
    }
    await expect(roundLabel).toContainText(/Round 1 of 4/i)
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
    const aiReorderToggle = desktop.getByTestId('draft-queue-ai-reorder-toggle')
    await expect(aiReorderToggle).toBeVisible()
    await aiReorderToggle.uncheck()
    await expect(desktop.getByTestId('draft-queue-ai-reorder')).toBeDisabled()
    await aiReorderToggle.check()
    await desktop.getByTestId('draft-queue-ai-reorder').click()
    await desktop.getByTestId('draft-queue-remove-1').click()
    await expect.poll(() => mocks.getQueuePutRequests().length).toBeGreaterThan(0)

    await desktop.getByTestId('draft-player-button-0').click()
    await expect(desktop.getByTestId('draft-pick-confirmation')).toBeVisible()
    await desktop.getByTestId('draft-cancel-pick-button').click()
    await desktop.getByTestId('draft-player-button-0').click()
    await desktop.getByTestId('draft-confirm-pick-button').click()
    await expect.poll(() => mocks.getPickRequests().length).toBeGreaterThan(0)
    await desktop.getByTestId('draft-board-round-selector').selectOption('1')
    await expect(desktop.getByTestId('draft-board-round-1')).toContainText(/atlas runner|blaze catcher|core signal|delta edge|echo guard/i)

    const helperRefresh = page.getByTestId('draft-helper-refresh').first()
    if (await helperRefresh.isVisible().catch(() => false)) {
      await helperRefresh.click()
      await page.getByTestId('draft-helper-recommendation-card').first().click()
      await expect(desktop.getByTestId('draft-selected-player-panel')).toBeVisible()
      await page.getByTestId('draft-helper-alternative-0').first().click()
      await expect(desktop.getByTestId('draft-selected-player-panel')).toBeVisible()
      const aiExplanationToggle = page.getByTestId('draft-helper-ai-explanation-toggle').first()
      await aiExplanationToggle.check()
      await helperRefresh.click()
      await expect(page.getByTestId('draft-helper-execution-mode').first()).toContainText(/AI explanation/i)
      await aiExplanationToggle.uncheck()
      await helperRefresh.click()
      await expect(page.getByTestId('draft-helper-execution-mode').first()).toContainText(/instant automated recommendation/i)
      const aiLink = page.getByTestId('draft-ai-suggestion-button').first()
      await expect(aiLink).toHaveAttribute('href', /insightType=draft/)

      const warRoomToggle = page.getByTestId('draft-open-war-room-button').first()
      await warRoomToggle.click()
      await expect(page.getByTestId('draft-war-room-panel').first()).toBeVisible()
      await warRoomToggle.click()
    }

    await desktop.getByTestId('draft-board-round-selector').selectOption('2')
    await expect(desktop.getByTestId('draft-board-cell-8')).toContainText('Alpha')

    await page.getByTestId('draft-open-trades-button').click()
    await expect(page.getByTestId('draft-trade-panel-overlay')).toBeVisible()
    await page.getByTestId('draft-trade-offer-toggle').click()
    await page.getByTestId('draft-trade-offer-receiver').selectOption('roster-3')
    await page.getByTestId('draft-trade-offer-give-round').selectOption('2')
    await page.getByTestId('draft-trade-offer-receive-round').selectOption('3')
    await page.getByTestId('draft-trade-send-offer').click()
    await expect.poll(() => mocks.getTradeOfferRequests().length).toBeGreaterThan(0)

    await page.getByTestId('draft-trade-review-tp-1').click()
    await expect(page.getByTestId('draft-trade-review-panel-tp-1')).toBeVisible()
    await page.getByTestId('draft-trade-ai-review-tp-1').click()
    await expect(page.getByText(/Private review context/i)).toBeVisible()
    await expect(page.getByText(/Counter ideas/i).first()).toBeVisible()
    expect(mocks.getTradeReviewRequests()).toContain('tp-1')

    await page.getByTestId('draft-trade-review-tp-2').click()
    await page.getByTestId('draft-trade-counter-tp-2').click()
    await page.getByTestId('draft-trade-review-tp-3').click()
    await page.getByTestId('draft-trade-reject-tp-3').click()
    await page.getByTestId('draft-trade-review-tp-1').click()
    await page.getByTestId('draft-trade-accept-tp-1').click()
    await page
      .getByTestId('draft-trade-panel-overlay')
      .getByRole('button', { name: 'Close' })
      .click()
    await expect(page.getByTestId('draft-trade-panel-overlay')).toHaveCount(0)

    await desktop.getByTestId('draft-board-round-selector').selectOption('2')
    await expect(desktop.getByTestId('draft-board-cell-8')).toContainText('Beta')
    await desktop.getByTestId('draft-board-round-selector').selectOption('3')
    await expect(desktop.getByTestId('draft-board-cell-10')).toContainText('Alpha')
    const tradeRespondActions = mocks.getTradeRespondRequests().map((entry) => entry.action)
    expect(tradeRespondActions).toContain('accept')
    expect(tradeRespondActions).toContain('reject')
    expect(tradeRespondActions).toContain('counter')

    await desktop.getByTestId('draft-chat-media-gif').click()
    await desktop.getByTestId('draft-chat-media-image').click()
    await desktop.getByTestId('draft-chat-media-video').click()
    await desktop.getByTestId('draft-chat-media-link').click()
    await desktop.getByTestId('draft-chat-mention-everyone').click()
    await desktop.getByTestId('draft-chat-ai-handoff').click()
    await expect(desktop.getByTestId('draft-chat-sync-badge')).toBeVisible()
    await desktop.getByTestId('draft-chat-input').fill('Queue looks strong.')
    await desktop.getByTestId('draft-chat-send').click()
    await expect(page.getByText('Queue looks strong.')).toBeVisible()

    await desktop.getByTestId('draft-open-broadcast-button').click()
    await expect(page.getByTestId('draft-broadcast-modal')).toBeVisible()
    await page.getByTestId('draft-broadcast-message-input').fill('Stay active on queue updates.')
    await page.getByTestId('draft-broadcast-send').click()
    await expect(page.getByTestId('draft-broadcast-overlay')).toHaveCount(0)

    await page.getByTestId('draft-resync-button').click()
    await expect.poll(() => mocks.getResyncHits().length).toBeGreaterThan(0)

    await openCommissionerControls(page)
    let aiRunAttempted = false
    await page.getByTestId('draft-commissioner-toggle-orphan-ai').click()
    await page.getByTestId('draft-commissioner-select-orphan-drafter-mode').selectOption('ai')
    await expect(page.getByTestId('draft-commissioner-orphan-status')).toBeVisible()
    const runAiPickButton = page.getByTestId('draft-commissioner-run-ai-pick')
    if (await runAiPickButton.isVisible().catch(() => false)) {
      aiRunAttempted = true
      await runAiPickButton.click()
    }
    await page.getByTestId('draft-commissioner-toggle-traded-owner-red').click()
    await page.getByTestId('draft-commissioner-toggle-traded-color').click()
    await page.getByTestId('draft-commissioner-toggle-ai-adp').click()
    await page.getByTestId('draft-commissioner-toggle-ai-queue-reorder').click()
    await page.getByTestId('draft-commissioner-toggle-chat-sync').click()
    await page.getByTestId('draft-commissioner-toggle-auto-pick-enabled').click()
    await page.getByTestId('draft-commissioner-select-timer-mode').selectOption('soft_pause')
    await page.getByTestId('draft-commissioner-toggle-force-autopick').click()
    await page.getByTestId('draft-commissioner-force-autopick-now').click()
    await page.getByTestId('draft-commissioner-set-timer').click()
    await page.getByTestId('draft-commissioner-skip').click()
    await page.getByTestId('draft-commissioner-pause').click()
    await page.getByTestId('draft-commissioner-resume').click()
    await page.getByTestId('draft-commissioner-open-broadcast').click()
    await expect(page.getByTestId('draft-broadcast-modal')).toBeVisible()
    await page.getByTestId('draft-broadcast-cancel').click()
    await openCommissionerControls(page)
    await page.getByTestId('draft-commissioner-resync').click()
    await page.getByTestId('draft-commissioner-close').click()
    await expect.poll(() => mocks.getControlsRequests().length).toBeGreaterThan(0)
    const settingsPatches = mocks.getSettingsPatchRequests()
    expect(settingsPatches.some((p) => Object.prototype.hasOwnProperty.call(p, 'orphanTeamAiManagerEnabled'))).toBeTruthy()
    expect(settingsPatches.some((p) => p.orphanDrafterMode === 'ai')).toBeTruthy()
    expect(settingsPatches.some((p) => Object.prototype.hasOwnProperty.call(p, 'tradedPickColorModeEnabled'))).toBeTruthy()
    expect(settingsPatches.some((p) => Object.prototype.hasOwnProperty.call(p, 'tradedPickOwnerNameRedEnabled'))).toBeTruthy()
    expect(settingsPatches.some((p) => Object.prototype.hasOwnProperty.call(p, 'aiAdpEnabled'))).toBeTruthy()
    expect(settingsPatches.some((p) => Object.prototype.hasOwnProperty.call(p, 'aiQueueReorderEnabled'))).toBeTruthy()
    expect(settingsPatches.some((p) => Object.prototype.hasOwnProperty.call(p, 'liveDraftChatSyncEnabled'))).toBeTruthy()
    expect(settingsPatches.some((p) => Object.prototype.hasOwnProperty.call(p, 'autoPickEnabled'))).toBeTruthy()
    expect(settingsPatches.some((p) => p.timerMode === 'soft_pause')).toBeTruthy()
    expect(settingsPatches.some((p) => Object.prototype.hasOwnProperty.call(p, 'commissionerForceAutoPickEnabled'))).toBeTruthy()
    const controlActions = mocks.getControlsRequests().map((request) => String(request.action ?? ''))
    expect(controlActions).toContain('set_timer_seconds')
    expect(controlActions).toContain('skip_pick')
    expect(controlActions).toContain('force_autopick')
    expect(controlActions).toContain('pause')
    expect(controlActions).toContain('resume')
    if (aiRunAttempted) {
      await expect.poll(() => mocks.getAiPickRequests().length).toBeGreaterThan(0)
    }
  })

  test('commissioner can start draft from pre-draft state', async ({ page }) => {
    const leagueId = `e2e-draft-room-start-${Date.now()}`
    await mockDraftRoomApis(page, leagueId, { initialStatus: 'pre_draft' })

    await page.goto(`/e2e/draft-room?leagueId=${leagueId}&sport=NFL`)
    await openDraftRoomHarness(page)

    await openCommissionerControls(page)
    await expect(page.getByTestId('draft-commissioner-start')).toBeVisible()
    await page.getByTestId('draft-commissioner-start').click()
    await expect(page.getByTestId('draft-commissioner-start')).toHaveCount(0)
    await expect(page.getByTestId('draft-commissioner-pause')).toBeVisible()
  })

  test('commissioner controls are permission-gated in non-commissioner view', async ({ page }) => {
    const leagueId = `e2e-draft-room-non-commissioner-${Date.now()}`
    await mockDraftRoomApis(page, leagueId)

    await page.goto(`/e2e/draft-room?leagueId=${leagueId}&sport=NFL&commissioner=0`)
    await openDraftRoomHarness(page)

    await expect(page.getByTestId('draft-open-commissioner-controls')).toHaveCount(0)
    await expect(page.getByTestId('draft-commissioner-modal')).toHaveCount(0)
  })

  test('draft intel queue panel renders and top-choice CTA is wired', async ({ page }) => {
    const leagueId = `e2e-draft-room-intel-${Date.now()}`
    const mocks = await mockDraftRoomApis(page, leagueId)
    await page.route(`**/api/draft/intel/stream?leagueId=${leagueId}`, async (route) => {
      const payload = {
        leagueId,
        userId: 'user-2',
        rosterId: 'roster-2',
        leagueName: 'E2E Draft Room',
        sport: 'NFL',
        sessionId: 'session-1',
        status: 'on_clock',
        trigger: 'on_clock',
        currentOverall: 2,
        userNextOverall: 2,
        picksUntilUser: 0,
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        headline: "You're on the clock in E2E Draft Room.",
        queue: [
          {
            rank: 1,
            playerName: 'Atlas Runner',
            position: 'RB',
            team: 'NYJ',
            availabilityProbability: 100,
            availabilityLabel: 'high',
            reason: 'Best fit for your roster and current board.',
          },
          {
            rank: 2,
            playerName: 'Blaze Catcher',
            position: 'WR',
            team: 'DAL',
            availabilityProbability: 100,
            availabilityLabel: 'high',
            reason: 'Fallback if the top running back leaves the board.',
          },
        ],
        predictions: [],
        messages: {
          ready: 'Queue ready.',
          update: 'Queue updated.',
          onClock: "You're on the clock. Take Atlas Runner now.",
        },
        recap: null,
        archived: false,
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `event: snapshot\ndata: ${JSON.stringify(payload)}\n\n`,
      })
    })

    await page.goto(`/e2e/draft-room?leagueId=${leagueId}&sport=NFL`)
    await openDraftRoomHarness(page)

    await expect(page.getByTestId('draft-intel-queue-panel')).toBeVisible()
    await expect(page.getByTestId('draft-intel-headline')).toContainText(/on the clock/i)
    await expect(page.getByTestId('draft-intel-entry-1')).toContainText(/Atlas Runner/i)
    await page.getByTestId('draft-intel-draft-top-choice').click()
    await expect.poll(() => mocks.getPickRequests().length).toBeGreaterThan(0)
  })

  test('post-draft summary, replay, AI recap, and share actions are wired', async ({ page }) => {
    const leagueId = `e2e-draft-room-post-draft-${Date.now()}`
    await mockDraftRoomApis(page, leagueId, { initialStatus: 'completed' })
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => Promise.resolve(),
        },
      })
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async () => Promise.resolve(),
      })
    })

    await page.goto(`/e2e/draft-room?leagueId=${leagueId}&sport=NFL`)
    await page.getByTestId('draft-enter-room-button').click()

    await expect(page.getByTestId('post-draft-view')).toBeVisible()
    await page.getByTestId('post-draft-tab-summary').click()
    await expect(page.getByTestId('post-draft-summary-panel')).toBeVisible()
    await expect(page.getByTestId('post-draft-summary-card-overview')).toBeVisible()
    await expect(page.getByTestId('post-draft-summary-card-position')).toBeVisible()
    await page.getByTestId('post-draft-summary-open-replay').click()

    await expect(page.getByTestId('post-draft-replay-panel')).toBeVisible()
    await expect(page.getByTestId('post-draft-replay-active-pick')).toBeVisible()
    await page.getByTestId('post-draft-replay-next').click()
    await page.getByTestId('post-draft-replay-play-toggle').click()
    await page.waitForTimeout(900)
    await page.getByTestId('post-draft-replay-play-toggle').click()
    await expect(page.getByTestId('post-draft-replay-progress')).toBeVisible()

    await page.getByTestId('post-draft-tab-teams').click()
    await expect(page.getByTestId('post-draft-teams-panel')).toBeVisible()
    await page.getByTestId('post-draft-team-toggle-1').click()
    await expect(page.getByTestId('post-draft-team-card-1')).toContainText(/Alpha|Keeper One/i)

    await page.getByTestId('post-draft-tab-recap').click()
    await expect(page.getByTestId('post-draft-ai-recap-panel')).toBeVisible()
    await expect(page.getByTestId('post-draft-recap-card-narrative')).toBeVisible()
    await expect(page.getByTestId('post-draft-recap-card-strategy')).toBeVisible()
    await expect(page.getByTestId('post-draft-recap-card-value')).toBeVisible()
    await expect(page.getByTestId('post-draft-recap-card-chimmy')).toBeVisible()
    await expect(page.getByTestId('post-draft-recap-card-team-grades')).toBeVisible()
    await page.getByTestId('post-draft-ai-recap-generate').click()
    await expect(page.getByTestId('post-draft-ai-recap-text')).toBeVisible()
    await page.getByTestId('post-draft-ai-recap-refresh').click()

    await page.getByTestId('post-draft-tab-share').click()
    await expect(page.getByTestId('post-draft-share-panel')).toBeVisible()
    await page.getByTestId('post-draft-share-native').click()
    await page.getByTestId('post-draft-share-copy-link').click()
    await page.getByTestId('post-draft-share-copy-summary').click()
    await page.getByTestId('post-draft-export-csv').click()
    await expect(page.getByTestId('post-draft-share-error')).toHaveCount(0)
    await expect(page.getByTestId('draft-topbar-timer-value')).toHaveCount(0)
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
    const helperWarRoomToggle = mobile.getByTestId('draft-open-war-room-button').first()
    const helperUpgradeLink = mobile.getByTestId('locked-feature-upgrade-link').first()
    const helperLoadingState = mobile.getByText(/Checking premium access|Loading monetization details/i).first()
    await expect
      .poll(
        async () =>
          (await helperWarRoomToggle.isVisible().catch(() => false)) ||
          (await helperUpgradeLink.isVisible().catch(() => false)) ||
          (await helperLoadingState.isVisible().catch(() => false)),
        { timeout: 12_000 }
      )
      .toBe(true)
    if (await helperWarRoomToggle.isVisible().catch(() => false)) {
      await expect(helperWarRoomToggle).toBeVisible()
    } else if (await helperUpgradeLink.isVisible().catch(() => false)) {
      await expect(helperUpgradeLink).toBeVisible()
    } else {
      await expect(helperLoadingState).toBeVisible()
    }
    await page.getByTestId('draft-mobile-tab-chat').click()
    await expect(mobile.getByTestId('draft-chat-panel')).toBeVisible()
    await expect(mobile.getByTestId('draft-chat-media-gif')).toBeVisible()
    await expect(mobile.getByTestId('draft-chat-media-link')).toBeVisible()
    await page.getByTestId('draft-mobile-tab-board').click()
    await expect(page.getByTestId('draft-mobile-current-pick')).toBeVisible()
    await page.getByTestId('draft-mobile-quick-search').click()
    await expect(mobile.getByTestId('draft-player-panel')).toBeVisible()
    await page.getByTestId('draft-mobile-tab-board').click()
    await page.getByTestId('draft-mobile-quick-queue').click()
    await expect(mobile.getByTestId('draft-queue-panel')).toBeVisible()
    await page.getByTestId('draft-mobile-tab-board').click()
    await page.getByTestId('draft-mobile-quick-chat').click()
    await expect(mobile.getByTestId('draft-chat-panel')).toBeVisible()
    await page.getByTestId('draft-mobile-tab-board').click()
    await page.getByTestId('draft-mobile-quick-helper').click()
    if (await helperWarRoomToggle.isVisible().catch(() => false)) {
      await expect(helperWarRoomToggle).toBeVisible()
    } else if (await helperUpgradeLink.isVisible().catch(() => false)) {
      await expect(helperUpgradeLink).toBeVisible()
    } else {
      await expect(helperLoadingState).toBeVisible()
    }
    await openCommissionerControls(page)
    await page.getByTestId('draft-commissioner-close').click()
    await page.getByTestId('draft-mobile-tab-board').click()
    await expect(mobile.getByTestId('draft-board')).toBeVisible()
  })
})
