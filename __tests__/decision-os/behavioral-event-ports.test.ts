/**
 * Decision OS — Phase 5.1 Behavioral Event Ports + Assembly tests.
 *
 * Tests mappers (pure row → event) and assembler (event[] → facts).
 * No DB access — all tests use in-memory raw row fixtures.
 *
 * Coverage:
 * - Waiver claim: created + processed (awarded / denied / unprocessed)
 * - Trade: created + accepted + rejected (with nulls for absent timestamps)
 * - Roster move: lineup_saved mapping
 * - Draft: session start guard + pick mapping
 * - Batch mappers: correct event counts
 * - Manager assembler: counts, waiver success, lastActivity, managerId filter, empty input
 * - League assembler: counts, activeManagerIds, lastActivity, empty input
 * - Coverage profile: score, coveredTypes, uncoveredTypes
 * - Completeness: null managerId degrades score; null playerId degrades score
 * - Provenance: provider always null
 * - No mutation: input rows/events unchanged after mapping/assembly
 */

import { describe, it, expect } from 'vitest'

import {
  mapWaiverClaimToCreatedEvent,
  mapWaiverClaimToProcessedEvent,
  mapLeagueTradeToCreatedEvent,
  mapLeagueTradeToAcceptedEvent,
  mapLeagueTradeToRejectedEvent,
  mapLeagueTradeToEvents,
  mapRosterMoveToLineupSavedEvent,
  mapDraftSessionToStartedEvent,
  mapDraftPickToEvent,
  mapWaiverClaimsToEvents,
  mapLeagueTradesToEvents,
  mapRosterMovesToEvents,
  mapDraftRowsToEvents,
  mapRedraftTradeToCreatedEvent,
  mapRedraftTradeToAcceptedEvent,
  mapRedraftTradeToRejectedEvent,
  mapRedraftTradeToEvents,
  mapRedraftTradesToEvents,
  mapRedraftRosterPlayerToLineupSavedEvent,
  mapRedraftRosterPlayersToEvents,
  mapRedraftRosterMoveToLineupSavedEvent,
  mapRedraftRosterMovesToEvents,
} from '@/lib/decision-os/behavioral/mappers'

import {
  assembleManagerBehavioralFacts,
  assembleLeagueBehavioralFacts,
  assembleBehavioralFactsCoverage,
} from '@/lib/decision-os/behavioral/assemble'

import type {
  RawWaiverClaimRow,
  RawLeagueTradeRow,
  RawRosterMoveRow,
  RawDraftSessionRow,
  RawDraftPickRow,
  RawRedraftTradeRow,
  RawRedraftRosterPlayerRow,
  RawRedraftRosterMoveRow,
} from '@/lib/decision-os/behavioral/port'

import type { BehavioralEvent } from '@/lib/decision-os/behavioral'

// ── Fixture builders ──────────────────────────────────────────────────────────

const T0 = new Date('2026-01-10T12:00:00Z')
const T1 = new Date('2026-01-15T09:00:00Z')
const T2 = new Date('2026-01-20T18:00:00Z')

function makeWaiverRow(overrides: Partial<RawWaiverClaimRow> = {}): RawWaiverClaimRow {
  return {
    id: 'wc-001',
    leagueId: 'lg-A',
    rosterId: 'ros-1',
    userId: 'user-1',
    addPlayerId: 'player-X',
    dropPlayerId: 'player-Y',
    faabBid: 25,
    priorityOrder: 0,
    claimType: 'add_drop',
    status: 'pending',
    processedAt: null,
    resultMessage: null,
    createdAt: T0,
    ...overrides,
  }
}

function makeTradeRow(overrides: Partial<RawLeagueTradeRow> = {}): RawLeagueTradeRow {
  return {
    id: 'trade-001',
    leagueId: 'lg-A',
    proposedByUserId: 'user-1',
    proposerRosterId: 'ros-1',
    receiverRosterId: 'ros-2',
    status: 'pending',
    reviewType: 'commissioner',
    acceptedAt: null,
    rejectedAt: null,
    expiresAt: null,
    createdAt: T0,
    itemCount: 3,
    ...overrides,
  }
}

function makeRosterMoveRow(overrides: Partial<RawRosterMoveRow> = {}): RawRosterMoveRow {
  return {
    id: 'move-001',
    leagueId: 'lg-A',
    rosterId: 'ros-1',
    season: 2025,
    week: 7,
    actorUserId: 'user-1',
    source: 'user',
    moveSummary: 'Lineup saved',
    createdAt: T1,
    ...overrides,
  }
}

function makeDraftSession(overrides: Partial<RawDraftSessionRow> = {}): RawDraftSessionRow {
  return {
    id: 'session-001',
    leagueId: 'lg-A',
    status: 'completed',
    draftType: 'snake',
    rounds: 15,
    teamCount: 12,
    createdAt: T0,
    sportType: 'nfl',
    ...overrides,
  }
}

function makeDraftPick(overrides: Partial<RawDraftPickRow> = {}): RawDraftPickRow {
  return {
    id: 'pick-001',
    sessionId: 'session-001',
    leagueId: 'lg-A',
    overall: 1,
    round: 1,
    slot: 1,
    rosterId: 'ros-1',
    playerName: 'Patrick Mahomes',
    position: 'QB',
    team: 'KC',
    playerId: 'pm-15',
    assetType: 'player',
    amount: null,
    ownerUserId: 'user-1',
    pickedAt: T1,
    createdAt: T0,
    sportType: 'nfl',
    ...overrides,
  }
}

