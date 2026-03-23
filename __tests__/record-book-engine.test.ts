import { beforeEach, describe, expect, it, vi } from 'vitest'

const detectRecordsMock = vi.fn()

const leagueFindUniqueMock = vi.fn()
const recordFindManyMock = vi.fn()
const recordUpsertMock = vi.fn()

vi.mock('@/lib/record-book-engine/RecordDetector', () => ({
  detectRecords: detectRecordsMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findUnique: leagueFindUniqueMock,
    },
    recordBookEntry: {
      findMany: recordFindManyMock,
      upsert: recordUpsertMock,
    },
  },
}))

describe('RecordBookEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses league sport fallback and creates missing entries', async () => {
    leagueFindUniqueMock.mockResolvedValue({ sport: 'NHL' })
    detectRecordsMock.mockImplementation(async (_leagueId: string, season: string) => {
      if (season === '2025') {
        return [
          {
            recordType: 'highest_score',
            holderId: 'mgr-1',
            value: 190.2,
            season: '2025',
          },
        ]
      }
      return []
    })
    recordFindManyMock.mockResolvedValue([])
    recordUpsertMock.mockResolvedValue({})

    const { runRecordBookEngine } = await import('@/lib/record-book-engine/RecordBookEngine')
    const result = await runRecordBookEngine('lg-1', ['2025'])

    expect(result).toMatchObject({
      leagueId: 'lg-1',
      entriesCreated: 1,
      entriesUpdated: 0,
    })
    expect(detectRecordsMock).toHaveBeenCalledWith('lg-1', '2025', { sport: 'NHL' })
    expect(recordUpsertMock).toHaveBeenCalledWith({
      where: {
        uniq_record_book_league_type_season: {
          leagueId: 'lg-1',
          recordType: 'highest_score',
          season: '2025',
        },
      },
      create: expect.objectContaining({
        sport: 'NHL',
        leagueId: 'lg-1',
        recordType: 'highest_score',
        holderId: 'mgr-1',
        value: 190.2,
        season: '2025',
      }),
      update: expect.objectContaining({
        sport: 'NHL',
        holderId: 'mgr-1',
        value: 190.2,
      }),
    })
  })

  it('normalizes explicit sport and updates sport on existing rows', async () => {
    leagueFindUniqueMock.mockResolvedValue({ sport: 'NFL' })
    detectRecordsMock.mockImplementation(async (_leagueId: string, season: string) => {
      if (season === '2024') {
        return [
          {
            recordType: 'best_draft_class',
            holderId: 'mgr-2',
            value: 97,
            season: '2024',
          },
        ]
      }
      return []
    })
    recordFindManyMock.mockResolvedValue([{ recordType: 'best_draft_class', season: '2024' }])
    recordUpsertMock.mockResolvedValue({})

    const { runRecordBookEngine } = await import('@/lib/record-book-engine/RecordBookEngine')
    const result = await runRecordBookEngine('lg-1', ['2024'], { sport: 'nba' })

    expect(result).toMatchObject({
      entriesCreated: 0,
      entriesUpdated: 1,
    })
    expect(detectRecordsMock).toHaveBeenCalledWith('lg-1', '2024', { sport: 'NBA' })
    expect(recordUpsertMock).toHaveBeenCalledWith({
      where: {
        uniq_record_book_league_type_season: {
          leagueId: 'lg-1',
          recordType: 'best_draft_class',
          season: '2024',
        },
      },
      create: expect.objectContaining({
        sport: 'NBA',
        leagueId: 'lg-1',
        recordType: 'best_draft_class',
        holderId: 'mgr-2',
        value: 97,
        season: '2024',
      }),
      update: { sport: 'NBA', holderId: 'mgr-2', value: 97 },
    })
  })
})
