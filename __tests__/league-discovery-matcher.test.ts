import { beforeEach, describe, expect, it, vi } from 'vitest'

const openaiChatJsonMock = vi.fn()
const parseJsonContentFromChatCompletionMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

vi.mock('@/lib/openai-client', () => ({
  openaiChatJson: openaiChatJsonMock,
  parseJsonContentFromChatCompletion: parseJsonContentFromChatCompletionMock,
}))

describe('League Discovery AI matcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    parseJsonContentFromChatCompletionMock.mockReturnValue(null)
  })

  it('scores candidates across sport/skill/activity/competition', async () => {
    const { suggestLeagues } = await import('@/lib/league-discovery')
    openaiChatJsonMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      details: 'upstream',
      model: 'x',
      baseUrl: 'x',
    })

    const result = await suggestLeagues({
      preferences: {
        skillLevel: 'beginner',
        sportsPreferences: ['NBA'],
        preferredActivity: 'active',
        competitionBalance: 'competitive',
      },
      candidates: [
        {
          id: 'nba-1',
          name: 'NBA Fast League',
          sport: 'NBA',
          maxManagers: 10,
          activityLevel: 'active',
          competitionSpread: 'competitive',
        },
        {
          id: 'nfl-1',
          name: 'NFL Casual League',
          sport: 'NFL',
          maxManagers: 16,
          activityLevel: 'quiet',
          competitionSpread: 'casual',
        },
      ],
    })

    expect(result.suggestions).toHaveLength(2)
    expect(result.suggestions[0]?.id).toBe('nba-1')
    expect(result.suggestions[0]?.matchScore).toBeGreaterThan(result.suggestions[1]?.matchScore ?? 0)
    expect(result.suggestions[0]?.summary).toContain('match')
    expect(Array.isArray(result.suggestions[0]?.reasons)).toBe(true)
  })

  it('merges AI summaries and reasons for top matches', async () => {
    const { suggestLeagues } = await import('@/lib/league-discovery')
    openaiChatJsonMock.mockResolvedValueOnce({
      ok: true,
      json: { parsed: { suggestions: [{ id: 'lg-1', summary: 'Great fit.', reasons: ['Reason A', 'Reason B'] }] } },
    })
    parseJsonContentFromChatCompletionMock.mockImplementation((json: any) => json?.parsed ?? null)

    const result = await suggestLeagues({
      preferences: {
        skillLevel: 'intermediate',
        sportsPreferences: ['NFL'],
        preferredActivity: 'moderate',
        competitionBalance: 'balanced',
      },
      candidates: [
        {
          id: 'lg-1',
          name: 'League 1',
          sport: 'NFL',
          maxManagers: 12,
          activityLevel: 'moderate',
          competitionSpread: 'balanced',
        },
      ],
    })

    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0]?.summary).toBe('Great fit.')
    expect(result.suggestions[0]?.reasons).toEqual(['Reason A', 'Reason B'])
    expect(result.generatedAt).toEqual(expect.any(String))
  })
})
