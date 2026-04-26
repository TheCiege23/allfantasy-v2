import { beforeEach, describe, expect, it, vi } from 'vitest'

const getLatestNewsMock = vi.fn()
const getInjuryReportMock = vi.fn()
const sportsGameFindManyMock = vi.fn()
const sportsDataCacheFindManyMock = vi.fn()
const sportsNewsFindManyMock = vi.fn()
const playerSeasonStatsFindManyMock = vi.fn()
const fetchNewsAPIEverythingMock = vi.fn()

vi.mock('@/lib/data/news', () => ({
  getLatestNews: getLatestNewsMock,
}))

vi.mock('@/lib/data/players', () => ({
  getInjuryReport: getInjuryReportMock,
}))

vi.mock('@/app/api/sports/news/sync-helper', () => ({
  fetchNewsAPIEverything: fetchNewsAPIEverythingMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sportsGame: { findMany: sportsGameFindManyMock },
    sportsDataCache: { findMany: sportsDataCacheFindManyMock },
    sportsNews: { findMany: sportsNewsFindManyMock },
    playerSeasonStats: { findMany: playerSeasonStatsFindManyMock },
  },
}))

describe('buildChimmySportDataDigest seeded fixture scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLatestNewsMock.mockResolvedValue([])
    getInjuryReportMock.mockResolvedValue([])
    sportsGameFindManyMock.mockResolvedValue([])
    sportsDataCacheFindManyMock.mockResolvedValue([])
    sportsNewsFindManyMock.mockResolvedValue([])
    playerSeasonStatsFindManyMock.mockResolvedValue([])
    fetchNewsAPIEverythingMock.mockResolvedValue([])
  })

  it('builds NFL draft date context from seeded DB-backed news rows', async () => {
    getLatestNewsMock.mockResolvedValueOnce([
      {
        id: 'nfl-news-1',
        headline: 'NFL Draft starts April 30, 2026 in Detroit.',
        playerName: null,
        team: null,
        source: 'api_sports',
        publishedAt: new Date('2026-04-25T12:00:00.000Z'),
      },
    ])

    const { buildChimmySportDataDigest } = await import('@/lib/chimmy/chimmy-sport-data-digest')
    const digest = await buildChimmySportDataDigest({
      sport: 'NFL',
      question: 'When is the NFL Draft?',
      includeNewsApi: false,
      timezone: 'America/New_York',
    })

    expect(digest.text).toContain('NFL Draft starts April 30, 2026 in Detroit.')
    expect(digest.sources).toContain('player_news_NFL')
    expect(digest.freshness.perSource.player_news_NFL).toBe('2026-04-25T12:00:00.000Z')
    expect(digest.freshness.overallLastSyncedAt).toBe('2026-04-25T12:00:00.000Z')
  })

  it('builds NBA tonight games context from seeded sportsGame fixtures', async () => {
    sportsGameFindManyMock.mockImplementation(async ({ where }: { where?: { sport?: string } }) => {
      if (where?.sport !== 'NBA') return []
      return [
        {
          awayTeam: 'Lakers',
          homeTeam: 'Celtics',
          awayScore: 0,
          homeScore: 0,
          status: 'Scheduled',
          startTime: new Date('2026-04-25T23:30:00.000Z'),
          updatedAt: new Date('2026-04-25T20:00:00.000Z'),
        },
      ]
    })

    const { buildChimmySportDataDigest } = await import('@/lib/chimmy/chimmy-sport-data-digest')
    const digest = await buildChimmySportDataDigest({
      sport: 'NBA',
      question: 'What NBA games are tonight?',
      includeNewsApi: false,
      timezone: 'America/New_York',
    })

    expect(digest.text).toContain('NBA — Upcoming/recent games (DB)')
    expect(digest.text).toContain('Lakers @ Celtics')
    expect(digest.sources).toContain('games_NBA')
    expect(digest.freshness.perSource.games_NBA).toBe('2026-04-25T20:00:00.000Z')
    expect(digest.freshness.overallLastSyncedAt).toBe('2026-04-25T20:00:00.000Z')
  })

  it('builds playoff series/record context from seeded standings cache fixtures', async () => {
    sportsDataCacheFindManyMock.mockResolvedValueOnce([
      {
        cacheKey: 'NBA:standings:east',
        data: {
          teamName: 'Boston Celtics',
          position: 1,
          won: 58,
          lost: 24,
        },
        updatedAt: new Date('2026-04-25T18:30:00.000Z'),
      },
      {
        cacheKey: 'NBA:standings:east',
        data: {
          teamName: 'New York Knicks',
          position: 2,
          won: 54,
          lost: 28,
        },
        updatedAt: new Date('2026-04-25T18:30:00.000Z'),
      },
    ])

    const { buildChimmySportDataDigest } = await import('@/lib/chimmy/chimmy-sport-data-digest')
    const digest = await buildChimmySportDataDigest({
      sport: 'NBA',
      question: 'What is the playoff series record for Knicks vs Celtics?',
      includeNewsApi: false,
      timezone: 'America/New_York',
    })

    expect(digest.text).toContain('NBA — Standings snapshot (DB)')
    expect(digest.text).toContain('Boston Celtics')
    expect(digest.text).toContain('New York Knicks')
    expect(digest.sources).toContain('standings_NBA')
    expect(digest.freshness.perSource.standings_NBA).toBe('2026-04-25T18:30:00.000Z')
    expect(digest.freshness.overallLastSyncedAt).toBe('2026-04-25T18:30:00.000Z')
  })
})