// ── Waiver claim: created event ───────────────────────────────────────────────

describe('mapWaiverClaimToCreatedEvent', () => {
  it('produces waiver_claim_created with correct shape', () => {
    const row = makeWaiverRow()
    const event = mapWaiverClaimToCreatedEvent(row)
    expect(event.eventType).toBe('waiver_claim_created')
    expect(event.eventId).toBe('wc_created_wc-001')
    expect(event.leagueId).toBe('lg-A')
    expect(event.managerId).toBe('user-1')
    expect(event.source).toBe('api')
  })

  it('sets FAAB waiverType and bidAmount when faabBid present', () => {
    const event = mapWaiverClaimToCreatedEvent(makeWaiverRow({ faabBid: 25 }))
    if (event.eventType !== 'waiver_claim_created') throw new Error('wrong type')
    expect(event.metadata.waiverType).toBe('faab')
    expect(event.metadata.bidAmount).toBe(25)
    expect(event.metadata.priority).toBeNull()
  })

  it('sets priority waiverType when faabBid is null', () => {
    const event = mapWaiverClaimToCreatedEvent(makeWaiverRow({ faabBid: null, priorityOrder: 3 }))
    if (event.eventType !== 'waiver_claim_created') throw new Error('wrong type')
    expect(event.metadata.waiverType).toBe('priority')
    expect(event.metadata.priority).toBe(3)
    expect(event.metadata.bidAmount).toBeNull()
  })

  it('leaves addPlayerName and dropPlayerName null', () => {
    const event = mapWaiverClaimToCreatedEvent(makeWaiverRow())
    if (event.eventType !== 'waiver_claim_created') throw new Error('wrong type')
    expect(event.metadata.addPlayerName).toBeNull()
    expect(event.metadata.dropPlayerName).toBeNull()
  })

  it('degrades completeness when userId is null', () => {
    const withUser = mapWaiverClaimToCreatedEvent(makeWaiverRow({ userId: 'user-1' }))
    const noUser = mapWaiverClaimToCreatedEvent(makeWaiverRow({ userId: null }))
    expect(noUser.completeness).toBeLessThan(withUser.completeness)
    expect(withUser.completeness).toBe(70)
    expect(noUser.completeness).toBe(50)
  })

  it('provenance has provider null and derivedFrom WaiverClaim', () => {
    const event = mapWaiverClaimToCreatedEvent(makeWaiverRow())
    expect(event.provenance.provider).toBeNull()
    expect(event.provenance.derivedFrom).toContain('WaiverClaim')
  })

  it('occurredAt matches createdAt', () => {
    const event = mapWaiverClaimToCreatedEvent(makeWaiverRow())
    expect(event.occurredAt).toBe(T0.toISOString())
  })
})

// ── Waiver claim: processed event ────────────────────────────────────────────

describe('mapWaiverClaimToProcessedEvent', () => {
  it('returns null when processedAt is null', () => {
    expect(mapWaiverClaimToProcessedEvent(makeWaiverRow({ processedAt: null }))).toBeNull()
  })

  it('produces waiver_claim_processed with outcome=awarded when status=awarded', () => {
    const event = mapWaiverClaimToProcessedEvent(
      makeWaiverRow({ status: 'awarded', processedAt: T1 }),
    )
    expect(event).not.toBeNull()
    expect(event!.eventType).toBe('waiver_claim_processed')
    if (event!.eventType !== 'waiver_claim_processed') throw new Error('wrong type')
    expect(event!.metadata.outcome).toBe('awarded')
    expect(event!.metadata.denialReason).toBeNull()
    expect(event!.eventId).toBe('wc_processed_wc-001')
  })

  it('produces denied outcome with denialReason for non-awarded status', () => {
    const event = mapWaiverClaimToProcessedEvent(
      makeWaiverRow({ status: 'denied', processedAt: T1, resultMessage: 'Outbid' }),
    )!
    if (event.eventType !== 'waiver_claim_processed') throw new Error('wrong type')
    expect(event.metadata.outcome).toBe('denied')
    expect(event.metadata.denialReason).toBe('Outbid')
  })

  it('source is cron (waiver runs are cron-driven)', () => {
    const event = mapWaiverClaimToProcessedEvent(makeWaiverRow({ processedAt: T1 }))!
    expect(event.source).toBe('cron')
  })

  it('occurredAt uses processedAt', () => {
    const event = mapWaiverClaimToProcessedEvent(makeWaiverRow({ processedAt: T1 }))!
    expect(event.occurredAt).toBe(T1.toISOString())
  })
})

// ── Trade: created event ──────────────────────────────────────────────────────

