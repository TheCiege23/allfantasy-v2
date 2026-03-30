import { beforeEach, describe, expect, it, vi } from 'vitest'

const openaiChatTextMock = vi.fn()

vi.mock('@/lib/openai-client', () => ({
  openaiChatText: openaiChatTextMock,
}))

describe('WaiverAIService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { clearAICostControlStateForTests } = await import('@/lib/ai-cost-control')
    clearAICostControlStateForTests()
  })

  it('returns deterministic suggestions from available players and team needs', async () => {
    const { runWaiverAIService } = await import('@/lib/waiver-ai-engine/WaiverAIService')
    const result = await runWaiverAIService({
      includeAIExplanation: false,
      goal: 'win-now',
      leagueSettings: { numTeams: 12, isDynasty: false, isSF: false, isTEP: false },
      teamNeeds: {
        weakestSlots: [
          {
            slot: 'RB',
            position: 'RB',
            currentPlayer: 'Depth RB',
            currentValue: 800,
            leagueMedianValue: 3000,
            gap: 2200,
            gapPpg: 2.6,
          },
        ],
        biggestNeed: {
          slot: 'RB',
          position: 'RB',
          currentPlayer: 'Depth RB',
          currentValue: 800,
          leagueMedianValue: 3000,
          gap: 2200,
          gapPpg: 2.6,
        },
        byeWeekClusters: [],
        positionalDepth: [],
        dropCandidates: [],
      },
      roster: [
        {
          id: 'r1',
          name: 'Starter RB',
          position: 'RB',
          team: 'DAL',
          slot: 'starter',
          age: 26,
          value: 1200,
        },
      ],
      availablePlayers: [
        {
          playerId: 'p-rb-1',
          playerName: 'Waiver RB',
          position: 'RB',
          team: 'DET',
          value: 3800,
        },
        {
          playerId: 'p-wr-1',
          playerName: 'Waiver WR',
          position: 'WR',
          team: 'SEA',
          value: 2600,
        },
      ],
    })

    expect(result.deterministic.basedOn).toEqual(['available_players', 'team_needs'])
    expect(result.deterministic.suggestions.length).toBeGreaterThan(0)
    expect(result.deterministic.suggestions[0].compositeScore).toBeGreaterThan(0)
    expect(result.sport).toBe('NFL')
    expect(result.explanation.source).toBe('deterministic')
  })

  it('uses AI explanation when enabled and valid', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: JSON.stringify({
        explanation: 'Add Waiver RB first because it directly fills the RB need and has the best composite upside.',
      }),
      model: 'test',
      baseUrl: 'http://test',
    })

    const { runWaiverAIService } = await import('@/lib/waiver-ai-engine/WaiverAIService')
    const result = await runWaiverAIService({
      includeAIExplanation: true,
      leagueSettings: {},
      availablePlayers: [{ playerId: 'p1', playerName: 'Waiver RB', position: 'RB', value: 3200 }],
    })

    expect(result.explanation.source).toBe('ai')
    expect(result.explanation.text).toMatch(/fills the RB need/i)
  })

  it('falls back to deterministic explanation when AI response is invalid', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: 'not-json',
      model: 'test',
      baseUrl: 'http://test',
    })

    const { runWaiverAIService } = await import('@/lib/waiver-ai-engine/WaiverAIService')
    const result = await runWaiverAIService({
      includeAIExplanation: true,
      leagueSettings: {},
      availablePlayers: [{ playerId: 'p1', playerName: 'Fallback Add', position: 'WR', value: 3100 }],
    })

    expect(result.explanation.source).toBe('deterministic')
    expect(result.explanation.text).toMatch(/Top deterministic add/i)
  })
})
