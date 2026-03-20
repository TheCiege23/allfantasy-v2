import { beforeEach, describe, expect, it, vi } from 'vitest'

const getServerSessionMock = vi.fn()
const requireVerifiedUserMock = vi.fn()
const runImportedLeagueNormalizationPipelineMock = vi.fn()
const persistImportedLeagueFromNormalizationMock = vi.fn()

class ImportedLeagueConflictErrorMock extends Error {}

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/auth-guard', () => ({
  requireVerifiedUser: requireVerifiedUserMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/viral-loop', () => ({
  buildLeagueInviteUrl: vi.fn(() => 'https://invite.test/league'),
}))

vi.mock('@/lib/league-import/ImportedLeagueNormalizationPipeline', () => ({
  runImportedLeagueNormalizationPipeline: runImportedLeagueNormalizationPipelineMock,
}))

vi.mock('@/lib/league-import/ImportedLeagueCommitService', () => ({
  ImportedLeagueConflictError: ImportedLeagueConflictErrorMock,
  persistImportedLeagueFromNormalization: persistImportedLeagueFromNormalizationMock,
}))

describe('POST /api/league/create Sleeper import flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } })
    requireVerifiedUserMock.mockResolvedValue({
      ok: true,
      userId: 'u1',
    })
  })

  it('creates league from Sleeper import during league creation', async () => {
    runImportedLeagueNormalizationPipelineMock.mockResolvedValue({
      success: true,
      normalized: {
        source: {
          source_provider: 'sleeper',
          source_league_id: '12345',
          source_season_id: '2025',
          import_batch_id: 'sleeper-12345-batch',
          imported_at: '2026-03-20T00:00:00.000Z',
        },
        league: {
          name: 'Imported Sleeper League',
          sport: 'NFL',
          season: 2025,
          leagueSize: 12,
          rosterSize: 16,
          scoring: 'ppr',
          isDynasty: true,
        },
        rosters: [],
        scoring: null,
        schedule: [],
        draft_picks: [],
        transactions: [],
        standings: [],
        player_map: {},
        coverage: {
          leagueSettings: { state: 'full' },
          currentRosters: { state: 'full' },
          historicalRosterSnapshots: { state: 'partial' },
          scoringSettings: { state: 'full' },
          playoffSettings: { state: 'full' },
          currentStandings: { state: 'full' },
          currentSchedule: { state: 'partial' },
          draftHistory: { state: 'partial' },
          tradeHistory: { state: 'partial' },
          previousSeasons: { state: 'partial' },
          playerIdentityMap: { state: 'partial' },
        },
      },
    })
    persistImportedLeagueFromNormalizationMock.mockResolvedValue({
      league: { id: 'league-1', name: 'Imported Sleeper League', sport: 'NFL' },
      historicalBackfill: { status: 'queued' },
      existed: false,
    })

    const { POST } = await import('@/app/api/league/create/route')
    const req = new Request('http://localhost/api/league/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'sleeper',
        createFromSleeperImport: true,
        sleeperLeagueId: '12345',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      league: { id: 'league-1', name: 'Imported Sleeper League', sport: 'NFL' },
      historicalBackfill: { status: 'queued' },
    })

    expect(runImportedLeagueNormalizationPipelineMock).toHaveBeenCalledWith({
      provider: 'sleeper',
      sourceId: '12345',
      userId: 'u1',
    })
    expect(persistImportedLeagueFromNormalizationMock).toHaveBeenCalledWith({
      userId: 'u1',
      provider: 'sleeper',
      normalized: expect.objectContaining({
        source: expect.objectContaining({
          source_provider: 'sleeper',
          source_league_id: '12345',
          import_batch_id: 'sleeper-12345-batch',
          imported_at: '2026-03-20T00:00:00.000Z',
        }),
      }),
      allowUpdateExisting: false,
    })
  })

  it('maps Sleeper import conflicts to 409', async () => {
    runImportedLeagueNormalizationPipelineMock.mockResolvedValue({
      success: true,
      normalized: {
        source: {
          source_provider: 'sleeper',
          source_league_id: '12345',
          imported_at: '2026-03-20T00:00:00.000Z',
        },
        league: {
          name: 'Imported Sleeper League',
          sport: 'NFL',
          season: 2025,
          leagueSize: 12,
          rosterSize: 16,
          scoring: 'ppr',
          isDynasty: true,
        },
        rosters: [],
        scoring: null,
        schedule: [],
        draft_picks: [],
        transactions: [],
        standings: [],
        player_map: {},
        coverage: {
          leagueSettings: { state: 'full' },
          currentRosters: { state: 'full' },
          historicalRosterSnapshots: { state: 'partial' },
          scoringSettings: { state: 'full' },
          playoffSettings: { state: 'full' },
          currentStandings: { state: 'full' },
          currentSchedule: { state: 'partial' },
          draftHistory: { state: 'partial' },
          tradeHistory: { state: 'partial' },
          previousSeasons: { state: 'partial' },
          playerIdentityMap: { state: 'partial' },
        },
      },
    })
    persistImportedLeagueFromNormalizationMock.mockRejectedValue(
      new ImportedLeagueConflictErrorMock('This league already exists in your account')
    )

    const { POST } = await import('@/app/api/league/create/route')
    const req = new Request('http://localhost/api/league/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'sleeper',
        createFromSleeperImport: true,
        sleeperLeagueId: '12345',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: 'This league already exists in your account',
    })
  })
})