describe('mapLeagueTradeToCreatedEvent', () => {
  it('produces trade_created with proposer as managerId', () => {
    const event = mapLeagueTradeToCreatedEvent(makeTradeRow())
    expect(event.eventType).toBe('trade_created')
    expect(event.managerId).toBe('user-1')
    expect(event.eventId).toBe('trade_created_trade-001')
  })

  it('maps reviewType to vetoMode', () => {
    const commissioner = mapLeagueTradeToCreatedEvent(makeTradeRow({ reviewType: 'commissioner' }))
    if (commissioner.eventType !== 'trade_created') throw new Error('wrong type')
    expect(commissioner.metadata.vetoMode).toBe('commissioner')

    const vote = mapLeagueTradeToCreatedEvent(makeTradeRow({ reviewType: 'league_vote' }))
    if (vote.eventType !== 'trade_created') throw new Error('wrong type')
    expect(vote.metadata.vetoMode).toBe('league_vote')

    const unknown = mapLeagueTradeToCreatedEvent(makeTradeRow({ reviewType: 'other' }))
    if (unknown.eventType !== 'trade_created') throw new Error('wrong type')
    expect(unknown.metadata.vetoMode).toBeNull()
  })

  it('carries itemCount as assetCount', () => {
    const event = mapLeagueTradeToCreatedEvent(makeTradeRow({ itemCount: 4 }))
    if (event.eventType !== 'trade_created') throw new Error('wrong type')
    expect(event.metadata.assetCount).toBe(4)
  })

  it('completeness is 90 (proposer always known, no provider)', () => {
    const event = mapLeagueTradeToCreatedEvent(makeTradeRow())
    expect(event.completeness).toBe(90)
  })
})

// ── Trade: accepted / rejected events ────────────────────────────────────────

describe('mapLeagueTradeToAcceptedEvent', () => {
  it('returns null when acceptedAt is null', () => {
    expect(mapLeagueTradeToAcceptedEvent(makeTradeRow({ acceptedAt: null }))).toBeNull()
  })

  it('produces trade_accepted with null managerId and inferred actorConfidence', () => {
    const event = mapLeagueTradeToAcceptedEvent(makeTradeRow({ acceptedAt: T1 }))!
    expect(event.eventType).toBe('trade_accepted')
    expect(event.managerId).toBeNull()
    expect(event.uncertainty.actorConfidence).toBe('inferred')
    if (event.eventType !== 'trade_accepted') throw new Error('wrong type')
    expect(event.metadata.acceptorRosterId).toBe('ros-2')
  })

  it('completeness is 70 (no managerId, no provider)', () => {
    const event = mapLeagueTradeToAcceptedEvent(makeTradeRow({ acceptedAt: T1 }))!
    expect(event.completeness).toBe(70)
  })
})

describe('mapLeagueTradeToRejectedEvent', () => {
  it('returns null when rejectedAt is null', () => {
    expect(mapLeagueTradeToRejectedEvent(makeTradeRow({ rejectedAt: null }))).toBeNull()
  })

  it('produces trade_rejected with unknown actorConfidence', () => {
    const event = mapLeagueTradeToRejectedEvent(makeTradeRow({ rejectedAt: T2 }))!
    expect(event.eventType).toBe('trade_rejected')
    expect(event.managerId).toBeNull()
    expect(event.uncertainty.actorConfidence).toBe('unknown')
    if (event.eventType !== 'trade_rejected') throw new Error('wrong type')
    expect(event.metadata.rejectionReason).toBeNull()
  })
})

describe('mapLeagueTradeToEvents', () => {
  it('emits 1 event for pending trade', () => {
    const events = mapLeagueTradeToEvents(makeTradeRow())
    expect(events).toHaveLength(1)
    expect(events[0]!.eventType).toBe('trade_created')
  })

  it('emits 2 events for accepted trade', () => {
    const events = mapLeagueTradeToEvents(makeTradeRow({ acceptedAt: T1, status: 'accepted' }))
    expect(events).toHaveLength(2)
    expect(events.map((e) => e.eventType)).toContain('trade_accepted')
  })

  it('emits 2 events for rejected trade', () => {
    const events = mapLeagueTradeToEvents(makeTradeRow({ rejectedAt: T2, status: 'rejected' }))
    expect(events).toHaveLength(2)
    expect(events.map((e) => e.eventType)).toContain('trade_rejected')
  })
})

// ── Roster move mapper ────────────────────────────────────────────────────────

describe('mapRosterMoveToLineupSavedEvent', () => {
  it('produces lineup_saved with week and season', () => {
    const event = mapRosterMoveToLineupSavedEvent(makeRosterMoveRow())
    expect(event.eventType).toBe('lineup_saved')
    if (event.eventType !== 'lineup_saved') throw new Error('wrong type')
    expect(event.metadata.week).toBe(7)
    expect(event.metadata.season).toBe(2025)
  })

  it('sets slotChanges=0 and empty player arrays (slot detail unavailable)', () => {
    const event = mapRosterMoveToLineupSavedEvent(makeRosterMoveRow())
    if (event.eventType !== 'lineup_saved') throw new Error('wrong type')
    expect(event.metadata.slotChanges).toBe(0)
    expect(event.metadata.startedPlayerIds).toEqual([])
    expect(event.metadata.benchedPlayerIds).toEqual([])
  })

  it('uses actorUserId as managerId', () => {
    const event = mapRosterMoveToLineupSavedEvent(makeRosterMoveRow({ actorUserId: 'user-1' }))
    expect(event.managerId).toBe('user-1')
  })

  it('degrades completeness when actorUserId is null', () => {
    const withActor = mapRosterMoveToLineupSavedEvent(makeRosterMoveRow({ actorUserId: 'u' }))
    const noActor = mapRosterMoveToLineupSavedEvent(makeRosterMoveRow({ actorUserId: null }))
    expect(withActor.completeness).toBe(80)
    expect(noActor.completeness).toBe(60)
  })

  it('provenance derivedFrom contains AfRosterMoveHistory', () => {
    const event = mapRosterMoveToLineupSavedEvent(makeRosterMoveRow())
    expect(event.provenance.derivedFrom).toContain('AfRosterMoveHistory')
    expect(event.provenance.provider).toBeNull()
  })
})

