import { describe, it, expect } from 'vitest'
import {
  BEHAVIORAL_EVENT_TYPES,
  BEHAVIORAL_EVENT_SOURCES,
  BEHAVIORAL_EVENT_CATEGORIES,
  BEHAVIORAL_EVENT_LABELS,
  getEventCategory,
  isBehavioralEventType,
  isBehavioralEventSource,
  type BehavioralEventType,
  type BehavioralEventCategory,
} from '@/lib/decision-os/behavioral/events/taxonomy'
import {
  isBehavioralEvent,
  clampCompleteness,
  computeEventCompleteness,
  makeSystemProvenance,
  makeImportedProvenance,
  makeMaxUncertainty,
  makeMinUncertainty,
  type BehavioralEvent,
  type BehavioralEventOf,
} from '@/lib/decision-os/behavioral/events/types'

// ── Taxonomy exhaustiveness ───────────────────────────────────────────────────

describe('BEHAVIORAL_EVENT_TYPES', () => {
  it('contains exactly 14 event types', () => {
    expect(BEHAVIORAL_EVENT_TYPES).toHaveLength(14)
  })

  it('contains all roster event types', () => {
    expect(BEHAVIORAL_EVENT_TYPES).toContain('lineup_viewed')
    expect(BEHAVIORAL_EVENT_TYPES).toContain('lineup_saved')
  })

  it('contains all transaction event types', () => {
    expect(BEHAVIORAL_EVENT_TYPES).toContain('trade_created')
    expect(BEHAVIORAL_EVENT_TYPES).toContain('trade_accepted')
    expect(BEHAVIORAL_EVENT_TYPES).toContain('trade_rejected')
    expect(BEHAVIORAL_EVENT_TYPES).toContain('waiver_claim_created')
    expect(BEHAVIORAL_EVENT_TYPES).toContain('waiver_claim_processed')
  })

  it('contains all commissioner event types', () => {
    expect(BEHAVIORAL_EVENT_TYPES).toContain('commissioner_action')
    expect(BEHAVIORAL_EVENT_TYPES).toContain('rules_changed')
  })

  it('contains all engagement event types', () => {
    expect(BEHAVIORAL_EVENT_TYPES).toContain('league_opened')
    expect(BEHAVIORAL_EVENT_TYPES).toContain('live_scoring_opened')
    expect(BEHAVIORAL_EVENT_TYPES).toContain('recap_viewed')
  })

  it('contains all draft event types', () => {
    expect(BEHAVIORAL_EVENT_TYPES).toContain('draft_started')
    expect(BEHAVIORAL_EVENT_TYPES).toContain('draft_pick_made')
  })

  it('has no duplicates', () => {
    const unique = new Set(BEHAVIORAL_EVENT_TYPES)
    expect(unique.size).toBe(BEHAVIORAL_EVENT_TYPES.length)
  })
})

// ── Category coverage ─────────────────────────────────────────────────────────

describe('BEHAVIORAL_EVENT_CATEGORIES', () => {
  it('covers exactly 5 categories', () => {
    expect(Object.keys(BEHAVIORAL_EVENT_CATEGORIES)).toHaveLength(5)
  })

  it('every event type appears in exactly one category', () => {
    const allCategoryTypes: BehavioralEventType[] = []
    for (const types of Object.values(BEHAVIORAL_EVENT_CATEGORIES)) {
      allCategoryTypes.push(...types)
    }
    // Check no type is in two categories
    const unique = new Set(allCategoryTypes)
    expect(unique.size).toBe(allCategoryTypes.length)
  })

  it('the union of all category types equals BEHAVIORAL_EVENT_TYPES', () => {
    const allCategoryTypes = new Set<string>()
    for (const types of Object.values(BEHAVIORAL_EVENT_CATEGORIES)) {
      for (const t of types) allCategoryTypes.add(t)
    }
    const taxonomySet = new Set<string>(BEHAVIORAL_EVENT_TYPES)
    // Every type in taxonomy is in some category
    for (const t of taxonomySet) expect(allCategoryTypes.has(t)).toBe(true)
    // Every type in categories is in taxonomy
    for (const t of allCategoryTypes) expect(taxonomySet.has(t)).toBe(true)
  })

  it('roster category contains lineup events', () => {
    expect(BEHAVIORAL_EVENT_CATEGORIES.roster).toContain('lineup_viewed')
    expect(BEHAVIORAL_EVENT_CATEGORIES.roster).toContain('lineup_saved')
  })

  it('transaction category contains trade and waiver events', () => {
    const txn = BEHAVIORAL_EVENT_CATEGORIES.transaction
    expect(txn).toContain('trade_created')
    expect(txn).toContain('waiver_claim_created')
    expect(txn).toContain('waiver_claim_processed')
  })

  it('draft category contains draft events', () => {
    expect(BEHAVIORAL_EVENT_CATEGORIES.draft).toContain('draft_started')
    expect(BEHAVIORAL_EVENT_CATEGORIES.draft).toContain('draft_pick_made')
  })
})

