/**
 * MatchupPredictionService — matchup win probability and expected score for AI.
 * Queries simulation engine / matchup API or persisted MatchupSimulationResult.
 */

import { getLatestMatchupSimulationsForLeague } from '@/lib/simulation-engine/SimulationQueryService'
import { formatWinProbability } from './AIProjectionInterpreter'

export async function getMatchupPredictionSummary(
  leagueId: string,
  weekOrPeriod: number,
  sport: string
): Promise<string> {
  const results = await getLatestMatchupSimulationsForLeague(leagueId, weekOrPeriod, 10)
  if (!results.length) return ''
  const lines = results.slice(0, 5).map((m) => {
    const pctA = Math.round((m.winProbabilityA ?? 0) * 100)
    return `Matchup: ${pctA}% vs ${100 - pctA}% (expected score ${m.expectedScoreA?.toFixed(0)}–${m.expectedScoreB?.toFixed(0)})`
  })
  return lines.join('; ')
}

export function formatMatchupPredictionForAI(winProbabilityPct: number, sport: string): string {
  return formatWinProbability(winProbabilityPct, sport)
}
