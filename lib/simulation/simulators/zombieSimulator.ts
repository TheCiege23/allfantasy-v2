/**
 * Zombie League Simulator — infections, whisperer, resources, weekly resolution.
 */

import type { SimulationConfig, SimulationReport, SimulatedWeek, SimTeam } from '../types'

function seededRng(seed: string) {
  let h = 0
  for (const c of seed) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return () => { h = (h * 1664525 + 1013904223) | 0; return (h >>> 0) / 0xffffffff }
}

type ZombieStatus = 'Survivor' | 'Zombie' | 'Whisperer'

export async function simulateZombie(config: SimulationConfig, teams: SimTeam[]): Promise<SimulationReport> {
  const rng = seededRng(`${config.leagueId}-zombie-${Date.now()}`)
  const weeks: SimulatedWeek[] = []
  const keyEvents: string[] = []

  const statuses: Record<string, ZombieStatus> = {}
  const serums: Record<string, number> = {}
  teams.forEach((t) => { statuses[t.id] = 'Survivor'; serums[t.id] = 0 })

  // Select whisperer
  const whisperer = teams[Math.floor(rng() * teams.length)]!
  statuses[whisperer.id] = 'Whisperer'
  keyEvents.push(`Whisperer selected: ${whisperer.name}`)

  const totalWeeks = Math.min(config.seasonWeeks, 16)

  for (let w = 1; w <= totalWeeks; w++) {
    const events: string[] = []
    const weekScores: Record<string, number> = {}

    // Score matchups
    const shuffled = [...teams].sort(() => rng() - 0.5)
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const a = shuffled[i]!; const b = shuffled[i + 1]!
      const sa = Math.round((a.projectedPoints + (rng() - 0.5) * 50) * 10) / 10
      const sb = Math.round((b.projectedPoints + (rng() - 0.5) * 50) * 10) / 10
      weekScores[a.id] = sa; weekScores[b.id] = sb

      const winner = sa > sb ? a : b
      const loser = sa > sb ? b : a

      // Infection logic
      if (statuses[winner.id] === 'Whisperer' && statuses[loser.id] === 'Survivor') {
        statuses[loser.id] = 'Zombie'
        events.push(`${loser.name} INFECTED by Whisperer ${winner.name}!`)
        keyEvents.push(`Week ${w}: ${loser.name} infected by Whisperer`)
      } else if (statuses[winner.id] === 'Zombie' && statuses[loser.id] === 'Survivor') {
        if (rng() > 0.5) {
          statuses[loser.id] = 'Zombie'
          events.push(`${loser.name} INFECTED by Zombie ${winner.name}!`)
        }
      }

      events.push(`${a.name} (${statuses[a.id]}) ${sa} vs ${sb} ${b.name} (${statuses[b.id]})`)
    }

    // Award serums to top scorers
    const topScorer = teams.reduce((best, t) => (weekScores[t.id] ?? 0) > (weekScores[best.id] ?? 0) ? t : best, teams[0]!)
    if (statuses[topScorer.id] === 'Survivor') {
      serums[topScorer.id] = (serums[topScorer.id] ?? 0) + 1
      events.push(`${topScorer.name} earned a Serum (top scorer)`)
    }

    // Serum use: zombies try to revive
    for (const t of teams) {
      if (statuses[t.id] === 'Zombie' && serums[t.id]! > 0 && rng() > 0.6) {
        statuses[t.id] = 'Survivor'
        serums[t.id]!--
        events.push(`${t.name} used a Serum and is REVIVED!`)
        keyEvents.push(`Week ${w}: ${t.name} revived via Serum`)
      }
    }

    const survivors = teams.filter((t) => statuses[t.id] === 'Survivor').length
    const zombies = teams.filter((t) => statuses[t.id] === 'Zombie').length
    events.push(`Status: ${survivors} Survivors, ${zombies} Zombies, 1 Whisperer`)

    weeks.push({ week: w, events, scores: weekScores })
  }

  // Final standings
  const finalStandings = teams
    .map((t) => ({ ...t, status: statuses[t.id]!, totalPoints: weeks.reduce((s, w) => s + (w.scores?.[t.id] ?? 0), 0) }))
    .sort((a, b) => {
      if (a.status === 'Survivor' && b.status !== 'Survivor') return -1
      if (a.status !== 'Survivor' && b.status === 'Survivor') return 1
      return b.totalPoints - a.totalPoints
    })

  const champion = finalStandings[0]!

  return {
    leagueId: config.leagueId, leagueType: 'zombie', leagueVariant: 'zombie',
    sport: config.sport, weeksSimulated: totalWeeks, playerCount: teams.length,
    champion: champion.name, runnerUp: finalStandings[1]?.name ?? null, weeks, keyEvents,
    finalStandings: finalStandings.map((t, i) => ({ rank: i + 1, name: t.name, record: t.status, points: Math.round(t.totalPoints) })),
    formatSpecific: {
      whisperer: whisperer.name,
      finalSurvivors: teams.filter((t) => statuses[t.id] === 'Survivor').map((t) => t.name),
      finalZombies: teams.filter((t) => statuses[t.id] === 'Zombie').map((t) => t.name),
      totalInfections: keyEvents.filter((e) => e.includes('infected')).length,
      totalRevivals: keyEvents.filter((e) => e.includes('revived')).length,
    },
    simulatedAt: new Date().toISOString(),
  }
}
