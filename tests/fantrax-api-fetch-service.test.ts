import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchFantraxApiLeagueForImport,
  FantraxApiImportError,
  parseFantraxApiSource,
} from '@/lib/league-import/fantrax/FantraxApiFetchService'

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

afterEach(() => vi.unstubAllGlobals())

describe('Fantrax REST import', () => {
  it('recognizes real league IDs and URLs while retaining the CSV snapshot path', () => {
    expect(parseFantraxApiSource('NCAAF:abcdefghijklmnop')).toEqual({
      leagueId: 'abcdefghijklmnop',
      sport: 'NCAAF',
    })
    expect(parseFantraxApiSource('https://www.fantrax.com/fantasy/league/abcdefghijklmnop/rules')).toEqual({
      leagueId: 'abcdefghijklmnop',
      sport: null,
    })
    expect(parseFantraxApiSource('id:00000000-0000-4000-8000-000000000000')).toBeNull()
    expect(parseFantraxApiSource('username|2026|League')).toBeNull()
  })

  it('imports every team roster and preserves format, scoring, and draft source data', async () => {
    const fetcher = vi.fn(async (url: URL) => {
      const endpoint = url.pathname.split('/').pop()
      if (endpoint === 'getLeagueInfo') return response({
        leagueName: 'College Custom League',
        sport: 'NCAAF',
        seasonYear: 2026,
        teamInfo: {
          t1: { id: 't1', name: 'Alpha' },
          t2: { id: 't2', name: 'Beta' },
        },
        playerInfo: {
          p1: { eligiblePos: 'QB', status: 'ACTIVE' },
          p2: { eligiblePos: 'RB', status: 'ACTIVE' },
        },
        rosterInfo: { maxTotalPlayers: 24, positionConstraints: { QB: { maxActive: 2 } } },
        scoringSystem: {
          type: 'HEAD_TO_HEAD_POINTS_BASED',
          scoringCategorySettings: [{
            configs: [{ position: { code: 'QB' }, scoringCategory: { code: 'PASS_TD' }, points: 6 }],
          }],
        },
        playoffs: { numPlayoffTeams: 4 },
        matchups: [{ period: 1, matchupList: [{ away: { id: 't1' }, home: { id: 't2' } }] }],
      })
      if (endpoint === 'getTeamRosters') return response({
        period: 3,
        rosters: {
          t1: { teamName: 'Alpha', rosterItems: [{ id: 'p1', position: 'QB', status: 'ACTIVE' }] },
          t2: { teamName: 'Beta', rosterItems: [{ id: 'p2', position: 'RB', status: 'RESERVE' }] },
        },
      })
      if (endpoint === 'getStandings') return response({
        items: [
          { teamId: 't1', rank: 1, wins: 2, losses: 0, pointsFor: 130 },
          { teamId: 't2', rank: 2, wins: 0, losses: 2, pointsFor: 90 },
        ],
      })
      if (endpoint === 'getDraftResults') return response({
        draftState: 'completed',
        draftPicks: [{ round: 1, pick: 1, teamId: 't1', playerId: 'p1' }],
      })
      if (endpoint === 'getPlayerIds') return response({
        p1: { name: 'Quarterback One', position: 'QB', team: 'T1' },
        p2: { name: 'Running Back Two', position: 'RB', team: 'T2' },
      })
      throw new Error('unexpected endpoint')
    })
    vi.stubGlobal('fetch', fetcher)

    const result = await fetchFantraxApiLeagueForImport('abcdefghijklmnop', {
      leagueId: 'abcdefghijklmnop',
      sport: null,
    })
    expect(result.league.sport).toBe('NCAAF')
    expect(result.teams).toHaveLength(2)
    expect(result.teams[0].rosterPlayerIds).toEqual(['p1'])
    expect(result.teams[1].rosterPlayerIds).toEqual(['p2'])
    expect(result.playerMap.p2.name).toBe('Running Back Two')
    expect(result.settings?.scoringType).toBe('HEAD_TO_HEAD_POINTS_BASED')
    expect(result.settings?.scoringRules).toEqual([{ statKey: 'PASS_TD:QB', points: 6 }])
    expect(result.settings?.raw.playoffs).toEqual({ numPlayoffTeams: 4 })
    expect(result.settings?.rosterPositions).toEqual([])
    expect(result.draftPicks[0].playerId).toBe('p1')
    expect(result.schedule[0].matchups).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledTimes(5)
  })

  it('stops when Fantrax returns an empty roster response', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
      if (url.pathname.endsWith('getLeagueInfo')) return response({
        leagueName: 'No Rosters',
        sport: 'NFL',
        teamInfo: { t1: { name: 'Alpha' } },
      })
      if (url.pathname.endsWith('getTeamRosters')) return response({ rosters: {} })
      return response({})
    }))
    await expect(fetchFantraxApiLeagueForImport('abcdefghijklmnop', {
      leagueId: 'abcdefghijklmnop',
      sport: null,
    })).rejects.toBeInstanceOf(FantraxApiImportError)
  })

  it('rejects unsupported sports rather than silently creating an NFL league', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({
      leagueName: 'Racing League',
      sport: 'NASCAR',
      teamInfo: { t1: { name: 'Alpha' } },
    })))
    await expect(fetchFantraxApiLeagueForImport('abcdefghijklmnop', {
      leagueId: 'abcdefghijklmnop',
      sport: null,
    })).rejects.toThrow('NASCAR leagues are not supported')
  })
})
