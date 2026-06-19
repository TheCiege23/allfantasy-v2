import { describe, expect, it } from 'vitest'

import {
  REDRAFT_DRAFT_PERSONA_IDS,
  assignDeterministicRedraftPersona,
  buildGroundedChimmyDraftContext,
  buildRedraftWarRoomSuggestions,
  containsRawProviderPayload,
  normalizeRedraftDraftPickError,
  rankRedraftPersonaPicks,
  resolveRedraftDraftRoomModeContract,
} from '@/lib/redraft-draft-room'
import {
  buildApiResponse,
  parseCommissionerAiManagers,
} from '@/lib/commissioner-ai-draft-manager/CommissionerAiDraftManagerService'

describe('redraft draft room mode contract', () => {
  it('maps all production draft room modes to safe capabilities', () => {
    const live = resolveRedraftDraftRoomModeContract({ draftType: 'snake', status: 'in_progress' })
    expect(live.mode).toBe('live')
    expect(live.engineCore).toBe('snake')
    expect(live.canSubmitUserPick).toBe(true)

    const mock = resolveRedraftDraftRoomModeContract({ kind: 'mock', draftType: 'mock_draft', status: 'in_progress' })
    expect(mock.mode).toBe('mock')
    expect(mock.capabilities.mockDoesNotMutateRosters).toBe(true)

    const offline = resolveRedraftDraftRoomModeContract({ draftType: 'offline', executionMode: 'offline', status: 'in_progress' })
    expect(offline.mode).toBe('offline')
    expect(offline.canSubmitUserPick).toBe(false)
    expect(offline.canSubmitCommissionerPick).toBe(true)

    const slow = resolveRedraftDraftRoomModeContract({ draftType: 'slow_draft', timerSeconds: 14_400, status: 'paused' })
    expect(slow.mode).toBe('slow')
    expect(slow.safeState).toBe('paused')

    const auto = resolveRedraftDraftRoomModeContract({ draftType: 'auto', executionMode: 'auto', status: 'in_progress' })
    expect(auto.mode).toBe('auto')
    expect(auto.capabilities.autopick).toBe(true)
    expect(auto.canSubmitUserPick).toBe(false)

    const auction = resolveRedraftDraftRoomModeContract({ draftType: 'auction', status: 'in_progress' })
    expect(auction.mode).toBe('auction')
    expect(auction.engineCore).toBe('auction')
    expect(auction.capabilities.auctionBudget).toBe(true)
  })

  it('blocks starts and picks when roster config or draft order are missing', () => {
    const contract = resolveRedraftDraftRoomModeContract({
      draftType: 'snake',
      status: 'pre_draft',
      rosterConfigurationIncomplete: true,
      hasDraftOrder: false,
    })
    expect(contract.safeState).toBe('blocked')
    expect(contract.canStart).toBe(false)
    expect(contract.canSubmitUserPick).toBe(false)
    expect(contract.reasonCodes).toEqual(
      expect.arrayContaining(['ROSTER_CONFIGURATION_INCOMPLETE', 'DRAFT_ORDER_MISSING']),
    )
  })
})

describe('redraft pick error contract', () => {
  it('normalizes existing engine authority codes into user-facing redraft codes', () => {
    expect(normalizeRedraftDraftPickError({ code: 'DRAFT_PICK_NOT_ON_CLOCK' }).code).toBe('NOT_ON_CLOCK')
    expect(normalizeRedraftDraftPickError({ code: 'DRAFT_PICK_NOT_LIVE', sessionStatus: 'paused' }).code).toBe('DRAFT_PAUSED')
    expect(normalizeRedraftDraftPickError({ code: 'DRAFT_PICK_DUPLICATE_PLAYER' }).code).toBe('PLAYER_UNAVAILABLE')
    expect(normalizeRedraftDraftPickError({ code: 'DRAFT_PICK_STALE_OVERALL' }).code).toBe('STALE_PICK')
    expect(normalizeRedraftDraftPickError({ code: 'DRAFT_PICK_RACE_RETRY' }).retryable).toBe(true)
    expect(normalizeRedraftDraftPickError({ status: 401 }).code).toBe('UNAUTHORIZED')
    expect(normalizeRedraftDraftPickError({ status: 403, commissionerAction: true }).code).toBe('COMMISSIONER_REQUIRED')
    expect(normalizeRedraftDraftPickError({ message: 'wrong sport pool' }).code).toBe('PLAYER_INELIGIBLE')
    expect(normalizeRedraftDraftPickError({ code: 'DRAFT_PICK_NOT_LIVE', sessionStatus: 'completed' }).code).toBe('DRAFT_COMPLETE')
  })
})