// ── Label coverage ────────────────────────────────────────────────────────────

describe('BEHAVIORAL_EVENT_LABELS', () => {
  it('has a label for every event type', () => {
    for (const t of BEHAVIORAL_EVENT_TYPES) {
      expect(BEHAVIORAL_EVENT_LABELS[t]).toBeTruthy()
      expect(typeof BEHAVIORAL_EVENT_LABELS[t]).toBe('string')
    }
  })

  it('has no extra labels beyond the taxonomy', () => {
    const taxonomySet = new Set(BEHAVIORAL_EVENT_TYPES)
    for (const key of Object.keys(BEHAVIORAL_EVENT_LABELS)) {
      expect(taxonomySet.has(key as BehavioralEventType)).toBe(true)
    }
  })
})

// ── Source registry ───────────────────────────────────────────────────────────

describe('BEHAVIORAL_EVENT_SOURCES', () => {
  it('contains exactly 4 sources', () => {
    expect(BEHAVIORAL_EVENT_SOURCES).toHaveLength(4)
  })

  it('contains api, import, cron, system', () => {
    expect(BEHAVIORAL_EVENT_SOURCES).toContain('api')
    expect(BEHAVIORAL_EVENT_SOURCES).toContain('import')
    expect(BEHAVIORAL_EVENT_SOURCES).toContain('cron')
    expect(BEHAVIORAL_EVENT_SOURCES).toContain('system')
  })
})

// ── getEventCategory ──────────────────────────────────────────────────────────

describe('getEventCategory', () => {
  it('returns the correct category for each event type', () => {
    const expected: [BehavioralEventType, BehavioralEventCategory][] = [
      ['lineup_viewed', 'roster'],
      ['lineup_saved', 'roster'],
      ['trade_created', 'transaction'],
      ['trade_accepted', 'transaction'],
      ['trade_rejected', 'transaction'],
      ['waiver_claim_created', 'transaction'],
      ['waiver_claim_processed', 'transaction'],
      ['commissioner_action', 'commissioner'],
      ['rules_changed', 'commissioner'],
      ['league_opened', 'engagement'],
      ['live_scoring_opened', 'engagement'],
      ['recap_viewed', 'engagement'],
      ['draft_started', 'draft'],
      ['draft_pick_made', 'draft'],
    ]
    for (const [eventType, category] of expected) {
      expect(getEventCategory(eventType)).toBe(category)
    }
  })
})

// ── isBehavioralEventType / isBehavioralEventSource ──────────────────────────

describe('isBehavioralEventType', () => {
  it('returns true for all registered types', () => {
    for (const t of BEHAVIORAL_EVENT_TYPES) {
      expect(isBehavioralEventType(t)).toBe(true)
    }
  })

  it('returns false for unknown strings', () => {
    expect(isBehavioralEventType('unknown_event')).toBe(false)
    expect(isBehavioralEventType('')).toBe(false)
    expect(isBehavioralEventType(null)).toBe(false)
    expect(isBehavioralEventType(42)).toBe(false)
  })
})

