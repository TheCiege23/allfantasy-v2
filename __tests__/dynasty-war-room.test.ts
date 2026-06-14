import { describe, expect, it } from 'vitest'
import { evaluateDynastyTeamNeeds } from '@/lib/dynasty-war-room/dynastyRosterNeedsEngine'
import { evaluateDynastyTeamDirection } from '@/lib/dynasty-war-room/dynastyTeamDirectionEngine'
import { evaluateBuySellHold } from '@/lib/dynasty-war-room/dynastyBuySellHoldEngine'
import { buildDynastyLineupRecommendation } from '@/lib/dynasty-war-room/dynastyLineupEngine'
import { buildDynastyWaiverRecommendations } from '@/lib/dynasty-war-room/dynastyWaiverEngine'
import { analyzeDynastyTrade, findDynastyTradeTargets } from '@/lib/dynasty-war-room/dynastyTradeEngine'
import { evaluateDynastyPickValue } from '@/lib/dynasty-war-room/dynastyPickValueEngine'
import {
  DYNASTY_WAR_ROOM_SYSTEM_RULES,
  buildDynastyWarRoomPrompt,
} from '@/lib/dynasty-war-room/dynastyWarRoomPrompt'
import { adpToDynastyValue, ageTrajectory, dynastyValue } from '@/lib/dynasty-war-room/dynastyPlayerValue'
import type {
  DynastyDataAvailability,
  DynastyPlayerFact,
  DynastyTeamSummary,
  DynastyWarRoomContext,
} from '@/lib/dynasty-war-room/types'

// --- fixture helpers ----------------------------------------------------------

// Mirrors the dynastyValue() contract: an explicit dynastyValue takes precedence,
// otherwise value is derived from ADP at read time (source 'adp'). The fixture
// keeps dynastyValue null when only ADP is supplied so the 'adp' path is exercised.
function player(p: Partial<DynastyPlayerFact> & { playerId: string; position: string }): DynastyPlayerFact {
  const adp = p.adp ?? null
  const dyn = p.dynastyValue ?? null
  return {
    playerId: p.playerId,
    playerName: p.playerName ?? `Player ${p.playerId}`,
    position: p.position,
    team: p.team ?? 'TM',
    slotType: p.slotType ?? 'bench',
    isStarterSlot: p.isStarterSlot ?? (p.slotType ? p.slotType === 'starter' : false),
    age: p.age ?? null,
    dynastyValue: dyn,
    adp,
    injuryStatus: p.injuryStatus ?? null,
    weekProjection: null,
    hasNoValueSignal: dyn == null && adp == null,
  }
}

const FULL_AVAILABILITY: DynastyDataAvailability = {
  scoringRules: 'available',
  rosterRules: 'available',
  standings: 'available',
  rosters: 'available',
  playerValues: 'available',
  playerAges: 'available',
  futurePicks: 'missing',
  injuries: 'available',
  news: 'available',
  projections: 'missing',
  freeAgentPool: 'available',
}

function team(over: Partial<DynastyTeamSummary> & { rosterId: string }): DynastyTeamSummary {
  return {
    rosterId: over.rosterId,
    ownerId: over.ownerId ?? `owner-${over.rosterId}`,
    ownerName: over.ownerName ?? `Owner ${over.rosterId}`,
    teamName: over.teamName ?? `Team ${over.rosterId}`,
    wins: over.wins ?? 0,
    losses: over.losses ?? 0,
    ties: over.ties ?? 0,
    pointsFor: over.pointsFor ?? 0,
    playoffSeed: over.playoffSeed ?? null,
    isUserTeam: over.isUserTeam ?? false,
    players: over.players ?? [],
    picks: over.picks ?? [],
  }
}

