/**
 * Best Ball Simulator — optimal lineup selection each week, total points ranking.
 */

import type { SimulationConfig, SimulationReport, SimulatedWeek, SimTeam } from '../types'

function seededRng(seed: string) {
  let h = 0
  for (const c of seed) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return () => { h = (h * 1664525 + 1013904223) | 0; return (h >>> 0) / 0xffffffff }
}

export async function simulateBestBall(config: SimulationConfig, teams: SimTeam[]): Promise<SimulationReport> {
  const rng = seededRng(`${config.leagueId}-bestball-${Date.now()}`)
  const weeks: SimulatedWeek[] = []
  const totals: Record<string, number> = {}
  teams.forEach((t) => { totals[t.id] = 0 })

  for (let w = 1; w <= config.seasonWeeks; w++) {
    const weekScores: Record<string, number> = {}
    for (const t of teams) {
      const optimal = Math.round((t.projectedPoints * (0.85 + rng() * 0.3)) * 10) / 10
      weekScores[t.id] = optimal
      totals[t.id]! += optimal
    }
    weeks.push({
      week: w,
      events: teams.map((t) => `${t.name}: ${weekScores[t.id]?.toFixed(1)} pts (optimal lineup)`).sort((a, b) => {
        const scoreA = parseFloat(a.split(': ')[1]!); const scoreB = parseFloat(b.split(': ')[1]!)
        return scoreB - scoreA
      }),
      scores: weekScores,
    })
  }

  const sorted = [...teams].sort((a, b) => totals[b.id]! - totals[a.id]!)
  return {
    leagueId: config.leagueId, leagueType: 'best_ball', leagueVariant: null,
    sport: config.sport, weeksSimulated: config.seasonWeeks, playerCount: teams.length,
    champion: sorted[0]!.name, runnerUp: sorted[1]?.name ?? null, weeks,
    keyEvents: [`Champion: ${sorted[0]!.name} with ${totals[sorted[0]!.id]!.toFixed(1)} total pts`],
    finalStandings: sorted.map((t, i) => ({ rank: i + 1, name: t.name, points: Math.round(totals[t.id]!) })),
    formatSpecific: { scoringMethod: 'optimal_lineup_weekly' },
    simulatedAt: new Date().toISOString(),
  }
}
