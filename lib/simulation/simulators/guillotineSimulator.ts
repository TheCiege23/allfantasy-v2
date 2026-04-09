/**
 * Guillotine League Simulator — lowest scorer eliminated each week.
 */

import type { SimulationConfig, SimulationReport, SimulatedWeek, SimTeam } from '../types'

function seededRng(seed: string) {
  let h = 0
  for (const c of seed) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return () => { h = (h * 1664525 + 1013904223) | 0; return (h >>> 0) / 0xffffffff }
}

export async function simulateGuillotine(config: SimulationConfig, teams: SimTeam[]): Promise<SimulationReport> {
  const rng = seededRng(`${config.leagueId}-guillotine-${Date.now()}`)
  const weeks: SimulatedWeek[] = []
  const keyEvents: string[] = []
  let active = [...teams]
  const eliminationOrder: string[] = []

  for (let w = 1; active.length > 1; w++) {
    const weekScores: Record<string, number> = {}
    const events: string[] = []

    for (const t of active) {
      weekScores[t.id] = Math.round((t.projectedPoints + (rng() - 0.5) * 60) * 10) / 10
    }

    const sorted = [...active].sort((a, b) => (weekScores[a.id] ?? 0) - (weekScores[b.id] ?? 0))
    const eliminated = sorted[0]!
    active = active.filter((t) => t.id !== eliminated.id)
    eliminationOrder.push(eliminated.name)

    events.push(`Lowest scorer: ${eliminated.name} (${weekScores[eliminated.id]?.toFixed(1)} pts) — CHOPPED`)
    events.push(`${active.length} teams remain`)
    keyEvents.push(`Week ${w}: ${eliminated.name} eliminated (${weekScores[eliminated.id]?.toFixed(1)} pts)`)

    weeks.push({ week: w, events, scores: weekScores, eliminated: eliminated.name })
  }

  const champion = active[0]!
  keyEvents.push(`Champion: ${champion.name} — last team standing`)

  return {
    leagueId: config.leagueId, leagueType: 'guillotine', leagueVariant: 'guillotine',
    sport: config.sport, weeksSimulated: weeks.length, playerCount: teams.length,
    champion: champion.name, runnerUp: eliminationOrder[eliminationOrder.length - 1] ?? null,
    weeks, keyEvents,
    finalStandings: [
      { rank: 1, name: champion.name },
      ...eliminationOrder.reverse().map((n, i) => ({ rank: i + 2, name: n })),
    ],
    formatSpecific: { eliminationOrder: eliminationOrder.reverse(), totalWeeks: weeks.length },
    simulatedAt: new Date().toISOString(),
  }
}