// ── Draft mappers ─────────────────────────────────────────────────────────────

describe('mapDraftSessionToStartedEvent', () => {
  it('produces draft_started as a system event', () => {
    const event = mapDraftSessionToStartedEvent(makeDraftSession())
    expect(event.eventType).toBe('draft_started')
    expect(event.source).toBe('system')
    expect(event.managerId).toBeNull()
  })

  it('sets totalPicks = rounds × teamCount', () => {
    const event = mapDraftSessionToStartedEvent(makeDraftSession({ rounds: 15, teamCount: 12 }))
    if (event.eventType !== 'draft_started') throw new Error('wrong type')
    expect(event.metadata.totalPicks).toBe(180)
    expect(event.metadata.totalManagers).toBe(12)
  })

  it('maps draftType correctly', () => {
    const snake = mapDraftSessionToStartedEvent(makeDraftSession({ draftType: 'snake' }))
    if (snake.eventType !== 'draft_started') throw new Error('wrong type')
    expect(snake.metadata.draftType).toBe('snake')

    const auction = mapDraftSessionToStartedEvent(makeDraftSession({ draftType: 'auction' }))
    if (auction.eventType !== 'draft_started') throw new Error('wrong type')
    expect(auction.metadata.draftType).toBe('auction')

    const unknown = mapDraftSessionToStartedEvent(makeDraftSession({ draftType: 'custom' }))
    if (unknown.eventType !== 'draft_started') throw new Error('wrong type')
    expect(unknown.metadata.draftType).toBeNull()
  })
})

describe('mapDraftPickToEvent', () => {
  it('produces draft_pick_made with playerName and position', () => {
    const event = mapDraftPickToEvent(makeDraftPick())
    expect(event.eventType).toBe('draft_pick_made')
    if (event.eventType !== 'draft_pick_made') throw new Error('wrong type')
    expect(event.metadata.playerName).toBe('Patrick Mahomes')
    expect(event.metadata.position).toBe('QB')
    expect(event.metadata.overallPick).toBe(1)
    expect(event.metadata.round).toBe(1)
  })

  it('uses pickedAt for occurredAt when available', () => {
    const event = mapDraftPickToEvent(makeDraftPick({ pickedAt: T1, createdAt: T0 }))
    expect(event.occurredAt).toBe(T1.toISOString())
    expect(event.recordedAt).toBe(T0.toISOString())
  })

  it('falls back to createdAt when pickedAt is null', () => {
    const event = mapDraftPickToEvent(makeDraftPick({ pickedAt: null, createdAt: T0 }))
    expect(event.occurredAt).toBe(T0.toISOString())
  })

  it('degrades completeness when playerId is null', () => {
    const withId = mapDraftPickToEvent(makeDraftPick({ playerId: 'pm-15', ownerUserId: 'u' }))
    const noId = mapDraftPickToEvent(makeDraftPick({ playerId: null, ownerUserId: 'u' }))
    expect(withId.completeness).toBe(90)
    expect(noId.completeness).toBe(80)
  })

  it('uses ownerUserId as managerId', () => {
    const event = mapDraftPickToEvent(makeDraftPick({ ownerUserId: 'user-5' }))
    expect(event.managerId).toBe('user-5')
  })
})

// ── Batch mappers ─────────────────────────────────────────────────────────────

describe('mapWaiverClaimsToEvents', () => {
  it('emits 1 event per unprocessed claim', () => {
    const events = mapWaiverClaimsToEvents([makeWaiverRow(), makeWaiverRow({ id: 'wc-002' })])
    expect(events).toHaveLength(2)
  })

  it('emits 2 events per processed claim', () => {
    const events = mapWaiverClaimsToEvents([
      makeWaiverRow({ status: 'awarded', processedAt: T1 }),
    ])
    expect(events).toHaveLength(2)
    expect(events.map((e) => e.eventType)).toContain('waiver_claim_processed')
  })

  it('returns empty array for empty input', () => {
    expect(mapWaiverClaimsToEvents([])).toHaveLength(0)
  })
})

describe('mapLeagueTradesToEvents', () => {
  it('emits created + accepted for an accepted trade', () => {
    const events = mapLeagueTradesToEvents([makeTradeRow({ acceptedAt: T1, status: 'accepted' })])
    expect(events.map((e) => e.eventType).sort()).toEqual(['trade_accepted', 'trade_created'])
  })
})

describe('mapRosterMovesToEvents', () => {
  it('emits one lineup_saved per row', () => {
    const events = mapRosterMovesToEvents([makeRosterMoveRow(), makeRosterMoveRow({ id: 'm2' })])
    expect(events).toHaveLength(2)
    expect(events.every((e) => e.eventType === 'lineup_saved')).toBe(true)
  })
})

