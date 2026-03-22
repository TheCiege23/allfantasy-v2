/**
 * AITeamOutlookService — combined season forecast + dynasty outlook for a team/league.
 */

import { getSeasonForecast } from '@/lib/season-forecast/SeasonForecastEngine'
import { getDynastyProjectionsForLeague } from '@/lib/dynasty-engine/DynastyQueryService'
import { getLeagueSport } from './AISimulationQueryService'

export async function getTeamOutlookSummary(
  leagueId: string,
  teamId: string,
  season: number,
  week: number
): Promise<{ playoffOdds?: number; championshipOdds?: number; dynasty3yr?: number; dynasty5yr?: number; rebuildProb?: number }> {
  const sport = await getLeagueSport(leagueId).catch(() => null)
  const [forecast, dynastyList] = await Promise.all([
    getSeasonForecast(leagueId, season, week),
    getDynastyProjectionsForLeague(leagueId, sport ?? undefined),
  ])
  const teamForecast = forecast?.find((t) => t.teamId === teamId)
  const dynasty = dynastyList.find((d) => d.teamId === teamId)
  return {
    playoffOdds: teamForecast?.playoffProbability,
    championshipOdds: teamForecast?.championshipProbability,
    dynasty3yr: dynasty?.rosterStrength3Year,
    dynasty5yr: dynasty?.rosterStrength5Year,
    rebuildProb: dynasty?.rebuildProbability,
  }
}
