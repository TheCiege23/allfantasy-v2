import { beforeEach, describe, expect, it, vi } from 'vitest'

const runMatchupSimulationMock = vi.fn()
const getMatchupSimulationInsightMock = vi.fn()
const predictMatchupDeterministicMock = vi.fn()
const generateMatchupStoryMock = vi.fn()

vi.mock('@/lib/simulation-engine/MatchupSimulator', () => ({
  runMatchupSimulation: runMatchupSimulationMock,
}))

vi.mock('@/lib/simulation-engine/SportSimulationResolver', () => ({
  getDefaultScoreStdDev: vi.fn(() => 12),
}))

vi.mock('@/lib/simulation-engine/ScoreDistributionModel', () => ({
  percentiles: vi.fn(() => [100, 130]),
}))

vi.mock('@/lib/simulation-engine/MatchupSimulationInsightAI', () => ({
  getMatchupSimulationInsight: getMatchupSimulationInsightMock,
}))

vi.mock('@/lib/matchup-prediction-engine', () => ({
  predictMatchupDeterministic: predictMatchupDeterministicMock,
}))

vi.mock('@/lib/matchup-story-engine', () => ({
  generateMatchupStory: generateMatchupStoryMock,
}))

describe('POST /api/simulation/matchup story integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('attaches storyNarrative when includeStoryNarrative is enabled', async () => {
    runMatchupSimulationMock.mockResolvedValueOnce({
      expectedScoreA: 124.3,
      expectedScoreB: 118.6,
      winProbabilityA: 0.61,
      winProbabilityB: 0.39,
      marginMean: 5.7,
      marginStdDev: 9.2,
      upsetChance: 23.1,
      volatilityTag: 'medium',
      iterations: 1500,
      scoreDistributionA: [110, 125, 132],
      scoreDistributionB: [106, 118, 129],
      teamSummaryA: { derivedStdDev: 11.5 },
      teamSummaryB: { derivedStdDev: 12.1 },
      deterministicSeed: 9876,
    })
    predictMatchupDeterministicMock.mockReturnValueOnce({
      projectedScoreA: 124.3,
      projectedScoreB: 118.6,
      winProbabilityA: 0.61,
      winProbabilityB: 0.39,
      confidenceBand: 'normal',
      appliedRules: {
        pointMultiplier: 1,
        teamABonus: 0,
        teamBBonus: 0,
        varianceMultiplier: 1,
        preset: 'standard',
      },
    })
    generateMatchupStoryMock.mockResolvedValueOnce({
      ok: true,
      sport: 'NFL',
      narrative: 'You are projected to win, but your RB room is risky this week.',
      source: 'ai',
      model: 'gpt-test',
    })

    const { POST } = await import('@/app/api/simulation/matchup/route')
    const req = new Request('http://localhost/api/simulation/matchup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport: 'NFL',
        teamAName: 'Alpha',
        teamBName: 'Bravo',
        teamA: { mean: 124.3 },
        teamB: { mean: 118.6 },
        includeStoryNarrative: true,
      }),
    })

    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.storyNarrative?.text).toContain('RB room is risky')
    expect(generateMatchupStoryMock).toHaveBeenCalledTimes(1)
  })
})