describe('mapDraftRowsToEvents', () => {
  it('skips draft_started when status is pre_draft', () => {
    const session = makeDraftSession({ status: 'pre_draft' })
    const events = mapDraftRowsToEvents(session, [makeDraftPick()])
    expect(events.every((e) => e.eventType !== 'draft_started')).toBe(true)
    expect(events).toHaveLength(1)
  })

  it('emits draft_started for completed session', () => {
    const session = makeDraftSession({ status: 'completed' })
    const events = mapDraftRowsToEvents(session, [makeDraftPick()])
    expect(events.map((e) => e.eventType)).toContain('draft_started')
    expect(events).toHaveLength(2)
  })

  it('returns empty array when session is null and no picks', () => {
    expect(mapDraftRowsToEvents(null, [])).toHaveLength(0)
  })
})

// ── Phase 2E: Redraft trade + roster mappers ─────────────────────────────────

function makeRedraftTradeRow(overrides: Partial<RawRedraftTradeRow> = {}): RawRedraftTradeRow {
  return {
    id: 'redraft-trade-001',
    leagueId: 'lg-A',
    proposerRosterId: 'ros-1',
    receiverRosterId: 'ros-2',
    proposerOwnerId: 'user-1',
    receiverOwnerId: 'user-2',
    status: 'pending',
    vetoMode: 'commissioner',
    acceptedAt: null,
    rejectedAt: null,
    expiresAt: null,
    createdAt: T0,
    itemCount: 3,
    ...overrides,
  }
}

function makeRedraftRosterPlayerRow(overrides: Partial<RawRedraftRosterPlayerRow> = {}): RawRedraftRosterPlayerRow {
  return {
    id: 'redraft-rp-001',
    leagueId: 'lg-A',
    rosterId: 'ros-1',
    ownerUserId: 'user-1',
    playerId: 'player-z',
    playerName: 'Player Z',
    acquisitionType: 'free_agent',
    addedAt: T0,
    droppedAt: null,
    ...overrides,
  }
}

describe('mapRedraftTradeToCreatedEvent', () => {
  it('produces trade_created with the proposer roster owner as managerId', () => {
    const e = mapRedraftTradeToCreatedEvent(makeRedraftTradeRow())
    expect(e.eventType).toBe('trade_created')
    expect(e.managerId).toBe('user-1')
    expect(e.leagueId).toBe('lg-A')
  })

  it('maps vetoMode through unchanged (same vocabulary as AfLeagueTrade.reviewType)', () => {
    expect(mapRedraftTradeToCreatedEvent(makeRedraftTradeRow({ vetoMode: 'league_vote' })).metadata).toMatchObject({
      vetoMode: 'league_vote',
    })
    expect(mapRedraftTradeToCreatedEvent(makeRedraftTradeRow({ vetoMode: 'no_veto' })).metadata).toMatchObject({
      vetoMode: 'no_veto',
    })
  })

  it('carries itemCount as assetCount', () => {
    const e = mapRedraftTradeToCreatedEvent(makeRedraftTradeRow({ itemCount: 5 }))
    expect(e.metadata).toMatchObject({ assetCount: 5 })
  })

  it('provenance derivedFrom names RedraftTradeProposal + RedraftTradeAsset', () => {
    const e = mapRedraftTradeToCreatedEvent(makeRedraftTradeRow())
    expect(e.provenance.derivedFrom).toEqual(['RedraftTradeProposal', 'RedraftTradeAsset'])
    expect(e.provenance.provider).toBeNull()
  })
})

describe('mapRedraftTradeToAcceptedEvent', () => {
  it('returns null when acceptedAt is null', () => {
    expect(mapRedraftTradeToAcceptedEvent(makeRedraftTradeRow())).toBeNull()
  })

  it('produces trade_accepted with a REAL, confirmed managerId (unlike AfLeagueTrade, which cannot)', () => {
    const e = mapRedraftTradeToAcceptedEvent(makeRedraftTradeRow({ acceptedAt: T1 }))!
    expect(e.eventType).toBe('trade_accepted')
    expect(e.managerId).toBe('user-2')
    expect(e.uncertainty.actorConfidence).toBe('confirmed')
  })
})

describe('mapRedraftTradeToRejectedEvent', () => {
  it('returns null when rejectedAt is null', () => {
    expect(mapRedraftTradeToRejectedEvent(makeRedraftTradeRow())).toBeNull()
  })

  it('produces trade_rejected with a REAL, confirmed managerId', () => {
    const e = mapRedraftTradeToRejectedEvent(makeRedraftTradeRow({ rejectedAt: T1 }))!
    expect(e.eventType).toBe('trade_rejected')
    expect(e.managerId).toBe('user-2')
    expect(e.uncertainty.actorConfidence).toBe('confirmed')
  })
})

describe('mapRedraftTradeToEvents', () => {
  it('emits 1 event for a pending trade', () => {
    expect(mapRedraftTradeToEvents(makeRedraftTradeRow())).toHaveLength(1)
  })

  it('emits 2 events for an accepted trade', () => {
    const events = mapRedraftTradeToEvents(makeRedraftTradeRow({ acceptedAt: T1 }))
    expect(events.map((e) => e.eventType)).toEqual(['trade_created', 'trade_accepted'])
  })

  it('emits 2 events for a rejected trade', () => {
    const events = mapRedraftTradeToEvents(makeRedraftTradeRow({ rejectedAt: T1 }))
    expect(events.map((e) => e.eventType)).toEqual(['trade_created', 'trade_rejected'])
  })
})