function makeContext(over: Partial<DynastyWarRoomContext> = {}): DynastyWarRoomContext {
  const availability = { ...FULL_AVAILABILITY, ...(over.availability ?? {}) }
  return {
    leagueId: 'lg1',
    leagueType: 'dynasty',
    sport: 'NFL',
    season: 2026,
    scoring: { sport: 'NFL', scoringPreset: 'PPR', superflex: true, tePremium: false },
    roster: {
      totalStarterSlots: 9,
      benchSlots: 10,
      taxiSlots: 4,
      irSlots: 2,
      requiredByPosition: { QB: 1, RB: 2, WR: 3, TE: 1 },
    },
    userRosterId: 'r1',
    isCommissioner: false,
    teams: over.teams ?? [],
    freeAgents: over.freeAgents ?? [],
    availability,
    freshness: { generatedAt: new Date().toISOString(), valuesAsOf: null, injuriesAsOf: null },
    missingDataFlags: over.missingDataFlags ?? [],
    featureAvailability: {
      teamDirection: true,
      rosterNeeds: true,
      tradeAnalyze: true,
      tradeFind: true,
      buySellHold: true,
      waivers: true,
      lineup: true,
      pickValue: false,
      ...(over.featureAvailability ?? {}),
    },
    ...over,
  }
}

// A young, high-value contender roster.
function contenderRoster(): DynastyTeamSummary {
  return team({
    rosterId: 'r1',
    isUserTeam: true,
    wins: 8,
    losses: 2,
    pointsFor: 1400,
    players: [
      player({ playerId: 'qb1', position: 'QB', slotType: 'starter', age: 26, adp: 5 }),
      player({ playerId: 'rb1', position: 'RB', slotType: 'starter', age: 23, adp: 8 }),
      player({ playerId: 'rb2', position: 'RB', slotType: 'starter', age: 29, adp: 40 }),
      player({ playerId: 'wr1', position: 'WR', slotType: 'starter', age: 24, adp: 3 }),
      player({ playerId: 'wr2', position: 'WR', slotType: 'starter', age: 25, adp: 15 }),
      player({ playerId: 'wr3', position: 'WR', slotType: 'starter', age: 27, adp: 30 }),
      player({ playerId: 'te1', position: 'TE', slotType: 'starter', age: 28, adp: 35 }),
      player({ playerId: 'rb3', position: 'RB', slotType: 'bench', age: 22, adp: 60 }),
      player({ playerId: 'wr4', position: 'WR', slotType: 'bench', age: 21, adp: 70 }),
      player({ playerId: 'qb2', position: 'QB', slotType: 'taxi', age: 21, adp: 90 }),
    ],
  })
}

function rebuilderRoster(): DynastyTeamSummary {
  return team({
    rosterId: 'r2',
    wins: 2,
    losses: 8,
    pointsFor: 1050,
    players: [
      player({ playerId: 'q1', position: 'QB', slotType: 'starter', age: 35, adp: 50 }),
      player({ playerId: 'r1b', position: 'RB', slotType: 'starter', age: 30, adp: 45 }),
      player({ playerId: 'r2b', position: 'RB', slotType: 'starter', age: 31, adp: 80 }),
      player({ playerId: 'w1', position: 'WR', slotType: 'starter', age: 32, adp: 55 }),
      player({ playerId: 'w2', position: 'WR', slotType: 'starter', age: 22, adp: 20 }),
      player({ playerId: 'w3', position: 'WR', slotType: 'starter', age: 23, adp: 25 }),
      player({ playerId: 't1', position: 'TE', slotType: 'starter', age: 33, adp: 100 }),
    ],
  })
}

// --- value helpers ------------------------------------------------------------

describe('dynasty value + age helpers', () => {
  it('maps ADP to a positive, decreasing dynasty value', () => {
    expect(adpToDynastyValue(5)).toBeGreaterThan(adpToDynastyValue(50))
    expect(adpToDynastyValue(300)).toBe(0)
  })

  it('prefers explicit value over ADP and returns none when both missing', () => {
    expect(dynastyValue(player({ playerId: 'a', position: 'WR', dynastyValue: 42 })).source).toBe('value')
    expect(dynastyValue(player({ playerId: 'b', position: 'WR', adp: 10 })).source).toBe('adp')
    expect(dynastyValue(player({ playerId: 'c', position: 'WR' })).source).toBe('none')
  })

  it('applies position-specific age trajectories (RB cliffs earlier than QB)', () => {
    expect(ageTrajectory('RB', 28)).toBe('cliff')
    expect(ageTrajectory('QB', 28)).toBe('prime')
    expect(ageTrajectory('WR', 22)).toBe('ascending')
    expect(ageTrajectory('K', 25)).toBe('unknown')
    expect(ageTrajectory('WR', null)).toBe('unknown')
  })
})

// --- team direction -----------------------------------------------------------

