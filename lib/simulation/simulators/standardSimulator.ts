/**
 * Standard League Simulator — covers redraft, dynasty, keeper, salary_cap.
 * Simulates weekly matchups with randomized scores, playoffs, and champion.
 */

import type { SimulationConfig, SimulationReport, SimulatedWeek, SimTeam } from '../types'

function seededRng(seed: string) {
  let h = 0
  for (const c of seed) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return () => { h = (h * 1664525 + 1013904223) | 0; return (h >>> 0) / 0xffffffff }
}

function generateScore(basePoints: number, rng: () => number): number {
  const variance = basePoints * 0.3
  return Math.round((basePoints + (rng() - 0.5) * 2 * variance) * 10) / 10
}

export async function simulateStandard(config: SimulationConfig, teams: SimTeam[]): Promise<SimulationReport> {
  const rng = seededRng(`${config.leagueId}-sim-${Date.now()}`)
  const regularWeeks = Math.max(config.seasonWeeks - 3, 10)
  const records: Record<string, { wins: number; losses: number; pf: number }> = {}
  teams.forEach((t) => { records[t.id] = { wins: 0, losses: 0, pf: 0 } })

  const weeks: SimulatedWeek[] = []
  const keyEvents: string[] = []

  // Regular season matchups
  for (let w = 1; w <= regularWeeks; w++) {
    const shuffled = [...teams].sort(() => rng() - 0.5)
    const weekScores: Record<string, number> = {}
    const events: string[] = []

    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const a = shuffled[i]!
      const b = shuffled[i + 1]!
      const scoreA = generateScore(a.projectedPoints, rng)
      const scoreB = generateScore(b.projectedPoints, rng)
      weekScores[a.id] = scoreA
      weekScores[b.id] = scoreB

      if (scoreA > scoreB) {
        records[a.id]!.wins++; records[b.id]!.losses++
      } else {
        records[b.id]!.wins++; records[a.id]!.losses++
      }
      records[a.id]!.pf += scoreA
      records[b.id]!.pf += scoreB

      events.push(`${a.name} ${scoreA} - ${scoreB} ${b.name}`)
    }

    weeks.push({ week: w, events, scores: weekScores })
  }

  // Playoffs
  const sorted = teams.sort((a, b) => {
    const ra = records[a.id]!; const rb = records[b.id]!
    return rb.wins - ra.wins || rb.pf - ra.pf
  })
  const playoffTeams = sorted.slice(0, Math.min(6, Math.floor(teams.length / 2)))
  keyEvents.push(`Playoff teams: ${playoffTeams.map((t) => t.name).join(', ')}`)

  // Semifinal
  let finalists: SimTeam[] = []
  for (let i = 0; i < playoffTeams.length - 1; i += 2) {
    const a = playoffTeams[i]!; const b = playoffTeams[i + 1]!
    const sa = generateScore(a.projectedPoints, rng)
    const sb = generateScore(b.projectedPoints, rng)
    const winner = sa > sb ? a : b
    finalists.push(winner)
    weeks.push({ week: regularWeeks + 1 + Math.floor(i / 2), events: [`Semifinal: ${a.name} ${sa} vs ${b.name} ${sb} → ${winner.name} advances`] })
    keyEvents.push(`Semifinal: ${winner.name} defeats ${sa > sb ? b.name : a.name}`)
  }

  // Championship
  if (finalists.length >= 2) {
    const a = finalists[0]!; const b = finalists[1]!
    const sa = generateScore(a.projectedPoints * 1.1, rng)
    const sb = generateScore(b.projectedPoints * 1.1, rng)
    const champion = sa > sb ? a : b
    const runnerUp = sa > sb ? b : a
    weeks.push({ week: config.seasonWeeks, events: [`Championship: ${a.name} ${sa} vs ${b.name} ${sb}`] })
    keyEvents.push(`Champion: ${champion.name} defeats ${runnerUp.name}`)

    return {
      leagueId: config.leagueId, leagueType: config.leagueType, leagueVariant: config.leagueVariant,
      sport: config.sport, weeksSimulated: config.seasonWeeks, playerCount: teams.length,
      champion: champion.name, runnerUp: runnerUp.name, weeks, keyEvents,
      finalStandings: sorted.map((t, i) => ({ rank: i + 1, name: t.name, record: `${records[t.id]!.wins}-${records[t.id]!.losses}`, points: Math.round(records[t.id]!.pf) })),
      formatSpecific: { playoffTeams: playoffTeams.map((t) => t.name) },
      simulatedAt: new Date().toISOString(),
    }
  }

  return {
    leagueId: config.leagueId, leagueType: config.leagueType, leagueVariant: config.leagueVariant,
    sport: config.sport, weeksSimulated: config.seasonWeeks, playerCount: teams.length,
    champion: sorted[0]?.name ?? null, runnerUp: sorted[1]?.name ?? null, weeks, keyEvents,
    finalStandings: sorted.map((t, i) => ({ rank: i + 1, name: t.name, record: `${records[t.id]!.wins}-${records[t.id]!.losses}` })),
    formatSpecific: {}, simulatedAt: new Date().toISOString(),
  }
}
