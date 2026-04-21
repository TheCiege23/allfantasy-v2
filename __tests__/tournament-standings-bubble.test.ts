/**
 * Standings, bubble engine, advancement rules, and elimination engine tests.
 * All tests are pure-unit (no DB) using in-memory data fixtures.
 *
 * Covers:
 *  - compareByTiebreakers: wins, pointsFor, pointsAgainst, H2H, custom order
 *  - resolveHeadToHead: direct matchup record
 *  - getAdvancementSlotsPerConference + getQualificationCutSlotsPerConference
 *  - getBubbleSlotsPerConference
 *  - markEliminated / markRoundCompleted / archiveRound / getRoundStatus
 *  - advancementStatus derivation (advanced / bubble / out)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoist mocks for DB-touching imports ──────────────────────────────────────
const {
  prismaMock,
  logAuditMock,
} = vi.hoisted(() => ({
  prismaMock: {
    legacyTournamentParticipant: {
      updateMany: vi.fn(),
    },
    legacyTournamentRound: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
  logAuditMock: vi.fn(),
}))

// ─── Pure-unit imports ────────────────────────────────────────────────────────
import {
  compareByTiebreakers,
  resolveHeadToHead,
  getAdvancementSlotsPerConference,
  getBubbleSlotsPerConference,
  DEFAULT_TIEBREAKER_ORDER,
  type StandingsRowForSort,
} from '@/lib/tournament-mode/advancement-rules'
import {
  getQualificationAdvancementTotal,
  getQualificationCutSlotsPerConference,
} from '@/lib/tournament-mode/tournament-sport-cutoffs'

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/tournament-mode/TournamentAuditService', () => ({
  logTournamentAudit: logAuditMock,
}))

import {
  markEliminated,
  markRoundCompleted,
  archiveRound,
  getRoundStatus,
} from '@/lib/tournament-mode/TournamentEliminationEngine'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function row(
  overrides: Partial<StandingsRowForSort> & { rosterId?: string } = {}
): StandingsRowForSort & { rosterId?: string } {
  return {
    wins: 5,
    losses: 4,
    ties: 0,
    pointsFor: 1200,
    pointsAgainst: 1100,
    rosterId: 'r-default',
    ...overrides,
  }
}

// ─── compareByTiebreakers ─────────────────────────────────────────────────────
describe('compareByTiebreakers', () => {
  it('ranks higher wins first', () => {
    const a = row({ wins: 8 })
    const b = row({ wins: 5 })
    expect(compareByTiebreakers(a, b)).toBeLessThan(0)
  })

  it('ties on wins → breaks by pointsFor descending', () => {
    const a = row({ wins: 5, pointsFor: 1500 })
    const b = row({ wins: 5, pointsFor: 1200 })
    expect(compareByTiebreakers(a, b)).toBeLessThan(0)
  })

  it('returns 0 for identical rows', () => {
    const a = row()
    const b = row()
    expect(compareByTiebreakers(a, b)).toBe(0)
  })

  it('uses custom tiebreaker order (pointsAgainst before pointsFor)', () => {
    const a = row({ wins: 5, pointsFor: 1200, pointsAgainst: 900 })
    const b = row({ wins: 5, pointsFor: 1500, pointsAgainst: 1100 })
    // With points_against ascending, a (lower PA) wins
    const result = compareByTiebreakers(a, b, ['wins', 'points_against', 'points_for'])
    expect(result).toBeLessThan(0)
  })

  it('resolves H2H when head_to_head is in order', () => {
    const a = row({ rosterId: 'r-a', wins: 5 })
    const b = row({ rosterId: 'r-b', wins: 5, pointsFor: 1300 })
    // a beat b in H2H
    const matchups = [{ teamA: 'r-a', teamB: 'r-b', winnerTeamId: 'r-a' }]
    const result = compareByTiebreakers(a, b, ['wins', 'head_to_head'], matchups)
    expect(result).toBeLessThan(0) // a wins via H2H
  })

  it('falls through H2H to next tiebreaker when H2H is tied', () => {
    const a = row({ rosterId: 'r-a', wins: 5, pointsFor: 1500 })
    const b = row({ rosterId: 'r-b', wins: 5, pointsFor: 1200 })
    // no H2H matchups
    const result = compareByTiebreakers(a, b, ['wins', 'head_to_head', 'points_for'], [])
    expect(result).toBeLessThan(0) // a wins by pointsFor
  })

  it('is transitive: a > b > c → a > c', () => {
    const a = row({ wins: 8 })
    const b = row({ wins: 5 })
    const c = row({ wins: 2 })
    expect(compareByTiebreakers(a, b)).toBeLessThan(0)
    expect(compareByTiebreakers(b, c)).toBeLessThan(0)
    expect(compareByTiebreakers(a, c)).toBeLessThan(0)
  })

  it('DEFAULT_TIEBREAKER_ORDER is [wins, points_for]', () => {
    expect(DEFAULT_TIEBREAKER_ORDER).toEqual(['wins', 'points_for'])
  })
})

// ─── resolveHeadToHead ────────────────────────────────────────────────────────
describe('resolveHeadToHead', () => {
  const matchups = [
    { teamA: 'r-a', teamB: 'r-b', winnerTeamId: 'r-a' },
    { teamA: 'r-b', teamB: 'r-a', winnerTeamId: 'r-b' },
    { teamA: 'r-a', teamB: 'r-b', winnerTeamId: 'r-a' },
  ]

  it('returns negative when a has more H2H wins', () => {
    // a has 2 wins, b has 1 win → result is b.wins - a.wins = 1 - 2 = -1
    expect(resolveHeadToHead('r-a', 'r-b', matchups)).toBeLessThan(0)
  })

  it('returns positive when b has more H2H wins', () => {
    expect(resolveHeadToHead('r-b', 'r-a', matchups)).toBeGreaterThan(0)
  })

  it('returns 0 when neither has played', () => {
    expect(resolveHeadToHead('r-x', 'r-y', matchups)).toBe(0)
  })

  it('returns 0 when H2H is perfectly split', () => {
    const tied = [
      { teamA: 'r-a', teamB: 'r-b', winnerTeamId: 'r-a' },
      { teamA: 'r-a', teamB: 'r-b', winnerTeamId: 'r-b' },
    ]
    expect(resolveHeadToHead('r-a', 'r-b', tied)).toBe(0)
  })

  it('ignores matchups not involving the two rosters', () => {
    const withOthers = [
      ...matchups,
      { teamA: 'r-c', teamB: 'r-d', winnerTeamId: 'r-c' },
    ]
    expect(resolveHeadToHead('r-a', 'r-b', withOthers)).toBeLessThan(0)
  })
})

// ─── Advancement slots ────────────────────────────────────────────────────────
describe('getQualificationAdvancementTotal', () => {
  it('NFL 72-pool: 60 advance', () => {
    expect(getQualificationAdvancementTotal('NFL', 72)).toBe(60)
  })

  it('NBA 72-pool: 60 advance (same ratio)', () => {
    expect(getQualificationAdvancementTotal('NBA', 72)).toBe(60)
  })

  it('144-pool: floor(144*5/6) = 120', () => {
    expect(getQualificationAdvancementTotal('NFL', 144)).toBe(120)
  })

  it('216-pool: floor(216*5/6) = 180', () => {
    expect(getQualificationAdvancementTotal('NFL', 216)).toBe(180)
  })

  it('32-pool: at least 12 advance (floor min)', () => {
    expect(getQualificationAdvancementTotal('NFL', 32)).toBeGreaterThanOrEqual(12)
  })
})

describe('getQualificationCutSlotsPerConference', () => {
  it('72 NFL / 2 conferences → 30 per conf (60 total / 2)', () => {
    expect(getQualificationCutSlotsPerConference('NFL', 72, 60, 2)).toBe(30)
  })

  it('144 / 2 conferences → 60 per conf', () => {
    expect(getQualificationCutSlotsPerConference('NFL', 144, 120, 2)).toBe(60)
  })

  it('falls back to computed total when qualificationAdvancementTotal is undefined', () => {
    const slots = getQualificationCutSlotsPerConference('NFL', 72, undefined, 2)
    expect(slots).toBe(30)
  })

  it('single conference returns full advancement total', () => {
    const slots = getQualificationCutSlotsPerConference('NFL', 72, 60, 1)
    expect(slots).toBe(60)
  })
})

describe('getAdvancementSlotsPerConference (deprecated fallback)', () => {
  it('72-pool → 30', () => expect(getAdvancementSlotsPerConference(72)).toBe(30))
  it('144-pool → 60', () => expect(getAdvancementSlotsPerConference(144)).toBe(60))
})

describe('getBubbleSlotsPerConference', () => {
  it('returns a positive integer', () => {
    const slots = getBubbleSlotsPerConference(72, 2)
    expect(Number.isInteger(slots)).toBe(true)
    expect(slots).toBeGreaterThanOrEqual(1)
  })

  it('larger pool = more bubble slots (proportional)', () => {
    const small = getBubbleSlotsPerConference(72, 2)
    const large = getBubbleSlotsPerConference(144, 2)
    expect(large).toBeGreaterThanOrEqual(small)
  })
})

// ─── Elimination engine ───────────────────────────────────────────────────────
describe('markEliminated', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates participants status to eliminated', async () => {
    prismaMock.legacyTournamentParticipant.updateMany.mockResolvedValue({ count: 3 })
    await markEliminated('t-1', 0, ['r-1', 'r-2', 'r-3'])
    expect(prismaMock.legacyTournamentParticipant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tournamentId: 't-1' }),
        data: expect.objectContaining({ status: 'eliminated', eliminatedAtRoundIndex: 0 }),
      })
    )
  })

  it('sets eliminatedAtRoundIndex to the provided round', async () => {
    prismaMock.legacyTournamentParticipant.updateMany.mockResolvedValue({ count: 1 })
    await markEliminated('t-1', 2, ['r-1'])
    const call = prismaMock.legacyTournamentParticipant.updateMany.mock.calls[0]
    expect(call[0].data.eliminatedAtRoundIndex).toBe(2)
  })

  it('clears currentLeagueId and currentRosterId', async () => {
    prismaMock.legacyTournamentParticipant.updateMany.mockResolvedValue({ count: 1 })
    await markEliminated('t-1', 0, ['r-1'])
    const call = prismaMock.legacyTournamentParticipant.updateMany.mock.calls[0]
    expect(call[0].data.currentLeagueId).toBeNull()
    expect(call[0].data.currentRosterId).toBeNull()
  })

  it('no-ops when rosterIds is empty', async () => {
    await markEliminated('t-1', 0, [])
    expect(prismaMock.legacyTournamentParticipant.updateMany).not.toHaveBeenCalled()
  })
})

describe('markRoundCompleted', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets round status to completed', async () => {
    prismaMock.legacyTournamentRound.updateMany.mockResolvedValue({ count: 1 })
    await markRoundCompleted('t-1', 1)
    expect(prismaMock.legacyTournamentRound.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId: 't-1', roundIndex: 1 },
        data: { status: 'completed' },
      })
    )
  })
})

describe('archiveRound', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets round status to archived', async () => {
    prismaMock.legacyTournamentRound.updateMany.mockResolvedValue({ count: 1 })
    const result = await archiveRound('t-1', 0)
    expect(result.archived).toBe(true)
    expect(prismaMock.legacyTournamentRound.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'archived' } })
    )
  })

  it('returns archived=false if no rounds matched', async () => {
    prismaMock.legacyTournamentRound.updateMany.mockResolvedValue({ count: 0 })
    const result = await archiveRound('t-1', 99)
    expect(result.archived).toBe(false)
  })
})

describe('getRoundStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns round status string', async () => {
    prismaMock.legacyTournamentRound.findUnique.mockResolvedValue({ status: 'active' })
    const status = await getRoundStatus('t-1', 0)
    expect(status).toBe('active')
  })

  it('returns null when round does not exist', async () => {
    prismaMock.legacyTournamentRound.findUnique.mockResolvedValue(null)
    const status = await getRoundStatus('t-1', 99)
    expect(status).toBeNull()
  })
})

// ─── Advancement status derivation (integration logic test) ──────────────────
describe('advancement status derivation (sort + cut logic)', () => {
  function buildLeagueStandings(rows: Array<{ rosterId: string; wins: number; pointsFor: number }>) {
    return rows.map((r, i) => ({
      ...row({ rosterId: r.rosterId, wins: r.wins, pointsFor: r.pointsFor }),
    }))
  }

  it('top N by compareByTiebreakers should match sorted ascending result', () => {
    const standings = buildLeagueStandings([
      { rosterId: 'r-1', wins: 8, pointsFor: 1500 },
      { rosterId: 'r-2', wins: 6, pointsFor: 1300 },
      { rosterId: 'r-3', wins: 6, pointsFor: 1400 },
      { rosterId: 'r-4', wins: 4, pointsFor: 1200 },
    ])
    const sorted = [...standings].sort(compareByTiebreakers)
    expect(sorted[0].rosterId).toBe('r-1') // 8 wins
    expect(sorted[1].rosterId).toBe('r-3') // 6W, 1400 PF
    expect(sorted[2].rosterId).toBe('r-2') // 6W, 1300 PF
    expect(sorted[3].rosterId).toBe('r-4') // 4W
  })

  it('advancing top 6 from a 12-team league leaves 6 eliminated', () => {
    const standings = Array.from({ length: 12 }, (_, i) => ({
      ...row({
        rosterId: `r-${i + 1}`,
        wins: 12 - i,
        pointsFor: (12 - i) * 100,
      }),
    }))
    const sorted = [...standings].sort(compareByTiebreakers)
    const advanced = sorted.slice(0, 6).map((r) => r.rosterId)
    const eliminated = sorted.slice(6).map((r) => r.rosterId)
    expect(advanced).toHaveLength(6)
    expect(eliminated).toHaveLength(6)
    // Top team should be r-1 (most wins)
    expect(advanced[0]).toBe('r-1')
    // Bottom team should be r-12 (fewest wins)
    expect(eliminated[5]).toBe('r-12')
  })
})
