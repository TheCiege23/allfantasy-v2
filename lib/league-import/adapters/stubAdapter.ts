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
      }
      return result
    },
  }
}

export const EspnStubAdapter = createStubAdapter('espn')
export const YahooStubAdapter = createStubAdapter('yahoo')
export const FantraxStubAdapter = createStubAdapter('fantrax')
export const MflStubAdapter = createStubAdapter('mfl')
