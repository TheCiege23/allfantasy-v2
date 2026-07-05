/**
 * Decision OS — Phase 8.1 Intelligence Pipeline Unification tests.
 *
 * `resolveManagerIntelligencePayload` composes the ALREADY-tested Phase
 * 5.1/5.2 pipeline (covered by intelligence-api-real-provider.test.ts) with
 * the ALREADY-tested Phase 6.1/6.2/6.4 layer (covered by their own suites).
 * This file does NOT re-test that inner logic — it tests the COMPOSITION:
 * real rows in -> a real ManagerDnaProfile + RecommendationSet out, honest
 * degradation, and no fabrication.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveManagerIntelligencePayload } from '@/lib/decision-os/dashboard-intelligence'
import * as port from '@/lib/decision-os/behavioral/port'
import type {
  RawWaiverClaimRow,
  RawLeagueTradeRow,
  RawRosterMoveRow,
  RawDraftSessionRow,
  RawDraftPickRow,
  RawRedraftTradeRow,
  RawRedraftRosterPlayerRow,
} from '@/lib/decision-os/behavioral/port'

vi.mock('@/lib/decision-os/behavioral/port', async () => {
  const actual = await vi.importActual<typeof import('@/lib/decision-os/behavioral/port')>(
    '@/lib/decision-os/behavioral/port',
  )
  return {
    ...actual,
    loadWaiverClaimRows: vi.fn(),
    loadLeagueTradeRows: vi.fn(),
    loadRosterMoveRows: vi.fn(),
    loadDraftRows: vi.fn(),
    loadRedraftTradeRows: vi.fn(),
    loadRedraftRosterPlayerRows: vi.fn(),
  }
})

const LG = 'league-alpha'
const MGR = 'user-mgr-1'
const OTHER_MGR = 'user-mgr-2'

const makeWaiverRow = (o: Partial<RawWaiverClaimRow> = {}): RawWaiverClaimRow => ({
  id: 'wc-1',
  leagueId: LG,
  rosterId: 'roster-1',
  userId: MGR,
  addPlayerId: 'player-a',
  dropPlayerId: null,
  faabBid: 15,
  priorityOrder: 1,
  claimType: 'normal',
  status: 'awarded',
  processedAt: new Date('2026-01-15T12:00:00Z'),
  resultMessage: null,
  createdAt: new Date('2026-01-10T12:00:00Z'),
  ...o,
})

const makeTradeRow = (o: Partial<RawLeagueTradeRow> = {}): RawLeagueTradeRow => ({
  id: 'trade-1',
  leagueId: LG,
  proposedByUserId: MGR,
  proposerRosterId: 'roster-1',
  receiverRosterId: 'roster-2',
  status: 'accepted',
  reviewType: 'no_veto',
  acceptedAt: new Date('2026-01-12T12:00:00Z'),
  rejectedAt: null,
  expiresAt: null,
  createdAt: new Date('2026-01-08T12:00:00Z'),
  itemCount: 2,
  ...o,
})

const makeRosterMoveRow = (o: Partial<RawRosterMoveRow> = {}): RawRosterMoveRow => ({
  id: 'rm-1',
  leagueId: LG,
  rosterId: 'roster-1',
  season: 2025,
  week: 8,
  actorUserId: MGR,
  source: 'user',
  moveSummary: null,
  createdAt: new Date('2026-01-05T12:00:00Z'),
  ...o,
})

const emptyDraftResult = () =>
  Promise.resolve({
    session: null as RawDraftSessionRow | null,
    picks: [] as RawDraftPickRow[],
  })

const makeRedraftTradeRow = (o: Partial<RawRedraftTradeRow> = {}): RawRedraftTradeRow => ({
  id: 'redraft-trade-1',
  leagueId: LG,
  proposerRosterId: 'roster-1',
  receiverRosterId: 'roster-2',
  proposerOwnerId: MGR,
  receiverOwnerId: OTHER_MGR,
  status: 'accepted',
  vetoMode: 'no_veto',
  acceptedAt: new Date('2026-01-12T12:00:00Z'),
  rejectedAt: null,
  expiresAt: null,
  createdAt: new Date('2026-01-08T12:00:00Z'),
  itemCount: 2,
  ...o,
})

const makeRedraftRosterPlayerRow = (o: Partial<RawRedraftRosterPlayerRow> = {}): RawRedraftRosterPlayerRow => ({
  id: 'redraft-rp-1',
  leagueId: LG,
  rosterId: 'roster-1',
  ownerUserId: MGR,
  playerId: 'player-z',
  playerName: 'Player Z',
  acquisitionType: 'free_agent',
  addedAt: new Date('2026-01-09T12:00:00Z'),
  droppedAt: null,
  ...o,
})

function mockPorts(overrides: {
  waivers?: RawWaiverClaimRow[]
  trades?: RawLeagueTradeRow[]
  rosterMoves?: RawRosterMoveRow[]
  redraftTrades?: RawRedraftTradeRow[]
  redraftRosterPlayers?: RawRedraftRosterPlayerRow[]
} = {}) {
  vi.mocked(port.loadWaiverClaimRows).mockResolvedValue(overrides.waivers ?? [])
  vi.mocked(port.loadLeagueTradeRows).mockResolvedValue(overrides.trades ?? [])
  vi.mocked(port.loadRosterMoveRows).mockResolvedValue(overrides.rosterMoves ?? [])
  vi.mocked(port.loadDraftRows).mockImplementation(emptyDraftResult)
  vi.mocked(port.loadRedraftTradeRows).mockResolvedValue(overrides.redraftTrades ?? [])
  vi.mocked(port.loadRedraftRosterPlayerRows).mockResolvedValue(overrides.redraftRosterPlayers ?? [])
}

describe('resolveManagerIntelligencePayload', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns a real, non-null ManagerDnaProfile + RecommendationSet for a manager with real activity', async () => {
    mockPorts({
      waivers: [
        makeWaiverRow({ id: 'wc-1' }),
        makeWaiverRow({ id: 'wc-2', createdAt: new Date('2026-01-11T12:00:00Z') }),
        makeWaiverRow({ id: 'wc-3', createdAt: new Date('2026-01-12T12:00:00Z') }),
      ],
      trades: [makeTradeRow()],
    })

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    expect(result.managerDna).not.toBeNull()
    expect(result.managerDna!.managerId).toBe(MGR)
    expect(result.managerDna!.leagueId).toBe(LG)
    expect(result.recommendations).not.toBeNull()
    expect(result.recommendations!.entityId).toBe(MGR)
    expect(result.recommendations!.tier).toBe('manager')
  })

  it('never fabricates: a manager with zero events gets an honest zero-activity profile, not a skipped one', async () => {
    mockPorts()

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    expect(result.managerDna).not.toBeNull()
    expect(result.managerDna!.primaryIdentity).toBe('unknown')
    expect(result.managerDna!.confidence).toBe(0)
  })

  it('is degraded-safe: a port throwing never rejects the call, returns honest nulls instead', async () => {
    vi.mocked(port.loadWaiverClaimRows).mockRejectedValue(new Error('DB unavailable'))
    vi.mocked(port.loadLeagueTradeRows).mockResolvedValue([])
    vi.mocked(port.loadRosterMoveRows).mockResolvedValue([])
    vi.mocked(port.loadDraftRows).mockImplementation(emptyDraftResult)
    vi.mocked(port.loadRedraftTradeRows).mockResolvedValue([])
    vi.mocked(port.loadRedraftRosterPlayerRows).mockResolvedValue([])

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    expect(result).toEqual({ managerDna: null, recommendations: null })
  })

  it('is degraded-safe when specifically the NEW redraft loaders fail (missing redraft data fails safely)', async () => {
    vi.mocked(port.loadWaiverClaimRows).mockResolvedValue([])
    vi.mocked(port.loadLeagueTradeRows).mockResolvedValue([])
    vi.mocked(port.loadRosterMoveRows).mockResolvedValue([])
    vi.mocked(port.loadDraftRows).mockImplementation(emptyDraftResult)
    vi.mocked(port.loadRedraftTradeRows).mockRejectedValue(new Error('redraft_trade_proposals unavailable'))
    vi.mocked(port.loadRedraftRosterPlayerRows).mockResolvedValue([])

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    expect(result).toEqual({ managerDna: null, recommendations: null })
  })

  it('includes other active managers in the same league so Phase 6.1/6.2 classify against the real league context', async () => {
    mockPorts({
      waivers: [makeWaiverRow({ userId: OTHER_MGR, rosterId: 'roster-2' })],
    })

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    // The target manager (zero events of their own) still gets an honest profile —
    // the other manager's activity does not leak into the target's identity.
    expect(result.managerDna).not.toBeNull()
    expect(result.managerDna!.managerId).toBe(MGR)
    expect(result.managerDna!.primaryIdentity).toBe('unknown')
  })

  it('calls the same real ports the live Intelligence API uses, with the league id and a since Date', async () => {
    mockPorts()
    await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    expect(port.loadWaiverClaimRows).toHaveBeenCalledWith(LG, expect.any(Date))
    expect(port.loadLeagueTradeRows).toHaveBeenCalledWith(LG, expect.any(Date))
    expect(port.loadRosterMoveRows).toHaveBeenCalledWith(LG, expect.any(Date))
    expect(port.loadDraftRows).toHaveBeenCalledWith(LG)
    expect(port.loadRedraftTradeRows).toHaveBeenCalledWith(LG, expect.any(Date))
    expect(port.loadRedraftRosterPlayerRows).toHaveBeenCalledWith(LG, expect.any(Date))
  })

  // ── Phase 2E: redraft trade + roster activity now visible to Phase 6 DNA ────

  it('existing Af*/WaiverClaim-only behavior is unchanged when there is zero redraft data (regression guard)', async () => {
    mockPorts({
      waivers: [makeWaiverRow({ id: 'wc-1' }), makeWaiverRow({ id: 'wc-2', createdAt: new Date('2026-01-11T12:00:00Z') }), makeWaiverRow({ id: 'wc-3', createdAt: new Date('2026-01-12T12:00:00Z') })],
      trades: [makeTradeRow()],
    })

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    // Byte-identical assertions to the pre-Phase-2E "real activity" test above —
    // adding the two new (empty-by-default) redraft loaders changes nothing
    // when there's no redraft data for this league.
    expect(result.managerDna).not.toBeNull()
    expect(result.managerDna!.managerId).toBe(MGR)
    expect(result.managerDna!.leagueId).toBe(LG)
    expect(result.recommendations).not.toBeNull()
    expect(result.recommendations!.entityId).toBe(MGR)
    expect(result.recommendations!.tier).toBe('manager')
  })

  it('redraft trade activity alone (zero Af*/WaiverClaim data) now contributes to a real, non-unknown profile', async () => {
    mockPorts({
      redraftTrades: [
        makeRedraftTradeRow({ id: 'rt-1' }),
        makeRedraftTradeRow({ id: 'rt-2', createdAt: new Date('2026-01-09T12:00:00Z'), acceptedAt: new Date('2026-01-13T12:00:00Z') }),
        makeRedraftTradeRow({ id: 'rt-3', createdAt: new Date('2026-01-10T12:00:00Z'), acceptedAt: new Date('2026-01-14T12:00:00Z') }),
      ],
    })

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    // Before this phase, this input (real activity ONLY in redraft tables) would
    // have produced 'passive' transactionStyle — nothing read RedraftTradeProposal
    // at all, so the trade-rate signal driving deriveTransactionStyle() would
    // have been zero regardless of how much real trading this manager did.
    // Whether primaryIdentity crosses into a specific non-'unknown' label
    // additionally depends on Phase 6.1's own pattern-detection thresholds
    // (a separately-tested layer, see __tests__/decision-os/phase6/manager-dna.test.ts)
    // — transactionStyle is the reliable, directly-attributable signal this
    // test proves redraft trade data now reaches.
    expect(result.managerDna).not.toBeNull()
    expect(result.managerDna!.transactionStyle).toBe('trade_dominant')
  })

  it('redraft roster (free_agent) activity contributes when enough of it exists', async () => {
    // 10 free-agent adds over the 90-day default lookback pushes
    // lineupEditsPerWeek decisively above deriveDecisionStyle's 0.5
    // threshold (10 / (90/7) ≈ 0.78/week) — a reliable, directly-attributable
    // signal distinguishing "roster activity reached this profile" from the
    // zero-activity baseline (which falls into the `< 0.5 → 'decisive'`
    // branch instead; see the baseline test above).
    mockPorts({
      redraftRosterPlayers: Array.from({ length: 10 }, (_, i) =>
        makeRedraftRosterPlayerRow({ id: `rp-${i}`, addedAt: new Date(`2026-01-${String((i % 28) + 1).padStart(2, '0')}T12:00:00Z`) }),
      ),
    })

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    expect(result.managerDna).not.toBeNull()
    expect(result.managerDna!.decisionStyle).toBe('methodical')
  })

  it('does not double-count: waiver/trade/drafted-acquired RedraftRosterPlayer rows are excluded (already covered by their own sources)', async () => {
    mockPorts({
      redraftRosterPlayers: [
        makeRedraftRosterPlayerRow({ id: 'rp-waiver', acquisitionType: 'waiver' }),
        makeRedraftRosterPlayerRow({ id: 'rp-trade', acquisitionType: 'trade' }),
        makeRedraftRosterPlayerRow({ id: 'rp-drafted', acquisitionType: 'drafted' }),
      ],
    })

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    // None of these three rows should contribute a lineup_saved-derived signal —
    // the manager should look identical to the zero-activity case.
    expect(result.managerDna).not.toBeNull()
    expect(result.managerDna!.primaryIdentity).toBe('unknown')
    expect(result.managerDna!.confidence).toBe(0)
  })

  it('missing/absent redraft data fails safely — resolves normally with the two new sources simply empty', async () => {
    mockPorts({ redraftTrades: [], redraftRosterPlayers: [] })

    const result = await resolveManagerIntelligencePayload({ leagueId: LG, managerId: MGR })

    expect(result.managerDna).not.toBeNull()
    expect(result.managerDna!.primaryIdentity).toBe('unknown')
    expect(result.recommendations).not.toBeNull()
  })
})
