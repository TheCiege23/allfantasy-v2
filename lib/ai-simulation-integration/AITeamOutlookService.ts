/**
 * AITeamOutlookService — combined season forecast + dynasty outlook for a team/league.
 */

import { getSeasonForecast } from '@/lib/season-forecast/SeasonForecastEngine'
import { getDynastyProjectionsForLeague } from '@/lib/dynasty-engine/DynastyQueryService'

export async function getTeamOutlookSummary(
  leagueId: string,
  teamId: string,
  season: number,
  week: number
): Promise<{ playoffOdds?: number; championshipOdds?: number; dynasty3yr?: number; dynasty5yr?: number; rebuildProb?: number }> {
  const [forecast, dynastyList] = await Promise.all([
    getSeasonForecast(leagueId, season, week),
    getDynastyProjectionsForLeague(leagueId),
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
