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

function mockPorts(overrides: {
  waivers?: RawWaiverClaimRow[]
  trades?: RawLeagueTradeRow[]
  rosterMoves?: RawRosterMoveRow[]
} = {}) {
  vi.mocked(port.loadWaiverClaimRows).mockResolvedValue(overrides.waivers ?? [])
  vi.mocked(port.loadLeagueTradeRows).mockResolvedValue(overrides.trades ?? [])
  vi.mocked(port.loadRosterMoveRows).mockResolvedValue(overrides.rosterMoves ?? [])
  vi.mocked(port.loadDraftRows).mockImplementation(emptyDraftResult)
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
  })
})
