import { beforeEach, describe, expect, it, vi } from 'vitest'

const openaiChatTextMock = vi.fn()

vi.mock('@/lib/openai-client', () => ({
  openaiChatText: openaiChatTextMock,
}))

describe('draft-ai-engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { clearAICostControlStateForTests } = await import('@/lib/ai-cost-control')
    clearAICostControlStateForTests()
  })

  it('returns deterministic best pick from board + roster needs', async () => {
    const { runDraftAIAssist } = await import('@/lib/draft-ai-engine')

    const result = await runDraftAIAssist(
      {
        available: [
          { name: 'Value WR', position: 'WR', team: 'DAL', adp: 18, byeWeek: 7 },
          { name: 'Need RB', position: 'RB', team: 'DET', adp: 20, byeWeek: 9 },
          { name: 'Depth TE', position: 'TE', team: 'MIA', adp: 30, byeWeek: 6 },
        ],
        teamRoster: [
          { position: 'QB', team: 'KC' },
          { position: 'WR', team: 'SEA' },
          { position: 'WR', team: 'BUF' },
          { position: 'TE', team: 'SF' },
        ],
        rosterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'BENCH'],
        round: 2,
        pick: 5,
        totalTeams: 12,
        sport: 'NFL',
        isDynasty: false,
        isSF: false,
        mode: 'needs',
      },
      { explanation: false }
    )

    expect(result.recommendation.recommendation?.player.position).toBe('RB')
    expect(result.aiExplanationUsed).toBe(false)
  })

  it('uses AI explanation when requested and available', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: true,
      text: 'Take Need RB now because it closes your most urgent roster gap. If sniped, pivot to Value WR for stable board value.',
      model: 'test',
      baseUrl: 'http://test',
    })

    const { runDraftAIAssist } = await import('@/lib/draft-ai-engine')
    const result = await runDraftAIAssist(
      {
        available: [{ name: 'Need RB', position: 'RB', team: 'DET', adp: 20, byeWeek: 9 }],
        teamRoster: [{ position: 'QB' }],
        rosterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE'],
        round: 3,
        pick: 1,
        totalTeams: 12,
        sport: 'NFL',
        isDynasty: false,
        isSF: false,
        mode: 'needs',
      },
      { explanation: true }
    )

    expect(result.aiExplanationUsed).toBe(true)
    expect(result.explanation).toMatch(/pivot/i)
  })

  it('falls back to deterministic explanation when AI is unavailable', async () => {
    openaiChatTextMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      details: 'unavailable',
      model: 'none',
      baseUrl: '',
    })

    const { runDraftAIAssist } = await import('@/lib/draft-ai-engine')
    const result = await runDraftAIAssist(
      {
        available: [{ name: 'Need RB', position: 'RB', team: 'DET', adp: 20, byeWeek: 9 }],
        teamRoster: [{ position: 'QB' }],
        rosterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE'],
        round: 3,
        pick: 1,
        totalTeams: 12,
        sport: 'NFL',
        isDynasty: false,
        isSF: false,
        mode: 'needs',
      },
      { explanation: true }
    )

    expect(result.aiExplanationUsed).toBe(false)
    expect(result.explanation).toBeNull()
    expect(result.recommendation.explanation.length).toBeGreaterThan(0)
  })
})