describe('mapRedraftTradesToEvents', () => {
  it('flattens a batch of proposals into their combined events', () => {
    const events = mapRedraftTradesToEvents([
      makeRedraftTradeRow({ id: 't-1' }),
      makeRedraftTradeRow({ id: 't-2', acceptedAt: T1 }),
    ])
    expect(events).toHaveLength(3) // 1 (pending) + 2 (accepted)
  })

  it('returns empty array for empty input (missing redraft data fails safely, not with an error)', () => {
    expect(mapRedraftTradesToEvents([])).toEqual([])
  })
})

describe('mapRedraftRosterPlayerToLineupSavedEvent', () => {
  it('produces a lineup_saved event for a free_agent acquisition', () => {
    const e = mapRedraftRosterPlayerToLineupSavedEvent(makeRedraftRosterPlayerRow())!
    expect(e).not.toBeNull()
    expect(e.eventType).toBe('lineup_saved')
    expect(e.managerId).toBe('user-1')
    expect(e.metadata).toMatchObject({ week: null, season: null, leagueType: 'redraft', slotChanges: 0 })
  })

  it('returns null for waiver-acquired rows (already covered by the WaiverClaim mapper)', () => {
    expect(mapRedraftRosterPlayerToLineupSavedEvent(makeRedraftRosterPlayerRow({ acquisitionType: 'waiver' }))).toBeNull()
  })

  it('returns null for trade-acquired rows (already covered by the RedraftTradeProposal mapper)', () => {
    expect(mapRedraftRosterPlayerToLineupSavedEvent(makeRedraftRosterPlayerRow({ acquisitionType: 'trade' }))).toBeNull()
  })

  it('returns null for drafted rows (already covered by the draft mapper)', () => {
    expect(mapRedraftRosterPlayerToLineupSavedEvent(makeRedraftRosterPlayerRow({ acquisitionType: 'drafted' }))).toBeNull()
  })

  it('uses addedAt as occurredAt', () => {
    const e = mapRedraftRosterPlayerToLineupSavedEvent(makeRedraftRosterPlayerRow({ addedAt: T2 }))!
    expect(e.occurredAt).toBe(T2.toISOString())
  })

  it('provenance derivedFrom names RedraftRosterPlayer', () => {
    const e = mapRedraftRosterPlayerToLineupSavedEvent(makeRedraftRosterPlayerRow())!
    expect(e.provenance.derivedFrom).toEqual(['RedraftRosterPlayer'])
  })
})

describe('mapRedraftRosterPlayersToEvents', () => {
  it('emits one lineup_saved per free_agent row, skipping others', () => {
    const events = mapRedraftRosterPlayersToEvents([
      makeRedraftRosterPlayerRow({ id: 'rp-1', acquisitionType: 'free_agent' }),
      makeRedraftRosterPlayerRow({ id: 'rp-2', acquisitionType: 'waiver' }),
      makeRedraftRosterPlayerRow({ id: 'rp-3', acquisitionType: 'trade' }),
      makeRedraftRosterPlayerRow({ id: 'rp-4', acquisitionType: 'free_agent' }),
    ])
    expect(events).toHaveLength(2)
    expect(events.every((e) => e.eventType === 'lineup_saved')).toBe(true)
  })

  it('returns empty array for empty input', () => {
    expect(mapRedraftRosterPlayersToEvents([])).toEqual([])
  })
})

// ── Phase 2H: Redraft lineup-history mapper ──────────────────────────────────

function makeRedraftRosterMoveRow(overrides: Partial<RawRedraftRosterMoveRow> = {}): RawRedraftRosterMoveRow {
  return {
    id: 'rmh-001',
    leagueId: 'lg-A',
    rosterId: 'ros-1',
    seasonId: 'season-1',
    season: 2026,
    week: 7,
    actorUserId: 'user-1',
    source: 'user',
    createdAt: T0,
    ...overrides,
  }
}

describe('mapRedraftRosterMoveToLineupSavedEvent', () => {
  it('produces lineup_saved with a REAL, non-null week and season', () => {
    const e = mapRedraftRosterMoveToLineupSavedEvent(makeRedraftRosterMoveRow({ week: 9, season: 2026 }))
    expect(e.eventType).toBe('lineup_saved')
    expect(e.metadata).toMatchObject({ week: 9, season: 2026, leagueType: 'redraft' })
  })

  it('uses actorUserId as managerId', () => {
    const e = mapRedraftRosterMoveToLineupSavedEvent(makeRedraftRosterMoveRow({ actorUserId: 'user-42' }))
    expect(e.managerId).toBe('user-42')
  })

  it('degrades completeness when actorUserId is null, but never fabricates one', () => {
    const e = mapRedraftRosterMoveToLineupSavedEvent(makeRedraftRosterMoveRow({ actorUserId: null }))
    expect(e.managerId).toBeNull()
    expect(e.completeness).toBeLessThan(100)
  })

  it('provenance derivedFrom names RedraftRosterMoveHistory', () => {
    const e = mapRedraftRosterMoveToLineupSavedEvent(makeRedraftRosterMoveRow())
    expect(e.provenance.derivedFrom).toEqual(['RedraftRosterMoveHistory'])
    expect(e.provenance.provider).toBeNull()
  })

  it('still sets honest zeros for slot-level detail (not stored per-event)', () => {
    const e = mapRedraftRosterMoveToLineupSavedEvent(makeRedraftRosterMoveRow())
    expect(e.metadata).toMatchObject({ slotChanges: 0, startedPlayerIds: [], benchedPlayerIds: [] })
  })
})

