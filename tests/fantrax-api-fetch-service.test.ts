import { afterEach, describe, expect, it, vi } from 'vitest'
import { FantraxAdapter } from '@/lib/league-import/adapters/fantrax/FantraxAdapter'
import { buildImportedLeaguePreview } from '@/lib/league-import/ImportedLeaguePreviewBuilder'
import { validateNormalizedImport } from '@/lib/league-import/importValidationService'
import {
  fetchFantraxApiLeagueForImport,
  fetchFantraxPlayerPoolPage,
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
    const fetcher = vi.fn(async (url: URL, _init?: RequestInit) => {
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
          t1: { teamName: 'Alpha', rosterItems: [{ id: 'p1', position: 'QB', status: 'ACTIVE', salary: 12 }] },
          t2: { teamName: 'Beta', rosterItems: [{ id: 'p2', position: 'RB', status: 'RESERVE' }] },
        },
      })
      if (endpoint === 'getStandings') return response([
        { teamId: 't1', rank: 1, points: '2-0-0', totalPointsFor: 130 },
        { teamId: 't2', rank: 2, points: '0-2-0', totalPointsFor: 90 },
      ])
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
    expect(result.teams[0].wins).toBe(2)
    expect(result.teams[1].losses).toBe(2)
    expect(result.teams[0].pointsFor).toBe(130)
    expect(result.settings?.raw.standingsAvailable).toBe(true)
    expect(result.playerMap.p2.name).toBe('Running Back Two')
    expect(result.settings?.scoringType).toBe('HEAD_TO_HEAD_POINTS_BASED')
    expect(result.settings?.scoringRules).toEqual([{ statKey: 'PASS_TD:QB', points: 6 }])
    expect(result.settings?.raw.playoffs).toEqual({ numPlayoffTeams: 4 })
    expect(result.settings?.raw.sourceRosterExtras).toMatchObject({ t1: [{ salary: 12 }] })
    expect(result.settings?.raw.warnings).toContain('Extra Fantrax roster item fields were preserved; salary and contract rules require commissioner review.')
    expect(result.settings?.rosterPositions).toEqual([])
    expect(result.draftPicks[0].playerId).toBe('p1')
    expect(result.schedule[0].matchups).toHaveLength(1)
    const normalized = await FantraxAdapter.normalize(result)
    expect(normalized.rosters.map((roster) => roster.player_ids)).toEqual([['p1'], ['p2']])
    expect(normalized.league.rosterSize).toBe(24)
    expect(normalized.league.playoff_team_count).toBe(4)
    expect(normalized.league.matchup_frequency).toBe('head_to_head')
    expect(normalized.coverage.leagueSettings.state).toBe('partial')
    expect(fetcher).toHaveBeenCalledTimes(5)
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ 'User-Agent': 'AllFantasyLeagueImport/1.0' })
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

  it('retrieves league-specific waiver players with directory names and pagination', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
      if (url.pathname.endsWith('getLeagueInfo')) return response({
        leagueName: 'Road To Glory NFL',
        playerInfo: {
          p1: { status: 'WW', eligiblePos: 'QB' },
          p2: { status: 'WW', eligiblePos: 'RB' },
          p3: { status: 'FA', eligiblePos: 'WR' },
          p4: { status: 'T', eligiblePos: 'TE' },
        },
      })
      return response({
        p1: { name: 'Quarterback One', position: 'QB', team: 'A' },
        p2: { name: 'Running Back Two', position: 'RB', team: 'B' },
        p3: { name: 'Receiver Three', position: 'WR', team: 'C' },
      })
    }))
    const page = await fetchFantraxPlayerPoolPage('abcdefghijklmnop', 'NFL', {
      status: 'WW',
      page: 1,
      limit: 1,
      search: 'quarterback',
    })
    expect(page.counts).toEqual({ WW: 2, FA: 1 })
    expect(page.total).toBe(1)
    expect(page.players).toEqual([{
      id: 'p1',
      name: 'Quarterback One',
      position: 'QB',
      team: 'A',
      status: 'WW',
    }])
  })

  it('previews an undrafted league and reports its waiver and free-agent counts', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
      const endpoint = url.pathname.split('/').pop()
      if (endpoint === 'getLeagueInfo') return response({
        leagueName: 'Road To Glory NFL',
        seasonYear: 2026,
        teamInfo: { t1: { name: 'Alpha' }, t2: { name: 'Beta' } },
        playerInfo: {
          p1: { status: 'WW', eligiblePos: 'QB' },
          p2: { status: 'FA', eligiblePos: 'RB' },
        },
        scoringSystem: { type: 'HEAD_TO_HEAD_POINTS_BASED' },
      })
      if (endpoint === 'getTeamRosters') return response({
        period: 8,
        rosters: {
          t1: { teamName: 'Alpha', rosterItems: [] },
          t2: { teamName: 'Beta', rosterItems: [] },
        },
      })
      if (endpoint === 'getDraftResults') return response({
        draftState: 'running',
        draftPicks: [{ round: 1, pick: 1, teamId: 't1', playerId: null }],
      })
      if (endpoint === 'getStandings') return response([
        { teamId: 't1', rank: 1, points: '0-0-0' },
        { teamId: 't2', rank: 2, points: '0-0-0' },
      ])
      return response({})
    }))
    const result = await fetchFantraxApiLeagueForImport('NFL:abcdefghijklmnop', {
      leagueId: 'abcdefghijklmnop',
      sport: 'NFL',
    })
    expect(result.settings?.raw.preDraft).toBe(true)
    expect(result.settings?.raw.playerPoolStatusCounts).toEqual({ WW: 1, FA: 1 })
    expect(result.teams[0].rosterPlayerIds).toEqual([])
    expect(result.draftPicks).toEqual([])
    const normalized = await FantraxAdapter.normalize(result)
    expect(normalized.coverage.currentRosters.state).toBe('missing')
    expect(validateNormalizedImport(normalized)).toEqual({ ok: true })
    const preview = buildImportedLeaguePreview(normalized)
    expect(preview.availablePlayerCounts).toEqual({ waiverWire: 1, freeAgents: 1 })
  })

  it('rejects a league whose API lists teams but no rostered players', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
      if (url.pathname.endsWith('getLeagueInfo')) return response({
        leagueName: 'Rosterless League',
        sport: 'NFL',
        teamInfo: { t1: { name: 'Alpha' } },
      })
      if (url.pathname.endsWith('getTeamRosters')) return response({
        period: 8,
        rosters: { t1: { teamName: 'Alpha', rosterItems: [] } },
      })
      return response([])
    }))
    await expect(fetchFantraxApiLeagueForImport('NFL:abcdefghijklmnop', {
      leagueId: 'abcdefghijklmnop',
      sport: 'NFL',
    })).rejects.toThrow('no rostered players')
  })

  it('rejects leagues beyond the current 32-team play limit', async () => {
    const teamInfo = Object.fromEntries(
      Array.from({ length: 33 }, (_, index) => [`t${index}`, { name: `Team ${index}` }])
    )
    const fetcher = vi.fn(async () => response({
      leagueName: 'Mega League',
      teamInfo,
    }))
    vi.stubGlobal('fetch', fetcher)
    await expect(fetchFantraxApiLeagueForImport('EPL:abcdefghijklmnop', {
      leagueId: 'abcdefghijklmnop',
      sport: 'EPL',
    })).rejects.toThrow('supports up to 32')
    expect(fetcher).toHaveBeenCalledTimes(1)
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
