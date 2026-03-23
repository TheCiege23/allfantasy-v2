import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const leagueFindFirstMock = vi.fn()
const mockDraftFindFirstMock = vi.fn()
const mockDraftCreateMock = vi.fn()
const sportsDataCacheFindFirstMock = vi.fn()
const getLiveADPMock = vi.fn()
const applyRealtimeAdpAdjustmentsMock = vi.fn()
const loadSportAwareDraftPlayerPoolMock = vi.fn()
const runDraftMock = vi.fn()
const summarizeDraftValidationMock = vi.fn()
const openAICompletionsCreateMock = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findFirst: leagueFindFirstMock,
    },
    mockDraft: {
      findFirst: mockDraftFindFirstMock,
      create: mockDraftCreateMock,
    },
    sportsDataCache: {
      findFirst: sportsDataCacheFindFirstMock,
    },
  },
}))

vi.mock('@/lib/adp-data', () => ({
  getLiveADP: getLiveADPMock,
}))

vi.mock('@/lib/mock-draft/adp-realtime-adjuster', () => ({
  applyRealtimeAdpAdjustments: applyRealtimeAdpAdjustmentsMock,
}))

vi.mock('@/lib/mock-draft/sport-player-pool', () => ({
  loadSportAwareDraftPlayerPool: loadSportAwareDraftPlayerPoolMock,
}))

vi.mock('@/lib/mock-draft-simulator', () => ({
  runDraft: runDraftMock,
}))

vi.mock('@/lib/mock-draft/draft-engine', () => ({
  summarizeDraftValidation: summarizeDraftValidationMock,
}))

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: openAICompletionsCreateMock,
      },
    }
  },
}))

describe('Mock draft simulate route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    getServerSessionMock.mockResolvedValue({ user: { id: 'u-1' } })
    leagueFindFirstMock.mockResolvedValue({
      id: 'lg-1',
      userId: 'u-1',
      sport: 'NFL',
      leagueSize: 2,
      isDynasty: false,
      scoring: 'PPR',
      platformLeagueId: 'pl-1',
      teams: [
        { id: 't-1', ownerName: 'User', teamName: 'User Team', avatarUrl: null },
        { id: 't-2', ownerName: 'CPU', teamName: 'CPU Team', avatarUrl: null },
      ],
      rosters: [],
    })
    mockDraftFindFirstMock.mockResolvedValue(null)
    mockDraftCreateMock.mockResolvedValue({ id: 'draft-1' })
    sportsDataCacheFindFirstMock.mockResolvedValue(null)
    summarizeDraftValidationMock.mockReturnValue({ valid: true, errors: [], warnings: [] })
    openAICompletionsCreateMock.mockResolvedValue({
      choices: [{ message: { content: '{"draftResults":[]}' } }],
    })
  })

  it('uses deterministic MockDraftEngine for NFL non-auction drafts', async () => {
    getLiveADPMock.mockResolvedValue([
      { name: 'QB Alpha', position: 'QB', team: 'AAA', adp: 1, value: 99 },
      { name: 'RB Alpha', position: 'RB', team: 'BBB', adp: 2, value: 95 },
      { name: 'WR Alpha', position: 'WR', team: 'CCC', adp: 3, value: 92 },
      { name: 'TE Alpha', position: 'TE', team: 'DDD', adp: 4, value: 88 },
    ])
    applyRealtimeAdpAdjustmentsMock.mockResolvedValue({
      entries: [
        { name: 'QB Alpha', position: 'QB', team: 'AAA', adp: 1, value: 99 },
        { name: 'RB Alpha', position: 'RB', team: 'BBB', adp: 2, value: 95 },
        { name: 'WR Alpha', position: 'WR', team: 'CCC', adp: 3, value: 92 },
        { name: 'TE Alpha', position: 'TE', team: 'DDD', adp: 4, value: 88 },
      ],
      adjustments: [],
    })
    runDraftMock.mockResolvedValue({
      picks: [
        {
          overall: 1,
          round: 1,
          slot: 1,
          manager: 'User Team',
          playerName: 'QB Alpha',
          position: 'QB',
          team: 'AAA',
          isUser: true,
          adp: 1,
        },
        {
          overall: 2,
          round: 1,
          slot: 2,
          manager: 'CPU Team',
          playerName: 'RB Alpha',
          position: 'RB',
          team: 'BBB',
          isUser: false,
          adp: 2,
        },
        {
          overall: 3,
          round: 2,
          slot: 2,
          manager: 'CPU Team',
          playerName: 'WR Alpha',
          position: 'WR',
          team: 'CCC',
          isUser: false,
          adp: 3,
        },
        {
          overall: 4,
          round: 2,
          slot: 1,
          manager: 'User Team',
          playerName: 'TE Alpha',
          position: 'TE',
          team: 'DDD',
          isUser: true,
          adp: 4,
        },
      ],
    })

    const { POST } = await import('@/app/api/mock-draft/simulate/route')
    const req = new Request('http://localhost/api/mock-draft/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leagueId: 'lg-1',
        rounds: 2,
        draftType: 'snake',
        refresh: true,
        useMeta: false,
      }),
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    expect(runDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          sport: 'NFL',
          numTeams: 2,
          rounds: 2,
          draftType: 'snake',
          useMeta: false,
        }),
      })
    )
    expect(getLiveADPMock).toHaveBeenCalled()
    expect(applyRealtimeAdpAdjustmentsMock).toHaveBeenCalled()
    expect(loadSportAwareDraftPlayerPoolMock).not.toHaveBeenCalled()
    expect(openAICompletionsCreateMock).not.toHaveBeenCalled()

    const body = await res.json()
    expect(body).toHaveProperty('draftResults')
    expect(body).toHaveProperty('draftId', 'draft-1')
  })
})
