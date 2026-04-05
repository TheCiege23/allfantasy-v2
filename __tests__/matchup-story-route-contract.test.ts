import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const generateMatchupStoryMock = vi.fn()

vi.mock('@/lib/matchup-story-engine', () => ({
  generateMatchupStory: generateMatchupStoryMock,
}))

describe('POST /api/simulation/matchup/story contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when payload is invalid', async () => {
    const { POST } = await import('@/app/api/simulation/matchup/story/route')
    const req = createMockNextRequest('http://localhost/api/simulation/matchup/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamAName: 'Alpha' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns narrative on success', async () => {
    generateMatchupStoryMock.mockResolvedValueOnce({
      ok: true,
      sport: 'NFL',
      narrative:
        'You are projected to win, but your RB room is risky this week and one volatile slot could still open the upset lane.',
      source: 'ai',
      model: 'gpt-test',
    })

    const { POST } = await import('@/app/api/simulation/matchup/story/route')
    const req = createMockNextRequest('http://localhost/api/simulation/matchup/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport: 'NFL',
        teamAName: 'Alpha',
        teamBName: 'Bravo',
        projectedScoreA: 123.4,
        projectedScoreB: 119.8,
        winProbabilityA: 0.61,
        winProbabilityB: 0.39,
        upsetChance: 22,
        volatilityTag: 'medium',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.narrative).toContain('RB room is risky')
    expect(body.source).toBe('ai')
  })

  it('returns provider status code when AI generation fails', async () => {
    generateMatchupStoryMock.mockResolvedValueOnce({
      ok: false,
      sport: 'NFL',
      status: 503,
      error: 'OpenAI provider unavailable. Set OPENAI_API_KEY.',
    })

    const { POST } = await import('@/app/api/simulation/matchup/story/route')
    const req = createMockNextRequest('http://localhost/api/simulation/matchup/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport: 'NFL',
        teamAName: 'Alpha',
        teamBName: 'Bravo',
        projectedScoreA: 123.4,
        projectedScoreB: 119.8,
        winProbabilityA: 0.61,
        winProbabilityB: 0.39,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('Failed to generate matchup narrative')
  })
})
