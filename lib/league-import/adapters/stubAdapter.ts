import type { ILeagueImportAdapter } from './ILeagueImportAdapter'
import type { NormalizedImportResult } from '../types'
import type { ImportProvider } from '../types'

function createStubAdapter(provider: ImportProvider): ILeagueImportAdapter<unknown> {
  return {
    provider,
    async normalize() {
      const result: NormalizedImportResult = {
        source: {
          source_provider: provider,
          source_league_id: 'stub',
          imported_at: new Date().toISOString(),
        },
        league: {
          name: `[${provider.toUpperCase()} import not implemented]`,
          sport: 'NFL',
          season: null,
          leagueSize: 0,
          rosterSize: null,
          scoring: null,
          isDynasty: false,
        },
        rosters: [],
        scoring: null,
        schedule: [],
        draft_picks: [],
        transactions: [],
        standings: [],
        player_map: {},
        coverage: {
          leagueSettings: {
            state: 'partial',
            count: 1,
            note: `${provider.toUpperCase()} import is not implemented yet.`,
          },
          currentRosters: {
            state: 'missing',
            note: 'No roster import adapter is implemented for this provider yet.',
          },
          historicalRosterSnapshots: {
            state: 'missing',
            note: 'Historical roster snapshots are not implemented for this provider yet.',
          },
          scoringSettings: {
            state: 'missing',
            note: 'Scoring settings import is not implemented for this provider yet.',
          },
          playoffSettings: {
            state: 'missing',
            note: 'Playoff settings import is not implemented for this provider yet.',
          },
          currentStandings: {
            state: 'missing',
            note: 'Standings import is not implemented for this provider yet.',
          },
          currentSchedule: {
            state: 'missing',
            note: 'Schedule import is not implemented for this provider yet.',
          },
          draftHistory: {
            state: 'missing',
            note: 'Draft history import is not implemented for this provider yet.',
          },
          tradeHistory: {
            state: 'missing',
            note: 'Trade history import is not implemented for this provider yet.',
          },
          previousSeasons: {
            state: 'missing',
            note: 'Previous season discovery is not implemented for this provider yet.',
          },
          playerIdentityMap: {
            state: 'missing',
            note: 'Player identity mapping is not implemented for this provider yet.',
          },
        },
      }
      return result
    },
  }
}

export const EspnStubAdapter = createStubAdapter('espn')
export const YahooStubAdapter = createStubAdapter('yahoo')
export const FantraxStubAdapter = createStubAdapter('fantrax')
export const MflStubAdapter = createStubAdapter('mfl')
