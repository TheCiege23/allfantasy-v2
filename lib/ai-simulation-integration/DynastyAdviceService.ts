/**
 * DynastyAdviceService — dynasty projection summary for AI advice.
 */

import { getDynastyProjection, getDynastyProjectionsForLeague } from '@/lib/dynasty-engine/DynastyQueryService'
import { formatRosterStrength } from './AIProjectionInterpreter'

export async function getDynastyAdviceSummaryForLeague(
  leagueId: string,
  sport: string
): Promise<string> {
  const projections = await getDynastyProjectionsForLeague(leagueId, sport)
  if (!projections.length) return ''
  const lines = projections.slice(0, 6).map(
    (p) => `Team ${p.teamId}: 3yr ${p.rosterStrength3Year?.toFixed(0)}, 5yr ${p.rosterStrength5Year?.toFixed(0)}, rebuild ${p.rebuildProbability?.toFixed(0)}%, championship window ${p.championshipWindowScore?.toFixed(0)}`
  )
  return lines.join('; ')
}

export async function getDynastyAdviceForTeam(
  leagueId: string,
  teamId: string
): Promise<string> {
  const p = await getDynastyProjection(leagueId, teamId)
  if (!p) return ''
  return formatRosterStrength(p.rosterStrength3Year, p.rosterStrength5Year, p.sport) +
    ` Rebuild probability: ${Math.round(p.rebuildProbability)}%. Championship window score: ${Math.round(p.championshipWindowScore)}.`
}
