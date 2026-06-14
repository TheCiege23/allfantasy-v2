import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KeeperWarRoomContext } from '@/lib/keeper-war-room/types'

const mocks = vi.hoisted(() => ({ buildContext: vi.fn() }))

vi.mock('@/lib/keeper-war-room/keeperWarRoomContext', () => ({
  buildKeeperWarRoomContext: mocks.buildContext,
}))

import { buildKeeperContextForChimmy } from '@/lib/keeper-war-room/keeperChimmyGrounding'

function makeContext(): KeeperWarRoomContext {
  const p = (id: string, position: string, adp: number, costRound: number) => ({
    playerId: id,
    playerName: `Player ${id}`,
    position,
    team: 'TM',
    slotType: position,
    isStarterSlot: true,
    isKept: false,
    injuryStatus: null,
    adp,
    adpRound: Math.max(1, Math.ceil(adp / 12)),
    isEligible: true,
    ineligibleReason: null,
    yearsKept: 0,
    keeperCostRound: costRound,
    keeperCostAuction: null,
    keeperCostLabel: `Round ${costRound}`,
    surplusRounds: costRound - Math.max(1, Math.ceil(adp / 12)),
    surplusAuction: null,
    weekProjection: null,
    seasonAvgActual: null,
  })
  return {
    leagueId: 'lg1',
    leagueType: 'keeper',
    sport: 'NFL',
    season: 2026,
    teamCount: 12,
    currentWeek: 0,
    totalWeeks: 17,
    seasonStatus: 'pre_draft',
    seasonActive: false,
    scoring: { sport: 'NFL', scoringPreset: 'PPR', pointsPerReception: 1, superflex: false, tePremium: false },
    roster: { totalStarterSlots: 7, benchSlots: 6, irSlots: 1, requiredByPosition: { QB: 1, RB: 3, WR: 3, TE: 1 } },
    keeper: {
      maxKeepers: 3,
      maxYears: 3,
      costSystem: 'round_based',
      roundPenalty: 1,
      auctionPctIncrease: 0.2,
      waiverAllowed: true,
      selectionDeadline: null,
      keeperPhaseActive: true,
      draftRounds: 13,
    },
    userRosterId: 'r1',
    isCommissioner: false,
    teams: [
      {
        rosterId: 'r1',
        ownerId: 'u1',
        ownerName: 'Me',
        teamName: 'My Team',
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        playoffSeed: null,
        isEliminated: false,
        isUserTeam: true,
        players: [p('steal', 'WR', 20, 8), p('good', 'RB', 32, 5)],
      },
    ],
    freeAgents: [],
    availability: {
      scoringRules: 'available',
      rosterRules: 'available',
      standings: 'available',
      schedule: 'missing',
      rosters: 'available',
      playerValues: 'available',
      keeperRules: 'available',
      keeperCosts: 'available',
      eligibility: 'available',
      projections: 'missing',
      injuries: 'available',
      news: 'available',
      freeAgentPool: 'available',
    },
    freshness: { generatedAt: 'now', statsAsOf: null, projectionsAsOf: null, injuriesAsOf: null },
    missingDataFlags: [],
    featureAvailability: {
      keeperRecommendations: true,
      cutList: true,
      rosterNeeds: true,
      draftPlan: true,
      tradeAnalyze: true,
      tradeFind: true,
      waivers: false,
      lineup: false,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.buildContext.mockResolvedValue({ ok: true, context: makeContext() })
})

describe('buildKeeperContextForChimmy', () => {
  it('returns null when no leagueId/userId', async () => {
    expect(await buildKeeperContextForChimmy('', 'u1')).toBeNull()
    expect(await buildKeeperContextForChimmy('lg1', '')).toBeNull()
  })

  it('returns null when the context build is not ok (non-keeper / forbidden)', async () => {
    mocks.buildContext.mockResolvedValue({ ok: false, status: 404, error: 'Not a keeper league' })
    expect(await buildKeeperContextForChimmy('lg1', 'u1')).toBeNull()
  })

  it('grounds a keeper league with keeper-only rules, costs, and recommendations', async () => {
    const out = await buildKeeperContextForChimmy('lg1', 'u1')
    expect(out).toBeTruthy()
    const text = out as string
    expect(text).toMatch(/KEEPER AF WAR ROOM CONTEXT/)
    expect(text.toLowerCase()).toMatch(/surplus/)
    expect(text.toLowerCase()).toMatch(/do not use dynasty future-pick/)
    expect(text).toMatch(/KEEPER RECOMMENDATIONS/)
    expect(text).toMatch(/maxKeepers=3/)
  })
})
