import { describe, expect, it } from 'vitest'
import { RollingInsightsLiveProvider } from '@/lib/live/rollingInsightsLiveProvider'

const PAYLOAD = {
  data: {
    NFL: [
      {
        game_ID: 'G1',
        game_status: 'In Progress',
        away_team_name: 'Washington Commanders',
        home_team_name: 'Miami Dolphins',
        full_box: {
          current: { Quarter: 'Q2', RedZone: true },
          away_team: { abbrv: 'WAS', score: 13, team_stats: { sacks: 3, defense_touchdowns: 1, points_against_defense_special_teams: 16 } },
          home_team: { abbrv: 'MIA', score: 10, team_stats: { sacks: 1, defense_touchdowns: 0, points_against_defense_special_teams: 13 } },
        },
        player_box: {
          away_team: { '8735': { player: 'RB One', position: 'RB', rushing_touchdowns: 1, rushing_yards: 58 } },
          home_team: { '143': { player: 'QB One', position: 'QB', passing_yards: 213 } },
        },
      },
    ],
  },
}

function providerWith(responses: Array<{ status: number; body?: unknown }>) {
  let i = 0
  const calls: string[] = []
  const p = new RollingInsightsLiveProvider({
    token: 'test-token',
    fetchImpl: async (url: string) => {
      calls.push(url)
      const r = responses[Math.min(i++, responses.length - 1)]
      return { status: r.status, json: async () => r.body ?? null }
    },
  })
  return { p, calls }
}

const Q = { sport: 'NFL', season: 2026, week: 1 }

describe('RollingInsightsLiveProvider', () => {
  it('refuses to construct without the NFL token', () => {
    const prev = process.env.ROLLING_INSIGHTS_RSC_TOKEN
    delete process.env.ROLLING_INSIGHTS_RSC_TOKEN
    // Failing loudly beats silently 304-ing forever on the wrong credential.
    expect(() => new RollingInsightsLiveProvider({})).toThrow(/RSC_TOKEN/)
    if (prev) process.env.ROLLING_INSIGHTS_RSC_TOKEN = prev
  })

  it('always calls https, never cleartext', () => {
    const { p, calls } = providerWith([{ status: 200, body: PAYLOAD }])
    return p.fetchActiveGames(Q).then(() => {
      expect(calls[0]).toMatch(/^https:\/\//)
    })
  })

  it('returns active games from a 200', async () => {
    const { p } = providerWith([{ status: 200, body: PAYLOAD }])
    const games = await p.fetchActiveGames(Q)
    expect(games).toHaveLength(1)
    expect(games[0].gameId).toBe('G1')
  })

  it('serves the cached read on 304 instead of an empty slate', async () => {
    // An empty result would read as "no games" and silently stall scoring —
    // the opposite of what 304 means.
    const { p } = providerWith([{ status: 200, body: PAYLOAD }, { status: 304 }])
    const first = await p.fetchActiveGames(Q)
    expect(first).toHaveLength(1)
    const second = await p.fetchActiveGames(Q)
    expect(second).toHaveLength(1)
  })

  it('falls back to the last good read on a provider error', async () => {
    const { p } = providerWith([{ status: 200, body: PAYLOAD }, { status: 500 }])
    await p.fetchActiveGames(Q)
    const afterError = await p.fetchActiveGames(Q)
    expect(afterError).toHaveLength(1)
  })

  it('scopes player stats to the requested roster, never the whole league', async () => {
    const { p } = providerWith([{ status: 200, body: PAYLOAD }])
    const games = await p.fetchActiveGames(Q)
    const stats = await p.fetchPlayerStatsForGames({ ...Q, games, playerIds: ['8735'] })
    expect([...stats.keys()]).toEqual(['8735'])
    expect(stats.get('8735')?.rushing_touchdowns).toBe(1)
  })

  it('returns REAL team defence from full_box.team_stats', async () => {
    // This previously returned an empty map because only player_box had been
    // inspected. DEF slots would have scored zero behind a comment saying that
    // was intentional.
    const { p } = providerWith([{ status: 200, body: PAYLOAD }])
    const games = await p.fetchActiveGames(Q)
    const def = await p.fetchTeamDefenseStatsForGames({ ...Q, games })
    expect(def.size).toBe(2)
    expect(def.get('nfl:def:WAS')?.sacks).toBe(3)
    expect(def.get('nfl:def:WAS')?.defense_touchdowns).toBe(1)
    expect(def.get('nfl:def:MIA')?.points_against_defense_special_teams).toBe(13)
  })

  it('fills real team abbreviations from full_box', async () => {
    const { p } = providerWith([{ status: 200, body: PAYLOAD }])
    const games = await p.fetchActiveGames(Q)
    expect(games[0].awayTeam).toBe('WAS')
    expect(games[0].homeTeam).toBe('MIA')
  })
})