describe('isBehavioralEventSource', () => {
  it('returns true for all registered sources', () => {
    for (const s of BEHAVIORAL_EVENT_SOURCES) {
      expect(isBehavioralEventSource(s)).toBe(true)
    }
  })

  it('returns false for unknown strings', () => {
    expect(isBehavioralEventSource('webhook')).toBe(false)
    expect(isBehavioralEventSource(null)).toBe(false)
  })
})

// ── isBehavioralEvent type guard ──────────────────────────────────────────────

function makeValidEvent(overrides: Partial<Record<string, unknown>> = {}): BehavioralEvent {
  return {
    eventId: 'evt_abc123',
    eventType: 'trade_created',
    occurredAt: '2026-06-30T12:00:00.000Z',
    recordedAt: '2026-06-30T12:00:01.000Z',
    leagueId: 'lg_001',
    managerId: 'usr_001',
    source: 'api',
    provenance: makeSystemProvenance(['RedraftTradeProposal']),
    completeness: 90,
    uncertainty: makeMinUncertainty(),
    metadata: {
      proposalId: 'prop_001',
      proposerRosterId: 'roster_a',
      receiverRosterId: 'roster_b',
      assetCount: 2,
      vetoMode: 'commissioner',
      expiresAt: '2026-07-02T12:00:00.000Z',
    },
    ...overrides,
  } as BehavioralEvent
}

describe('isBehavioralEvent', () => {
  it('accepts a valid trade_created event', () => {
    expect(isBehavioralEvent(makeValidEvent())).toBe(true)
  })

  it('accepts a system event with managerId = null', () => {
    const evt = makeValidEvent({ eventType: 'waiver_claim_processed', managerId: null, source: 'cron' })
    expect(isBehavioralEvent(evt)).toBe(true)
  })

  it('accepts an imported event from an external provider', () => {
    const evt = makeValidEvent({
      source: 'import',
      provenance: makeImportedProvenance('sleeper', 'slp_evt_999', '2026-06-30T12:00:00.000Z', ['WaiverClaim']),
    })
    expect(isBehavioralEvent(evt)).toBe(true)
  })

  it('accepts any registered event type', () => {
    for (const eventType of BEHAVIORAL_EVENT_TYPES) {
      const evt = makeValidEvent({ eventType })
      expect(isBehavioralEvent(evt)).toBe(true)
    }
  })

  it('rejects an event with an unknown eventType', () => {
    expect(isBehavioralEvent({ ...makeValidEvent(), eventType: 'custom_event' })).toBe(false)
  })

  it('rejects an event with an unknown source', () => {
    expect(isBehavioralEvent({ ...makeValidEvent(), source: 'webhook' })).toBe(false)
  })

  it('rejects when completeness is out of range', () => {
    expect(isBehavioralEvent({ ...makeValidEvent(), completeness: -1 })).toBe(false)
    expect(isBehavioralEvent({ ...makeValidEvent(), completeness: 101 })).toBe(false)
  })

  it('rejects when leagueId is missing', () => {
    const { leagueId: _, ...rest } = makeValidEvent()
    expect(isBehavioralEvent(rest)).toBe(false)
  })

  it('rejects null and primitives', () => {
    expect(isBehavioralEvent(null)).toBe(false)
    expect(isBehavioralEvent(undefined)).toBe(false)
    expect(isBehavioralEvent('string')).toBe(false)
    expect(isBehavioralEvent(42)).toBe(false)
  })
})

// ── clampCompleteness ─────────────────────────────────────────────────────────

describe('clampCompleteness', () => {
  it('passes through valid scores unchanged', () => {
    expect(clampCompleteness(0)).toBe(0)
    expect(clampCompleteness(50)).toBe(50)
    expect(clampCompleteness(100)).toBe(100)
  })

  it('clamps scores below 0 to 0', () => {
    expect(clampCompleteness(-10)).toBe(0)
    expect(clampCompleteness(-Infinity)).toBe(0)
  })

  it('clamps scores above 100 to 100', () => {
    expect(clampCompleteness(110)).toBe(100)
    expect(clampCompleteness(Infinity)).toBe(100)
  })

  it('rounds fractional scores', () => {
    expect(clampCompleteness(90.6)).toBe(91)
    expect(clampCompleteness(90.4)).toBe(90)
  })
})