describe('mapRedraftRosterMovesToEvents', () => {
  it('emits one lineup_saved event per row', () => {
    const events = mapRedraftRosterMovesToEvents([
      makeRedraftRosterMoveRow({ id: 'rmh-1' }),
      makeRedraftRosterMoveRow({ id: 'rmh-2' }),
    ])
    expect(events).toHaveLength(2)
    expect(events.every((e) => e.eventType === 'lineup_saved')).toBe(true)
  })

  it('returns empty array for empty input (missing history fails safely, not with an error)', () => {
    expect(mapRedraftRosterMovesToEvents([])).toEqual([])
  })
})

// ── Manager assembler ─────────────────────────────────────────────────────────

function makeWaiverCreatedEvent(managerId: string, leagueId = 'lg-A'): BehavioralEvent {
  return mapWaiverClaimToCreatedEvent(makeWaiverRow({ userId: managerId, leagueId }))
}
function makeWaiverProcessedEvent(
  managerId: string,
  outcome: 'awarded' | 'denied',
  leagueId = 'lg-A',
): BehavioralEvent {
  return mapWaiverClaimToProcessedEvent(
    makeWaiverRow({ userId: managerId, leagueId, status: outcome, processedAt: T1 }),
  )!
}
function makeTradeCreatedEvent(managerId: string, leagueId = 'lg-A'): BehavioralEvent {
  return mapLeagueTradeToCreatedEvent(
    makeTradeRow({ proposedByUserId: managerId, leagueId }),
  )
}
function makeLineupSavedEvent(managerId: string, leagueId = 'lg-A'): BehavioralEvent {
  return mapRosterMoveToLineupSavedEvent(makeRosterMoveRow({ actorUserId: managerId, leagueId }))
}

describe('assembleManagerBehavioralFacts', () => {
  it('counts lineup saves correctly', () => {
    const events = [makeLineupSavedEvent('user-1'), makeLineupSavedEvent('user-1')]
    const facts = assembleManagerBehavioralFacts({
      managerId: 'user-1',
      leagueId: 'lg-A',
      events,
    })
    expect(facts.lineupSaveCount).toBe(2)
  })

  it('counts waiver claims and successes', () => {
    const events = [
      makeWaiverCreatedEvent('user-1'),
      makeWaiverCreatedEvent('user-1'),
      makeWaiverProcessedEvent('user-1', 'awarded'),
      makeWaiverProcessedEvent('user-1', 'denied'),
    ]
    const facts = assembleManagerBehavioralFacts({
      managerId: 'user-1',
      leagueId: 'lg-A',
      events,
    })
    expect(facts.waiverClaimCount).toBe(2)
    expect(facts.waiverSuccessCount).toBe(1)
  })

  it('filters to the correct managerId', () => {
    const events = [
      makeLineupSavedEvent('user-1'),
      makeLineupSavedEvent('user-2'),
      makeWaiverCreatedEvent('user-2'),
    ]
    const facts = assembleManagerBehavioralFacts({
      managerId: 'user-1',
      leagueId: 'lg-A',
      events,
    })
    expect(facts.lineupSaveCount).toBe(1)
    expect(facts.waiverClaimCount).toBe(0)
    expect(facts.eventCount).toBe(1)
  })

  it('returns zero counts and warns when no events match', () => {
    const facts = assembleManagerBehavioralFacts({
      managerId: 'user-99',
      leagueId: 'lg-A',
      events: [makeLineupSavedEvent('user-1')],
    })
    expect(facts.eventCount).toBe(0)
    expect(facts.lineupSaveCount).toBe(0)
    expect(facts.completeness).toBe(0)
    expect(facts.warnings).toContain('no_events')
  })

  it('lastActivity is the most recent event by occurredAt', () => {
    const early = mapRosterMoveToLineupSavedEvent(
      makeRosterMoveRow({ id: 'm1', actorUserId: 'user-1', createdAt: T0 }),
    )
    const late = mapRosterMoveToLineupSavedEvent(
      makeRosterMoveRow({ id: 'm2', actorUserId: 'user-1', createdAt: T2 }),
    )
    const facts = assembleManagerBehavioralFacts({
      managerId: 'user-1',
      leagueId: 'lg-A',
      events: [early, late],
    })
    expect(facts.lastActivity?.occurredAt).toBe(T2.toISOString())
    expect(facts.lastLineupSave?.occurredAt).toBe(T2.toISOString())
  })

  it('carries lookbackDays through', () => {
    const facts = assembleManagerBehavioralFacts({
      managerId: 'user-1',
      leagueId: 'lg-A',
      events: [],
      lookbackDays: 30,
    })
    expect(facts.lookbackDays).toBe(30)
  })

  it('does not mutate input events array', () => {
    const events = [makeLineupSavedEvent('user-1')]
    const frozen = Object.freeze([...events])
    assembleManagerBehavioralFacts({ managerId: 'user-1', leagueId: 'lg-A', events: frozen as BehavioralEvent[] })
    expect(events).toHaveLength(1)
  })
})