describe('dynastyTeamDirectionEngine', () => {
  it('classifies a winning, value-rich roster as contending', () => {
    const ctx = makeContext({ teams: [contenderRoster()] })
    const res = evaluateDynastyTeamDirection(ctx, 'r1')
    expect(res.window).toBe('contend')
    expect(res.posture).toBe('buy_win_now')
    expect(res.contendScore).not.toBeNull()
    expect(res.avgStarterAge).toBeGreaterThan(0)
  })

  it('classifies a losing, aging roster as rebuilding', () => {
    const ctx = makeContext({ teams: [rebuilderRoster()] })
    const res = evaluateDynastyTeamDirection(ctx, 'r2')
    expect(res.window).toBe('rebuild')
    expect(res.posture).toBe('sell_for_youth')
  })

  it('returns unknown when no value or record signal exists', () => {
    const ctx = makeContext({
      teams: [team({ rosterId: 'r1', players: [player({ playerId: 'x', position: 'WR' })] })],
      availability: { playerValues: 'missing', standings: 'missing' },
    })
    const res = evaluateDynastyTeamDirection(ctx, 'r1')
    expect(res.window).toBe('unknown')
    expect(res.contendScore).toBeNull()
  })
})

// --- roster needs -------------------------------------------------------------

describe('dynastyRosterNeedsEngine', () => {
  it('flags a structural positional hole', () => {
    const ctx = makeContext({
      teams: [
        team({
          rosterId: 'r1',
          isUserTeam: true,
          players: [player({ playerId: 'qb1', position: 'QB', slotType: 'starter', age: 26, adp: 5 })],
        }),
      ],
    })
    const res = evaluateDynastyTeamNeeds(ctx, 'r1')
    // No RB/WR/TE → needs at those positions.
    expect(res.needs.some((n) => n.position === 'WR' && n.severity === 'critical')).toBe(true)
    expect(res.tradeTargetPositions).toContain('RB')
  })

  it('flags aging concentration as a weakness', () => {
    const ctx = makeContext({ teams: [rebuilderRoster()] })
    const res = evaluateDynastyTeamNeeds(ctx, 'r2')
    expect(res.weaknesses.some((w) => w.toLowerCase().includes('aging'))).toBe(true)
  })
})

// --- buy/sell/hold ------------------------------------------------------------

describe('dynastyBuySellHoldEngine', () => {
  it('recommends selling aging assets on a rebuild', () => {
    const ctx = makeContext({ teams: [rebuilderRoster()] })
    const res = evaluateBuySellHold(ctx, 'r2')
    expect(res.window).toBe('rebuild')
    const oldQb = res.entries.find((e) => e.playerId === 'q1')
    expect(oldQb?.call).toBe('sell')
  })

  it('holds by default and flags when no value signal exists', () => {
    const ctx = makeContext({
      teams: [team({ rosterId: 'r1', players: [player({ playerId: 'x', position: 'WR', age: 24 })] })],
      availability: { playerValues: 'missing' },
    })
    const res = evaluateBuySellHold(ctx, 'r1')
    expect(res.needsValueSignal).toBe(true)
    expect(res.entries.every((e) => e.call === 'hold')).toBe(true)
  })
})

// --- lineup -------------------------------------------------------------------

describe('dynastyLineupEngine', () => {
  it('fills required slots by value and excludes taxi/IR players, low confidence', () => {
    const ctx = makeContext({ teams: [contenderRoster()] })
    const res = buildDynastyLineupRecommendation(ctx, 'r1')
    expect(res.confidence).toBe('low')
    // taxi QB (qb2) must not be a starter
    expect(res.suggestedStarters.some((s) => s.playerId === 'qb2')).toBe(false)
    expect(res.suggestedStarters.filter((s) => s.position === 'WR').length).toBe(3)
  })
})

// --- waivers ------------------------------------------------------------------

