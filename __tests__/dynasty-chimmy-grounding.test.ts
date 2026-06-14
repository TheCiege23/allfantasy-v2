import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DynastyWarRoomContext } from '@/lib/dynasty-war-room/types'

const mocks = vi.hoisted(() => ({ buildContext: vi.fn() }))

vi.mock('@/lib/dynasty-war-room/dynastyWarRoomContext', () => ({
  buildDynastyWarRoomContext: mocks.buildContext,
}))

import { buildDynastyWarRoomContextForChimmy } from '@/lib/dynasty-war-room/dynastyChimmyGrounding'

function makeContext(): DynastyWarRoomContext {
  const player = (id: string, position: string, slotType: string, age: number, adp: number) => ({
    playerId: id,
    playerName: `Player ${id}`,
    position,
    team: 'TM',
    slotType,
    isStarterSlot: slotType === 'starter',
    age,
    dynastyValue: Math.round((260 - adp) / 10),
    adp,
    injuryStatus: null,
    weekProjection: null,
    hasNoValueSignal: false,
  })
  return {
    leagueId: 'lg1',
    leagueType: 'dynasty',
    sport: 'NFL',
    season: 2026,
    scoring: { sport: 'NFL', scoringPreset: 'PPR', superflex: true, tePremium: false },
    roster: { totalStarterSlots: 3, benchSlots: 6, taxiSlots: 4, irSlots: 2, requiredByPosition: { QB: 2, WR: 1 } },
    userRosterId: 'r1',
    isCommissioner: false,
    teams: [
      {
        rosterId: 'r1',
        ownerId: 'u1',
        ownerName: 'Me',
        teamName: 'My Team',
        wins: 8,
        losses: 2,
        ties: 0,
        pointsFor: 1400,
        playoffSeed: 2,
        isUserTeam: true,
        players: [player('qb1', 'QB', 'starter', 26, 5), player('wr1', 'WR', 'starter', 24, 8)],
        picks: [
          { id: 'pk1', season: 2027, round: 1, originalRosterId: 'r1', currentOwnerId: 'r1', traded: false, status: 'active', estValue: 18 },
          { id: 'pk2', season: 2027, round: 3, originalRosterId: 'r2', currentOwnerId: 'r1', traded: true, status: 'active', estValue: 4.75 },
        ],
      },
    ],
    freeAgents: [player('fa1', 'WR', 'free_agent', 22, 40)],
    rookieDraftWindows: [{ season: 2027, status: 'pending', draftOrderMethod: 'max_pf', scheduledDraftDate: null }],
    availability: {
      scoringRules: 'available',
      rosterRules: 'available',
      standings: 'available',
      rosters: 'available',
      playerValues: 'available',
      playerAges: 'available',
      futurePicks: 'available',
      injuries: 'available',
      news: 'available',
      projections: 'missing',
      freeAgentPool: 'available',
    },
    freshness: { generatedAt: 'now', valuesAsOf: null, injuriesAsOf: null },
    missingDataFlags: [],
    featureAvailability: {
      teamDirection: true,
      rosterNeeds: true,
      tradeAnalyze: true,
      tradeFind: true,
      buySellHold: true,
      waivers: true,
      lineup: true,
      pickValue: true,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.buildContext.mockResolvedValue({ ok: true, context: makeContext() })
})

describe('buildDynastyWarRoomContextForChimmy', () => {
  it('returns null when no leagueId/userId', async () => {
    expect(await buildDynastyWarRoomContextForChimmy('', 'u1')).toBeNull()
    expect(await buildDynastyWarRoomContextForChimmy('lg1', '')).toBeNull()
  })

  it('returns null when the context build is not ok (e.g. non-dynasty/forbidden)', async () => {
    mocks.buildContext.mockResolvedValue({ ok: false, status: 404, error: 'Not a dynasty league' })
    expect(await buildDynastyWarRoomContextForChimmy('lg1', 'u1')).toBeNull()
  })

  it('grounds a dynasty league with War Room context, dynasty-only rules, and real pick capital', async () => {
    const out = await buildDynastyWarRoomContextForChimmy('lg1', 'u1')
    expect(out).toBeTruthy()
    const text = out as string
    expect(text).toMatch(/DYNASTY AF WAR ROOM CONTEXT/)
    expect(text).toMatch(/multi-year/i)
    // No-fake-pick rule + real pick capital surfaced
    expect(text).toMatch(/never invent picks/i)
    expect(text).toMatch(/Pick capital/i)
    expect(text).toMatch(/2027 R1/)
    // Contention window + rookie draft window grounding
    expect(text).toMatch(/TEAM DIRECTION/)
    expect(text).toMatch(/ROOKIE DRAFT WINDOWS/)
  })
})