describe('redraft deterministic missing-team personas', () => {
  const players = [
    {
      playerId: 'rb1',
      name: 'Anchor RB',
      position: 'RB',
      team: 'SF',
      sport: 'NFL',
      adp: 8,
      projectedFantasyPoints: 15,
      floorProjection: 10,
      ceilingProjection: 24,
      projectionConfidence: 84,
      byeWeek: 9,
    },
    {
      playerId: 'wr1',
      name: 'Alpha WR',
      position: 'WR',
      team: 'MIN',
      sport: 'NFL',
      adp: 9,
      projectedFantasyPoints: 15,
      floorProjection: 11,
      ceilingProjection: 23,
      projectionConfidence: 84,
      byeWeek: 6,
    },
    {
      playerId: 'bad',
      name: 'Wrong Sport Star',
      position: 'PG',
      team: 'BOS',
      sport: 'NBA',
      adp: 1,
      projectedFantasyPoints: 50,
    },
  ]

  it('ships exactly 21 deterministic personas and stable seed assignment', () => {
    expect(REDRAFT_DRAFT_PERSONA_IDS).toHaveLength(21)
    expect(assignDeterministicRedraftPersona('team-7')).toBe(assignDeterministicRedraftPersona('team-7'))
  })

  it('never selects drafted, ineligible, or wrong-sport players', () => {
    const result = rankRedraftPersonaPicks({
      personaId: 'BEST_PLAYER_AVAILABLE',
      availablePlayers: [
        ...players,
        { ...players[1], playerId: 'blocked', name: 'Blocked WR', eligible: false },
      ],
      draftedPlayerIds: ['rb1'],
      leagueSport: 'NFL',
      round: 2,
      overallPick: 18,
    })
    expect(result.selected?.player.playerId).toBe('wr1')
    expect(result.excluded.map((row) => row.reason)).toEqual(
      expect.arrayContaining(['drafted', 'wrong_sport', 'ineligible']),
    )
  })

  it('changes picks by persona without paid AI calls', () => {
    const hero = rankRedraftPersonaPicks({
      personaId: 'HERO_RB',
      availablePlayers: players,
      rosterCounts: { RB: 0, WR: 0 },
      leagueSport: 'NFL',
      round: 2,
      overallPick: 18,
    })
    const zero = rankRedraftPersonaPicks({
      personaId: 'ZERO_RB',
      availablePlayers: players,
      rosterCounts: { RB: 0, WR: 0 },
      leagueSport: 'NFL',
      round: 2,
      overallPick: 18,
    })
    expect(hero.selected?.player.playerId).toBe('rb1')
    expect(zero.selected?.player.playerId).toBe('wr1')
  })
})

describe('commissioner AI persona assignment contract', () => {
  it('preserves npcDraftPersonality and favorite team in assigned AI teams', () => {
    const blob = parseCommissionerAiManagers({
      assignments: [
        {
          rosterId: 'r1',
          aiStyle: 'BALANCED',
          tradeAggression: 'medium',
          active: true,
          npcDraftPersonality: 'HOMER_TEAM_FAVORITE',
          npcFavoriteTeamAbbr: 'DAL',
        },
      ],
      tradeRules: {
        allowOutbound: true,
        allowInbound: true,
        blockAiToAi: true,
        proposalCooldownSeconds: 90,
        maxProposalsPerRound: 4,
        acceptConfidenceMin: 0.58,
      },
    })
    const response = buildApiResponse(blob, [{ slot: 1, rosterId: 'r1', displayName: 'Orphan Team' }])
    expect(response.assignedAiTeams[0]).toMatchObject({
      teamId: 'r1',
      npcDraftPersonality: 'HOMER_TEAM_FAVORITE',
      npcFavoriteTeamAbbr: 'DAL',
    })
  })
})

