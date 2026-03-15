import type { IExternalLeagueMapper } from '../../mappers/ExternalLeagueMapper'
import type { NormalizedLeagueSettings } from '../../types'
import type { SleeperImportPayload } from './types'

export const SleeperLeagueMapper: IExternalLeagueMapper<SleeperImportPayload> = {
  map(source) {
    const league = source.league
    if (!league) return null
    const seasonNum = league.season ? parseInt(league.season, 10) : null
    const rosterCount = league.total_rosters ?? league.settings?.num_teams ?? 0
    const type = league.settings?.type
    const isDynasty = type === 2
    const rosterPositions = league.roster_positions ?? []
    const rosterSize = rosterPositions.length || null
    const ppr = league.scoring_settings?.rec ?? 0
    const superflex = rosterPositions.filter((p: string) => p === 'SUPER_FLEX').length > 0
    const tep = league.scoring_settings?.bonus_rec_te ?? 0
    const scoring = [ppr > 0 && 'PPR', superflex && 'Superflex', tep > 0 && 'TEP'].filter(Boolean).join(' ') || 'Standard'
    return {
      name: league.name || 'Imported League',
      sport: league.sport === 'nfl' ? 'NFL' : (league.sport?.toUpperCase?.() || 'NFL'),
      season: Number.isNaN(seasonNum) ? null : seasonNum,
      leagueSize: rosterCount,
      rosterSize,
      scoring: scoring || null,
      isDynasty,
      playoff_team_count: league.settings?.playoff_teams ?? undefined,
      regular_season_length: 14,
      schedule_unit: 'week',
      matchup_frequency: 'weekly',
      roster_positions: rosterPositions,
      scoring_settings: league.scoring_settings,
      avatar: league.avatar,
    }
  },
}