// ── computeEventCompleteness ──────────────────────────────────────────────────

describe('computeEventCompleteness', () => {
  it('returns 100 for a fully-known event', () => {
    expect(computeEventCompleteness({
      hasManagerId: true,
      timestampConfidence: 'exact',
      hasProvider: true,
      missingMetadataFieldCount: 0,
    })).toBe(100)
  })

  it('deducts 20 for missing managerId', () => {
    expect(computeEventCompleteness({
      hasManagerId: false,
      timestampConfidence: 'exact',
      hasProvider: true,
      missingMetadataFieldCount: 0,
    })).toBe(80)
  })

  it('deducts 10 for approximate timestamp', () => {
    expect(computeEventCompleteness({
      hasManagerId: true,
      timestampConfidence: 'approximate',
      hasProvider: true,
      missingMetadataFieldCount: 0,
    })).toBe(90)
  })

  it('deducts 30 for unknown timestamp', () => {
    expect(computeEventCompleteness({
      hasManagerId: true,
      timestampConfidence: 'unknown',
      hasProvider: true,
      missingMetadataFieldCount: 0,
    })).toBe(70)
  })

  it('deducts 10 for missing provider metadata', () => {
    expect(computeEventCompleteness({
      hasManagerId: true,
      timestampConfidence: 'exact',
      hasProvider: false,
      missingMetadataFieldCount: 0,
    })).toBe(90)
  })

  it('deducts 10 per missing metadata field', () => {
    expect(computeEventCompleteness({
      hasManagerId: true,
      timestampConfidence: 'exact',
      hasProvider: true,
      missingMetadataFieldCount: 3,
    })).toBe(70)
  })

  it('clamps to 0 on compounding deductions', () => {
    expect(computeEventCompleteness({
      hasManagerId: false,
      timestampConfidence: 'unknown',
      hasProvider: false,
      missingMetadataFieldCount: 10,
    })).toBe(0)
  })
})

// ── Provenance helpers ────────────────────────────────────────────────────────

describe('makeSystemProvenance', () => {
  it('returns a provenance with null provider', () => {
    const p = makeSystemProvenance(['AfLeagueTrade'])
    expect(p.provider).toBeNull()
    expect(p.sourceId).toBeNull()
    expect(p.importedAt).toBeNull()
    expect(p.derivedFrom).toEqual(['AfLeagueTrade'])
  })
})

describe('makeImportedProvenance', () => {
  it('returns a provenance with the given provider and sourceId', () => {
    const p = makeImportedProvenance('sleeper', 'slp_001', '2026-06-30T00:00:00.000Z', ['WaiverClaim'])
    expect(p.provider).toBe('sleeper')
    expect(p.sourceId).toBe('slp_001')
    expect(p.importedAt).toBe('2026-06-30T00:00:00.000Z')
    expect(p.derivedFrom).toEqual(['WaiverClaim'])
  })
})

// ── Uncertainty helpers ───────────────────────────────────────────────────────

describe('makeMaxUncertainty', () => {
  it('returns unknown timestamp and actor confidence', () => {
    const u = makeMaxUncertainty()
    expect(u.timestampConfidence).toBe('unknown')
    expect(u.actorConfidence).toBe('unknown')
    expect(u.sources.length).toBeGreaterThan(0)
  })
})

describe('makeMinUncertainty', () => {
  it('returns exact timestamp and confirmed actor confidence', () => {
    const u = makeMinUncertainty()
    expect(u.timestampConfidence).toBe('exact')
    expect(u.actorConfidence).toBe('confirmed')
    expect(u.sources).toHaveLength(0)
  })
})

// ── TypeScript discriminated union (compile-time + runtime checks) ────────────

