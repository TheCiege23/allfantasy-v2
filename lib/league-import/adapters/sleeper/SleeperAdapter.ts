import type { ILeagueImportAdapter } from '../ILeagueImportAdapter'
import type { NormalizedImportResult, SourceTracking } from '../../types'
import { SleeperLeagueMapper } from './SleeperLeagueMapper'
import { SleeperRosterMapper } from './SleeperRosterMapper'
import { SleeperScoringMapper } from './SleeperScoringMapper'
import { SleeperScheduleMapper } from './SleeperScheduleMapper'
import { SleeperHistoryMapper } from './SleeperHistoryMapper'
import type { SleeperImportPayload } from './types'

export const SleeperAdapter: ILeagueImportAdapter<SleeperImportPayload> = {
  provider: 'sleeper',

  async normalize(raw) {
    const importBatchId = `sleeper-${raw.league?.league_id ?? 'unknown'}-${Date.now()}`
    const source: SourceTracking = {
      source_provider: 'sleeper',
      source_league_id: raw.league?.league_id ?? '',
      source_season_id: raw.league?.season ?? undefined,
      import_batch_id: importBatchId,
      imported_at: new Date().toISOString(),
    }

    const league = SleeperLeagueMapper.map(raw)
    const rosters = SleeperRosterMapper.map(raw)
    const scoring = SleeperScoringMapper.map(raw)
    const schedule = SleeperScheduleMapper.map(raw)
    const history = SleeperHistoryMapper.map(raw)

    const result: NormalizedImportResult = {
      source,
      league: league ?? {
        name: raw.league?.name ?? 'Imported League',
        sport: 'NFL',
        season: raw.league?.season ? parseInt(raw.league.season, 10) : null,
        leagueSize: raw.league?.total_rosters ?? 0,
        rosterSize: null,
        scoring: null,
        isDynasty: false,
      },
      rosters,
      scoring: scoring ?? null,
      schedule,
      draft_picks: history.draft_picks,
      transactions: history.transactions,
      standings: history.standings,
      player_map: raw.playerMap ?? {},
      league_branding: raw.league?.avatar
        ? { avatar_url: `https://sleepercdn.com/avatars/thumbs/${raw.league.avatar}` }
        : undefined,
      previous_seasons: raw.previousSeasons?.map((s) => ({
        season: s.season,
        source_league_id: s.league.league_id,
      })),
    }
    return result
  },
}