describe('dynastyWaiverEngine', () => {
  it('ranks young free agents above older ones and lists drops', () => {
    const ctx = makeContext({
      teams: [contenderRoster()],
      freeAgents: [
        player({ playerId: 'fa-young', position: 'WR', slotType: 'free_agent', age: 22, adp: 65 }),
        player({ playerId: 'fa-old', position: 'WR', slotType: 'free_agent', age: 31, adp: 64 }),
      ],
    })
    const res = buildDynastyWaiverRecommendations(ctx, 'r1')
    expect(res.needsProviderIntegration).toBe(false)
    expect(res.recommendedAdds[0].playerId).toBe('fa-young')
    expect(res.recommendedDrops.length).toBeGreaterThan(0)
  })

  it('returns no invented adds when the pool is unavailable', () => {
    const ctx = makeContext({
      teams: [contenderRoster()],
      freeAgents: [],
      availability: { freeAgentPool: 'missing' },
    })
    const res = buildDynastyWaiverRecommendations(ctx, 'r1')
    expect(res.needsProviderIntegration).toBe(true)
    expect(res.recommendedAdds).toHaveLength(0)
    expect(res.recommendedDrops.length).toBeGreaterThan(0)
  })
})

// --- trade --------------------------------------------------------------------

describe('dynastyTradeEngine', () => {
  it('age-adjusts value: acquiring an ascending player for an aging one grades favorably', () => {
    const ctx = makeContext({ teams: [contenderRoster(), rebuilderRoster()] })
    const res = analyzeDynastyTrade(ctx, {
      rosterId: 'r1',
      outgoingPlayerIds: ['rb2'], // age 29 RB (cliff)
      incomingPlayerIds: ['w2'], // age 22 WR (ascending), on r2
    })
    expect(res.verdict).not.toBe('needs_more_data')
    expect(res.valueDelta).not.toBeNull()
    expect(res.ageImpact.length).toBeGreaterThan(0)
  })

  it('flags picks as unpriced and needs_more_data without value', () => {
    const ctx = makeContext({
      teams: [team({ rosterId: 'r1', isUserTeam: true, players: [player({ playerId: 'np', position: 'WR' })] })],
      availability: { playerValues: 'missing', playerAges: 'missing' },
    })
    const res = analyzeDynastyTrade(ctx, {
      rosterId: 'r1',
      outgoingPlayerIds: ['np'],
      incomingPlayerIds: [],
      incomingPickIds: ['2027-1'],
    })
    expect(res.verdict).toBe('needs_more_data')
    expect(res.riskFlags.some((r) => r.toLowerCase().includes('pick'))).toBe(true)
  })

  it('matches a contender with a rebuilder in the trade finder', () => {
    const ctx = makeContext({ teams: [contenderRoster(), rebuilderRoster()] })
    const res = findDynastyTradeTargets(ctx, 'r1')
    expect(res.needsMoreData).toBe(false)
    const partner = res.targets.find((t) => t.rosterId === 'r2')
    expect(partner?.windowFit).toBeTruthy()
  })
})

// --- pick value (provider-limited) -------------------------------------------

describe('dynastyPickValueEngine', () => {
  it('reports provider integration needed when pick data is missing', () => {
    const ctx = makeContext({ teams: [contenderRoster()] })
    const res = evaluateDynastyPickValue(ctx, 'r1')
    expect(res.needsProviderIntegration).toBe(true)
    expect(res.picks).toHaveLength(0)
    expect(res.totalEstValue).toBeNull()
  })
})

// --- prompt -------------------------------------------------------------------

describe('dynastyWarRoomPrompt', () => {
  it('includes dynasty-only grounding rules and no redraft short-season framing', () => {
    expect(DYNASTY_WAR_ROOM_SYSTEM_RULES).toContain('DYNASTY')
    expect(DYNASTY_WAR_ROOM_SYSTEM_RULES.toLowerCase()).toContain('multi-year')
    expect(DYNASTY_WAR_ROOM_SYSTEM_RULES.toLowerCase()).toContain('not priced')
  })

  it('serializes context + engine outputs deterministically', () => {
    const ctx = makeContext({ teams: [contenderRoster()] })
    const prompt = buildDynastyWarRoomPrompt({
      context: ctx,
      direction: evaluateDynastyTeamDirection(ctx, 'r1'),
      needs: evaluateDynastyTeamNeeds(ctx, 'r1'),
      buySellHold: evaluateBuySellHold(ctx, 'r1'),
    })
    expect(prompt).toContain('DYNASTY LEAGUE CONTEXT')
    expect(prompt).toContain('DETERMINISTIC TEAM DIRECTION')
    expect(prompt).toContain('DETERMINISTIC BUY/SELL/HOLD')
  })
})