describe('redraft War Room suggestions', () => {
  it('excludes drafted players and labels projection/injury/bye risk', () => {
    const result = buildRedraftWarRoomSuggestions({
      availablePlayers: [
        { playerId: 'drafted', name: 'Christian McCaffrey', position: 'RB', team: 'SF', sport: 'NFL', adp: 1 },
        {
          playerId: 'rb2',
          name: 'Available RB',
          position: 'RB',
          team: 'DET',
          sport: 'NFL',
          adp: 12,
          projectedFantasyPoints: 14.2,
          projectionConfidence: 75,
          injuryStatus: 'OUT',
          byeWeek: 5,
        },
        { playerId: 'wr2', name: 'Available WR', position: 'WR', team: 'DAL', sport: 'NFL', adp: null },
      ],
      draftedPlayerNames: ['Christian McCaffrey'],
      teamRoster: [{ position: 'QB' }],
      rosterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
      round: 2,
      pick: 1,
      totalTeams: 12,
      sport: 'NFL',
    })

    expect(result.excludedCount).toBe(1)
    expect(result.bestPick?.name).not.toBe('Christian McCaffrey')
    expect(result.warnings.join(' ')).toMatch(/OUT|bye week/i)
    expect(result.missingDataLabels.join(' ')).toMatch(/ADP|projection/i)
  })
})

describe('grounded Chimmy draft context', () => {
  it('sanitizes raw provider payloads and excludes drafted players from available context', () => {
    const modeContract = resolveRedraftDraftRoomModeContract({ draftType: 'snake', status: 'in_progress' })
    const warRoom = buildRedraftWarRoomSuggestions({
      availablePlayers: [
        { playerId: 'p1', name: 'Available WR', position: 'WR', team: 'DAL', sport: 'NFL', adp: 20, projectedFantasyPoints: 13 },
      ],
      teamRoster: [{ position: 'QB' }],
      round: 3,
      pick: 4,
      totalTeams: 12,
      sport: 'NFL',
    })
    const context = buildGroundedChimmyDraftContext({
      leagueId: 'league-1',
      leagueName: 'Friday Redraft',
      sport: 'NFL',
      scoringPreset: 'ppr',
      modeContract,
      currentPick: { round: 3, pick: 4, overall: 28, rosterName: 'Team A' },
      rosterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
      availablePlayers: [
        {
          playerId: 'p1',
          name: 'Available WR',
          position: 'WR',
          team: 'DAL',
          sport: 'NFL',
          adp: 20,
          projectedFantasyPoints: 13,
          restOfSeasonProjection: 156,
          projectionConfidence: 78,
          providerPayload: { rollingInsights: { private: true } },
        } as never,
        { playerId: 'p2', name: 'Drafted RB', position: 'RB', team: 'SF', sport: 'NFL', adp: 1 },
      ],
      draftedPlayers: [{ playerId: 'p2', name: 'Drafted RB', position: 'RB', team: 'SF' }],
      queue: [{ playerId: 'p1', name: 'Available WR', position: 'WR', team: 'DAL' }],
      warRoom,
      dataUpdatedAt: '2026-06-19T12:00:00.000Z',
    })

    expect(context.availablePlayers.map((player) => player.name)).toEqual(['Available WR'])
    expect(context.prompt).toContain('Friday Redraft')
    expect(context.prompt).toContain('Available WR')
    expect(containsRawProviderPayload(context)).toBe(false)
  })
})