// ── League assembler ──────────────────────────────────────────────────────────

describe('assembleLeagueBehavioralFacts', () => {
  it('counts trades, waivers, and draft picks', () => {
    const events = [
      makeTradeCreatedEvent('user-1'),
      makeTradeCreatedEvent('user-2'),
      makeWaiverCreatedEvent('user-1'),
      makeWaiverProcessedEvent('user-1', 'awarded'),
      mapDraftPickToEvent(makeDraftPick({ ownerUserId: 'user-1' })),
    ]
    const facts = assembleLeagueBehavioralFacts({ leagueId: 'lg-A', events })
    expect(facts.totalTradeCount).toBe(2)
    expect(facts.totalWaiverClaimCount).toBe(1)
    expect(facts.totalWaiverSuccessCount).toBe(1)
    expect(facts.totalDraftPickCount).toBe(1)
  })

  it('collects unique activeManagerIds', () => {
    const events = [
      makeLineupSavedEvent('user-1'),
      makeLineupSavedEvent('user-1'),
      makeLineupSavedEvent('user-2'),
    ]
    const facts = assembleLeagueBehavioralFacts({ leagueId: 'lg-A', events })
    expect(facts.activeManagerIds.sort()).toEqual(['user-1', 'user-2'])
    expect(facts.managerCount).toBe(2)
  })

  it('excludes null managerId from activeManagerIds', () => {
    const noActor = mapRosterMoveToLineupSavedEvent(makeRosterMoveRow({ actorUserId: null }))
    const facts = assembleLeagueBehavioralFacts({ leagueId: 'lg-A', events: [noActor] })
    expect(facts.activeManagerIds).toHaveLength(0)
    expect(facts.managerCount).toBe(0)
  })

  it('returns empty/zero state for empty event array', () => {
    const facts = assembleLeagueBehavioralFacts({ leagueId: 'lg-A', events: [] })
    expect(facts.totalTradeCount).toBe(0)
    expect(facts.eventCount).toBe(0)
    expect(facts.completeness).toBe(0)
    expect(facts.lastActivity).toBeNull()
    expect(facts.warnings).toContain('no_events')
  })

  it('lastActivity is the most recent event across all managers', () => {
    const early = mapRosterMoveToLineupSavedEvent(
      makeRosterMoveRow({ id: 'm1', actorUserId: 'user-1', createdAt: T0 }),
    )
    const late = makeWaiverCreatedEvent('user-2', 'lg-A')
    // late has createdAt=T0 by fixture but let's use a trade with a different leagueId
    const tradeEarly = mapLeagueTradeToCreatedEvent(
      makeTradeRow({ id: 'tr-late', createdAt: T2 }),
    )
    const facts = assembleLeagueBehavioralFacts({
      leagueId: 'lg-A',
      events: [early, late, tradeEarly],
    })
    expect(facts.lastActivity?.occurredAt).toBe(T2.toISOString())
  })
})

// ── Coverage profile ──────────────────────────────────────────────────────────

describe('assembleBehavioralFactsCoverage', () => {
  it('score is 0 and no covered types for empty events', () => {
    const cov = assembleBehavioralFactsCoverage([])
    expect(cov.score).toBe(0)
    expect(cov.coveredTypes).toHaveLength(0)
    expect(cov.warnings).toContain('no_events')
  })

  it('counts covered and uncovered types correctly', () => {
    const events = [makeLineupSavedEvent('user-1'), makeWaiverCreatedEvent('user-1')]
    const cov = assembleBehavioralFactsCoverage(events)
    expect(cov.coveredTypes).toContain('lineup_saved')
    expect(cov.coveredTypes).toContain('waiver_claim_created')
    expect(cov.uncoveredTypes).not.toContain('lineup_saved')
    expect(cov.countsByType['lineup_saved']).toBe(1)
    expect(cov.countsByType['waiver_claim_created']).toBe(1)
  })

  it('score is a percentage of covered event types (14 total)', () => {
    const events = [makeLineupSavedEvent('user-1')]
    const cov = assembleBehavioralFactsCoverage(events)
    // 1 covered / 14 total = ~7%
    expect(cov.score).toBe(Math.round((1 / 14) * 100))
    expect(cov.uncoveredTypes).toHaveLength(13)
  })
})

// ── Provenance invariant ──────────────────────────────────────────────────────

describe('provider is always null across all Phase 5.1 sources', () => {
  it('all native AF source mappers produce provider=null', () => {
    const events: BehavioralEvent[] = [
      mapWaiverClaimToCreatedEvent(makeWaiverRow()),
      mapWaiverClaimToProcessedEvent(makeWaiverRow({ processedAt: T1 }))!,
      mapLeagueTradeToCreatedEvent(makeTradeRow()),
      mapLeagueTradeToAcceptedEvent(makeTradeRow({ acceptedAt: T1 }))!,
      mapLeagueTradeToRejectedEvent(makeTradeRow({ rejectedAt: T1 }))!,
      mapRosterMoveToLineupSavedEvent(makeRosterMoveRow()),
      mapDraftSessionToStartedEvent(makeDraftSession()),
      mapDraftPickToEvent(makeDraftPick()),
    ]
    for (const e of events) {
      expect(e.provenance.provider).toBeNull()
    }
  })
})
