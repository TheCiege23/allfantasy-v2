import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { IExternalLeagueMapper } from '../../mappers/ExternalLeagueMapper'
import type { NormalizedLeagueSettings } from '../../types'
import type { FantraxImportPayload } from './types'

export const FantraxLeagueMapper: IExternalLeagueMapper<FantraxImportPayload> = {
  map(source) {
    const inferredScoring =
      source.settings?.scoringType ??
      (source.league.isDevy ? 'devy' : source.league.sport === 'NCAAF' ? 'college' : null)

    return {
      name: source.league.name,
      sport: normalizeToSupportedSport(source.league.sport),
      season: source.league.season,
      leagueSize: source.league.size,
      rosterSize:
        source.settings?.rosterPositions.length != null
          ? source.settings.rosterPositions.reduce((total, slot) => total + Math.max(0, slot.count), 0)
          : null,
      scoring: inferredScoring,
      isDynasty: source.league.isDevy,
      playoff_team_count: undefined,
      regular_season_length: source.schedule.length > 0 ? source.schedule.length : undefined,
      schedule_unit: 'week',
      matchup_frequency: 'head_to_head',
      waiver_type: undefined,
      faab_budget: null,
      roster_positions: source.settings?.rosterPositions.map((slot) => `${slot.position}:${slot.count}`) ?? [],
      fantrax_settings: source.settings?.raw ?? null,
    } satisfies NormalizedLeagueSettings
  },
}
