import { describe, it, expect, vi, beforeEach } from 'vitest'

// Player map fetch is out of scope for these reliability tests.
vi.mock('@/lib/sleeper-client', () => ({ getAllPlayers: vi.fn(async () => ({})) }))

function jsonRes(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

const BASE = 'https://api.sleeper.app/v1'

describe('fetchSleeperLeagueForImport reliability (Phase 2.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records a warning (never silent) when a matchup week fails after retries', async () => {
    const calls: Record<string, number> = {}
    global.fetch = vi.fn(async (input: unknown) => {
      const url = String(input)
      calls[url] = (calls[url] ?? 0) + 1
      if (url === `${BASE}/league/L1`) {
        return jsonRes({ league_id: 'L1', season: '2025', previous_league_id: null })
      }
      if (url.includes('/users')) return jsonRes([])
      if (url.includes('/rosters')) return jsonRes([])
      if (url.includes('/drafts')) return jsonRes([])
      if (url.includes('/matchups/3')) return jsonRes(null, 500) // persistent 5xx → retried → warning
      if (url.includes('/matchups/')) return jsonRes([])
      if (url.includes('/transactions/')) return jsonRes([])
      return jsonRes(null, 404)
    }) as unknown as typeof fetch

    const { fetchSleeperLeagueForImport } = await import(
      '@/lib/league-import/sleeper/SleeperLeagueFetchService'
    )
    const result = await fetchSleeperLeagueForImport('L1', {
      maxMatchupWeeks: 4,
      maxTransactionWeeks: 4,
      maxPreviousSeasons: 0,
    })

    expect(result).not.toBeNull()
    expect(result!.fetchWarnings?.some((w) => w.includes('matchups week 3'))).toBe(true)
    // proves retry: week 3 was attempted the full 3 times
    expect(calls[`${BASE}/league/L1/matchups/3`]).toBe(3)
  }, 20000)

  it('retries a transient failure then succeeds with NO warning', async () => {
    let usersAttempts = 0
    global.fetch = vi.fn(async (input: unknown) => {
      const url = String(input)
      if (url === `${BASE}/league/L1`) {
        return jsonRes({ league_id: 'L1', season: '2025', previous_league_id: null })
      }
      if (url.includes('/users')) {
        usersAttempts++
        if (usersAttempts < 2) throw new Error('ECONNRESET')
        return jsonRes([{ user_id: 'u1' }])
      }
      if (url.includes('/rosters')) return jsonRes([])
      if (url.includes('/drafts')) return jsonRes([])
      return jsonRes([])
    }) as unknown as typeof fetch

    const { fetchSleeperLeagueForImport } = await import(
      '@/lib/league-import/sleeper/SleeperLeagueFetchService'
    )
    const result = await fetchSleeperLeagueForImport('L1', {
      maxMatchupWeeks: 1,
      maxTransactionWeeks: 1,
      maxPreviousSeasons: 0,
    })

    expect(result!.users).toEqual([{ user_id: 'u1' }])
    expect(result!.fetchWarnings).toBeUndefined()
    expect(usersAttempts).toBe(2) // failed once, retried, succeeded
  }, 20000)

  it('treats 404 weeks as legitimate no-data — no warning, does not mark data incomplete', async () => {
    global.fetch = vi.fn(async (input: unknown) => {
      const url = String(input)
      if (url === `${BASE}/league/L1`) {
        return jsonRes({ league_id: 'L1', season: '2025', previous_league_id: null })
      }
      if (url.includes('/matchups/')) return jsonRes(null, 404)
      if (url.includes('/transactions/')) return jsonRes([])
      return jsonRes([])
    }) as unknown as typeof fetch

    const { fetchSleeperLeagueForImport } = await import(
      '@/lib/league-import/sleeper/SleeperLeagueFetchService'
    )
    const result = await fetchSleeperLeagueForImport('L1', {
      maxMatchupWeeks: 3,
      maxTransactionWeeks: 3,
      maxPreviousSeasons: 0,
    })

    expect(result!.fetchWarnings).toBeUndefined()
  }, 20000)
})