describe('BehavioralEvent discriminated union', () => {
  it('narrows metadata correctly for lineup_saved events', () => {
    const evt: BehavioralEvent = {
      eventId: 'evt_1',
      eventType: 'lineup_saved',
      occurredAt: '2026-06-30T00:00:00.000Z',
      recordedAt: '2026-06-30T00:00:00.000Z',
      leagueId: 'lg_1',
      managerId: 'usr_1',
      source: 'api',
      provenance: makeSystemProvenance(['AfRosterMoveHistory']),
      completeness: 100,
      uncertainty: makeMinUncertainty(),
      metadata: {
        week: 1,
        season: 2026,
        leagueType: 'redraft',
        slotChanges: 2,
        startedPlayerIds: ['p1', 'p2'],
        benchedPlayerIds: ['p3'],
      },
    }
    if (evt.eventType === 'lineup_saved') {
      expect(evt.metadata.slotChanges).toBe(2)
      expect(evt.metadata.startedPlayerIds).toEqual(['p1', 'p2'])
    }
  })

  it('narrows metadata correctly for draft_pick_made events', () => {
    const evt: BehavioralEventOf<'draft_pick_made'> = {
      eventId: 'evt_2',
      eventType: 'draft_pick_made',
      occurredAt: '2026-06-30T00:00:00.000Z',
      recordedAt: '2026-06-30T00:00:00.000Z',
      leagueId: 'lg_1',
      managerId: 'usr_1',
      source: 'api',
      provenance: makeSystemProvenance(['DraftPick']),
      completeness: 100,
      uncertainty: makeMinUncertainty(),
      metadata: {
        draftId: 'draft_001',
        pickNumber: 3,
        overallPick: 7,
        round: 1,
        playerId: 'player_a',
        playerName: 'Justin Jefferson',
        position: 'WR',
        team: 'MIN',
      },
    }
    expect(evt.metadata.playerName).toBe('Justin Jefferson')
    expect(evt.metadata.overallPick).toBe(7)
  })

  it('system events are valid (managerId null, source system)', () => {
    const evt: BehavioralEvent = {
      eventId: 'evt_3',
      eventType: 'waiver_claim_processed',
      occurredAt: '2026-06-30T03:00:00.000Z',
      recordedAt: '2026-06-30T03:00:00.000Z',
      leagueId: 'lg_1',
      managerId: null,
      source: 'cron',
      provenance: makeSystemProvenance(['WaiverClaim']),
      completeness: 80,
      uncertainty: { sources: ['managerId'], timestampConfidence: 'exact', actorConfidence: 'unknown' },
      metadata: {
        claimId: 'claim_001',
        outcome: 'awarded',
        denialReason: null,
        addPlayerId: 'p_a',
        dropPlayerId: 'p_b',
        bidAmount: 15,
        priority: null,
      },
    }
    expect(evt.managerId).toBeNull()
    expect(evt.source).toBe('cron')
    expect(isBehavioralEvent(evt)).toBe(true)
  })
})

// ── Barrel re-exports ─────────────────────────────────────────────────────────

describe('behavioral barrel exports', () => {
  it('re-exports all taxonomy constants', async () => {
    const barrel = await import('@/lib/decision-os/behavioral')
    expect(barrel.BEHAVIORAL_EVENT_TYPES).toBeDefined()
    expect(barrel.BEHAVIORAL_EVENT_SOURCES).toBeDefined()
    expect(barrel.BEHAVIORAL_EVENT_CATEGORIES).toBeDefined()
    expect(barrel.BEHAVIORAL_EVENT_LABELS).toBeDefined()
  })

  it('re-exports runtime helpers', async () => {
    const barrel = await import('@/lib/decision-os/behavioral')
    expect(typeof barrel.isBehavioralEvent).toBe('function')
    expect(typeof barrel.clampCompleteness).toBe('function')
    expect(typeof barrel.getEventCategory).toBe('function')
    expect(typeof barrel.makeSystemProvenance).toBe('function')
    expect(typeof barrel.makeImportedProvenance).toBe('function')
    expect(typeof barrel.makeMaxUncertainty).toBe('function')
    expect(typeof barrel.makeMinUncertainty).toBe('function')
  })
})
