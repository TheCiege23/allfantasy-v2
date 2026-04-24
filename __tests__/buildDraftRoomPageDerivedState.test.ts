import { describe, expect, it } from 'vitest'

import { buildDraftRoomPageDerivedState } from '@/lib/draft-room/buildDraftRoomPageDerivedState'
import { buildDraftRoomCoreState } from '@/lib/live-draft-engine'
import type { DraftSessionSnapshot } from '@/lib/live-draft-engine/types'

function baseSession(over: Partial<DraftSessionSnapshot> = {}): DraftSessionSnapshot {
  return {
    id: 'ds-1',
    leagueId: 'league-1',
    status: 'in_progress',
    draftType: 'snake',
    rounds: 15,
    teamCount: 12,
    thirdRoundReversal: false,
    timerSeconds: 120,
    timerEndAt: null,
    pausedRemainingSeconds: null,
    slotOrder: [],
    tradedPicks: [],
    version: 1,
    picks: [],
    currentPick: {
      overall: 1,
      round: 1,
      slot: 1,
      rosterId: 'r1',
      displayName: 'T1',
      pickLabel: '1.01',
    },
    timer: { status: 'running', remainingSeconds: 60, timerEndAt: new Date(Date.now() + 60_000).toISOString() },
    updatedAt: new Date().toISOString(),
    ...over,
  } as DraftSessionSnapshot
}

describe('buildDraftRoomPageDerivedState', () => {
  it('shows sidebar timer for pre_draft snake; hides for completed, auction, and roster gate', () => {
    const pre = buildDraftRoomPageDerivedState({
      session: baseSession({ status: 'pre_draft' }),
      draftCore: buildDraftRoomCoreState(baseSession({ status: 'pre_draft' })),
      currentPick: null,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: true,
      rosterConfigurationIncomplete: false,
      rosterConfigurationMessage: null,
      snakeCanDraft: false,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(pre.sidebarTimerVisible).toBe(true)

    const done = buildDraftRoomPageDerivedState({
      session: baseSession({ status: 'completed' }),
      draftCore: buildDraftRoomCoreState(baseSession({ status: 'completed' })),
      currentPick: null,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: false,
      rosterConfigurationIncomplete: false,
      rosterConfigurationMessage: null,
      snakeCanDraft: false,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(done.sidebarTimerVisible).toBe(false)

    const auc = buildDraftRoomPageDerivedState({
      session: baseSession({ draftType: 'auction', status: 'in_progress' }),
      draftCore: buildDraftRoomCoreState(baseSession({ draftType: 'auction', status: 'in_progress' })),
      currentPick: null,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: false,
      rosterConfigurationIncomplete: false,
      rosterConfigurationMessage: null,
      snakeCanDraft: false,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(auc.sidebarTimerVisible).toBe(false)

    const gated = buildDraftRoomPageDerivedState({
      session: baseSession({ rosterConfigurationIncomplete: true }),
      draftCore: buildDraftRoomCoreState(baseSession({ rosterConfigurationIncomplete: true })),
      currentPick: null,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: false,
      rosterConfigurationIncomplete: true,
      rosterConfigurationMessage: 'Fix slots',
      snakeCanDraft: true,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(gated.timerMode).toBe('blocked')
    expect(gated.sidebarTimerVisible).toBe(false)
    expect(gated.canDraft).toBe(false)
    expect(gated.timerEndAt).toBeNull()
  })

  it('shows sidebar timer for in_progress snake when gate is open', () => {
    const s = baseSession()
    const st = buildDraftRoomPageDerivedState({
      session: s,
      draftCore: buildDraftRoomCoreState(s),
      currentPick: s.currentPick,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: false,
      rosterConfigurationIncomplete: false,
      rosterConfigurationMessage: null,
      snakeCanDraft: true,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(st.sidebarTimerVisible).toBe(true)
    expect(st.timerMode).toBe('live')
  })

  it('paused session uses paused timer mode and keeps sidebar timer visible', () => {
    const s = baseSession({
      status: 'paused',
      timer: { status: 'paused', remainingSeconds: 42, timerEndAt: null },
    })
    const st = buildDraftRoomPageDerivedState({
      session: s,
      draftCore: buildDraftRoomCoreState(s),
      currentPick: s.currentPick,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: false,
      rosterConfigurationIncomplete: false,
      rosterConfigurationMessage: null,
      snakeCanDraft: false,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(st.timerMode).toBe('paused')
    expect(st.sidebarTimerVisible).toBe(true)
    expect(st.pausedRemainingSeconds).toBe(42)
  })

  it('commissioner start/pause/resume flags', () => {
    const preDraftSession = baseSession({ status: 'pre_draft' })
    const pre = buildDraftRoomPageDerivedState({
      session: preDraftSession,
      draftCore: buildDraftRoomCoreState(preDraftSession),
      currentPick: null,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: true,
      rosterConfigurationIncomplete: false,
      rosterConfigurationMessage: null,
      snakeCanDraft: false,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(pre.canStart).toBe(true)
    expect(pre.canPause).toBe(false)
    expect(pre.canResume).toBe(false)

    const preBlockedSession = baseSession({ status: 'pre_draft', rosterConfigurationIncomplete: true })
    const preBlocked = buildDraftRoomPageDerivedState({
      session: preBlockedSession,
      draftCore: buildDraftRoomCoreState(preBlockedSession),
      currentPick: null,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: true,
      rosterConfigurationIncomplete: true,
      rosterConfigurationMessage: 'x',
      snakeCanDraft: false,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(preBlocked.canStart).toBe(false)

    const live = buildDraftRoomPageDerivedState({
      session: baseSession({ status: 'in_progress' }),
      draftCore: buildDraftRoomCoreState(baseSession({ status: 'in_progress' })),
      currentPick: null,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: true,
      rosterConfigurationIncomplete: false,
      rosterConfigurationMessage: null,
      snakeCanDraft: false,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(live.canPause).toBe(true)
    expect(live.canResume).toBe(false)

    const paused = buildDraftRoomPageDerivedState({
      session: baseSession({ status: 'paused' }),
      draftCore: buildDraftRoomCoreState(baseSession({ status: 'paused' })),
      currentPick: null,
      players: [],
      draftedNames: new Set(),
      draftedPlayerIds: new Set(),
      isCommissioner: true,
      rosterConfigurationIncomplete: false,
      rosterConfigurationMessage: null,
      snakeCanDraft: false,
      auctionCanNominate: false,
      auctionCanBid: false,
    })
    expect(paused.canPause).toBe(false)
    expect(paused.canResume).toBe(true)
  })
})
