import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RedraftWarRoomContext } from '@/lib/redraft-war-room/types'

const mocks = vi.hoisted(() => ({
  leagueFindUnique: vi.fn(),
  buildContext: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: { league: { findUnique: mocks.leagueFindUnique } } }))
vi.mock('@/lib/redraft-war-room/redraftWarRoomContext', () => ({
  buildRedraftWarRoomContext: mocks.buildContext,
}))

import { buildRedraftContextForChimmy } from '@/lib/redraft-war-room/redraftChimmyGrounding'

function makeContext(): RedraftWarRoomContext {
  const player = (id: string, position: string, slotType: string, adp: number | null, proj: number | null) => ({
    playerId: id,
    playerName: `Player ${id}`,
    position,
    team: 'TM',
    slotType,
    isStarterSlot: slotType !== 'bench' && slotType !== 'free_agent',
    injuryStatus: null,
    byeWeek: null,
    weekProjection: proj,
    seasonAvgActual: null,
    adp,
    hasNoValueSignal: proj == null && adp == null,
  })
  return {
    leagueId: 'lg1',
    leagueType: 'redraft',
    sport: 'NFL',
    season: 2026,
    currentWeek: 6,
    totalWeeks: 17,
    playoffStartWeek: 15,
    seasonStatus: 'active',
    scoring: { sport: 'NFL', scoringPreset: 'PPR', pointsPerReception: 1, superflex: false, tePremium: false, idp: false },
    roster: {
      totalStarterSlots: 2,
      benchSlots: 4,
      irSlots: 0,
      lineupSlots: [
        { slotName: 'RB', allowedPositions: ['RB'], starterCount: 1, isFlex: false, isSuperflex: false },
        { slotName: 'WR', allowedPositions: ['WR'], starterCount: 1, isFlex: false, isSuperflex: false },
      ],
      requiredByPosition: { RB: 1, WR: 1, QB: 1 },
    },
    waivers: { type: 'faab', faabBudget: 100 },
    userRosterId: 'r1',
    isCommissioner: false,
    teams: [
      {
        rosterId: 'r1',
        ownerId: 'u1',
        ownerName: 'Me',
        teamName: 'My Team',
        wins: 3,
        losses: 3,
        ties: 0,
        pointsFor: 600,
        pointsAgainst: 600,
        streak: null,
        playoffSeed: 5,
        faabBalance: 80,
        waiverPriority: 4,
        isEliminated: false,
        isUserTeam: true,
        players: [player('rb1', 'RB', 'RB', null, 14), player('wr1', 'WR', 'WR', null, 12)],
      },
    ],
    upcomingMatchup: null,
    recentMatchup: null,
    freeAgents: [player('faqb|qb', 'QB', 'free_agent', 8, null)],
    availability: {
      scoringRules: 'available',
      rosterRules: 'available',
      standings: 'available',
      schedule: 'available',
      playerStats: 'available',
      projections: 'available',
      injuries: 'available',
      news: 'available',
      waiverPool: 'available',
      tradeValues: 'available',
    },
    freshness: { generatedAt: 'now', statsAsOf: null, projectionsAsOf: null, injuriesAsOf: null },
    missingDataFlags: ['No injury data available.'],
    featureAvailability: { teamNeeds: true, lineup: true, waivers: true, tradeAnalyze: true, tradeFind: true },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.buildContext.mockResolvedValue({ ok: true, context: makeContext() })
})

describe('buildRedraftContextForChimmy', () => {
  it('returns null for a non-redraft (dynasty) league', async () => {
    mocks.leagueFindUnique.mockResolvedValue({ leagueType: 'dynasty', isDynasty: true, leagueVariant: null })
    expect(await buildRedraftContextForChimmy('lg1', 'u1')).toBeNull()
  })

  it('returns null for a specialty variant (e.g. survivor)', async () => {
    mocks.leagueFindUnique.mockResolvedValue({ leagueType: 'redraft', isDynasty: false, leagueVariant: 'survivor' })
    expect(await buildRedraftContextForChimmy('lg1', 'u1')).toBeNull()
  })

  it('returns null when no leagueId/userId', async () => {
    expect(await buildRedraftContextForChimmy('', 'u1')).toBeNull()
    expect(await buildRedraftContextForChimmy('lg1', '')).toBeNull()
  })

  it('grounds a native redraft league with War Room context + redraft-only rules', async () => {
    mocks.leagueFindUnique.mockResolvedValue({ leagueType: 'redraft', isDynasty: false, leagueVariant: null })
    const out = await buildRedraftContextForChimmy('lg1', 'u1')
    expect(out).toBeTruthy()
    const text = out as string
    // Redraft-only + no-invention rules present
    expect(text).toMatch(/REDRAFT AF WAR ROOM CONTEXT/)
    expect(text).toMatch(/do not invent/i)
    expect(text).toMatch(/dynasty|future draft picks|taxi|devy/i)
    // Deterministic league-specific grounding present
    expect(text).toMatch(/DATA AVAILABILITY/)
    expect(text).toMatch(/DETERMINISTIC TEAM NEEDS/)
    expect(text).toMatch(/TOP FREE AGENTS|FREE AGENTS/)
    // Missing-data honesty carried through
    expect(text).toMatch(/MISSING-DATA FLAGS|No injury data/i)
  })

  it('does not throw when the context build fails (returns null)', async () => {
    mocks.leagueFindUnique.mockResolvedValue({ leagueType: 'redraft', isDynasty: false, leagueVariant: null })
    mocks.buildContext.mockResolvedValue({ ok: false, status: 403, error: 'Forbidden' })
    expect(await buildRedraftContextForChimmy('lg1', 'u1')).toBeNull()
  })
})
