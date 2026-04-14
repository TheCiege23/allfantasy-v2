// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

// Must use vi.hoisted so the references are available inside vi.mock factories
const mockQuery = vi.hoisted(() => vi.fn())
const mockSpawnSync = vi.hoisted(() => vi.fn())

vi.mock('../platform-backend/src/repositories/postgres/prisma-executor', () => ({
  createPrismaSqlExecutor: () => ({ query: mockQuery }),
}))

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>()
  return {
    ...actual,
    spawnSync: mockSpawnSync,
  }
})

vi.mock('dotenv', () => ({ config: vi.fn() }))

// Import after mocks are registered (vi.mock is hoisted above all imports)
import { main } from '../scripts/apply-af-foundation-if-needed'

const ALL_INDEXES = [
  'idx_af_domain_events_unpublished',
  'idx_af_domain_events_roster_latest',
  'idx_af_domain_events_roster_idempotency',
  'idx_af_job_runs_queue_status',
]

describe('apply-af-foundation-if-needed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSpawnSync.mockReturnValue({ status: 0 })
  })

  test('applies foundation SQL when tables are absent', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ afLeagues: null, hasLeagueStatusType: false }],
    })

    await main()

    expect(mockSpawnSync).toHaveBeenCalledTimes(1)
    expect(mockSpawnSync.mock.calls[0][1]).toContain('docs/backend/ALLFANTASY_BACKEND_FOUNDATION.sql')
  })

  test('applies only indexes when foundation present but indexes missing', async () => {
    // Preflight: tables exist
    mockQuery.mockResolvedValueOnce({
      rows: [{ afLeagues: 'af_leagues', hasLeagueStatusType: true }],
    })
    // Index check: only one of the four present
    mockQuery.mockResolvedValueOnce({
      rows: [{ indexname: 'idx_af_domain_events_roster_latest' }],
    })

    await main()

    expect(mockSpawnSync).toHaveBeenCalledTimes(1)
    expect(mockSpawnSync.mock.calls[0][1]).toContain('scripts/sql/platform-backend-indexes.sql')
    // Foundation SQL must NOT have been run
    expect(mockSpawnSync.mock.calls[0][1]).not.toContain('ALLFANTASY_BACKEND_FOUNDATION.sql')
  })

  test('skips all applies when foundation present and all indexes exist', async () => {
    // Preflight: tables exist
    mockQuery.mockResolvedValueOnce({
      rows: [{ afLeagues: 'af_leagues', hasLeagueStatusType: true }],
    })
    // Index check: all four present
    mockQuery.mockResolvedValueOnce({
      rows: ALL_INDEXES.map((indexname) => ({ indexname })),
    })

    await main()

    expect(mockSpawnSync).not.toHaveBeenCalled()
  })
})
