import { beforeEach, describe, expect, it, vi } from 'vitest'

const openaiChatTextMock = vi.fn()

vi.mock('@/lib/openai-client', () => ({
  openaiChatText: openaiChatTextMock,
}))

describe('MatchupStoryEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns AI narrative when provider succeeds', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: 'You are projected to win, but your RB room is risky this week and one late scratch could flip the script.',
      model: 'gpt-test',
      baseUrl: 'https://api.openai.com/v1',
    })

    const { generateMatchupStory } = await import('@/lib/matchup-story-engine')
    const result = await generateMatchupStory({
      sport: 'NFL',
      teamAName: 'Alpha',
      teamBName: 'Bravo',
      projectedScoreA: 124.8,
      projectedScoreB: 118.1,
      winProbabilityA: 0.62,
      winProbabilityB: 0.38,
      upsetChance: 21.6,
      volatilityTag: 'medium',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.source).toBe('ai')
      expect(result.narrative).toContain('RB room is risky')
      expect(result.sport).toBe('NFL')
    }
  })

  it('returns error when AI provider is unavailable', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      details: 'OpenAI provider unavailable. Set OPENAI_API_KEY.',
      model: 'unavailable',
      baseUrl: '',
    })

    const { generateMatchupStory } = await import('@/lib/matchup-story-engine')
    const result = await generateMatchupStory({
      sport: 'NBA',
      teamAName: 'Alpha',
      teamBName: 'Bravo',
      projectedScoreA: 111.2,
      projectedScoreB: 109.4,
      winProbabilityA: 0.54,
      winProbabilityB: 0.46,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(503)
      expect(result.error).toContain('OpenAI provider unavailable')
      expect(result.sport).toBe('NBA')
    }
  })
})
