/**
 * Tournament Simulator — simulates multi-league tournament with conferences,
 * advancement rounds, redrafts, and championship.
 */

import type { SimulationConfig, SimulationReport, SimulatedWeek, SimTeam } from '../types'

function seededRng(seed: string) {
  let h = 0
  for (const c of seed) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return () => { h = (h * 1664525 + 1013904223) | 0; return (h >>> 0) / 0xffffffff }
}

export async function simulateTournament(config: SimulationConfig, teams: SimTeam[]): Promise<SimulationReport> {
  const rng = seededRng(`${config.leagueId}-tournament-${Date.now()}`)
  const weeks: SimulatedWeek[] = []
  const keyEvents: string[] = []

  const conferenceCount = Math.min(4, Math.max(2, Math.ceil(teams.length / 30)))
  const teamsPerLeague = Math.min(12, Math.ceil(teams.length / conferenceCount / Math.ceil(teams.length / conferenceCount / 12)))
  const leaguesPerConf = Math.ceil(teams.length / conferenceCount / teamsPerLeague)
  const advancersPerLeague = Math.min(4, Math.floor(teamsPerLeague / 3))

  // Assign to conferences
  const shuffled = [...teams].sort(() => rng() - 0.5)
  const conferences: string[] = ['Alpha', 'Beta', 'Gamma', 'Delta'].slice(0, conferenceCount)
  const confTeams: Record<string, SimTeam[]> = {}
  conferences.forEach((c) => { confTeams[c] = [] })
  shuffled.forEach((t, i) => {
    const conf = conferences[i % conferenceCount]!
    confTeams[conf]!.push(t)
  })

  keyEvents.push(`Tournament: ${teams.length} participants, ${conferenceCount} conferences, ${leaguesPerConf} leagues each`)
  conferences.forEach((c) => keyEvents.push(`${c} Conference: ${confTeams[c]!.length} teams`))

  // Round 1: Qualification (weeks 1-9)
  const qualWeeks = 9
  const scores: Record<string, { wins: number; losses: number; pf: number }> = {}
  teams.forEach((t) => { scores[t.id] = { wins: 0, losses: 0, pf: 0 } })

  for (let w = 1; w <= qualWeeks; w++) {
    const events: string[] = []
    const weekScores: Record<string, number> = {}

    for (const t of teams) {
      const score = Math.round((t.projectedPoints + (rng() - 0.5) * 50) * 10) / 10
      weekScores[t.id] = score
      scores[t.id]!.pf += score

      // Simple W/L based on whether above median for their league
      if (rng() > 0.45) scores[t.id]!.wins++
      else scores[t.id]!.losses++
    }

    events.push(`Qualification Week ${w}: ${teams.length} teams competing`)
    weeks.push({ week: w, events, scores: weekScores })
  }

  // Determine advancers
  const advancers: SimTeam[] = []
  const eliminated: SimTeam[] = []

  for (const conf of conferences) {
    const confMembers = confTeams[conf]!
    const sorted = confMembers.sort((a, b) => {
      const sa = scores[a.id]!; const sb = scores[b.id]!
      return sb.wins - sa.wins || sb.pf - sa.pf
    })
    const advanceCount = Math.min(advancersPerLeague * leaguesPerConf, sorted.length)
    sorted.slice(0, advanceCount).forEach((t) => advancers.push(t))
    sorted.slice(advanceCount).forEach((t) => eliminated.push(t))
    keyEvents.push(`${conf}: Top ${advanceCount} advance — ${sorted[0]!.name} leads with ${scores[sorted[0]!.id]!.wins}W`)
  }

  keyEvents.push(`Qualification complete: ${advancers.length} advance, ${eliminated.length} eliminated`)
  weeks.push({ week: qualWeeks + 1, events: [`ADVANCEMENT: ${advancers.length} teams advance to Round 2. Redraft begins.`] })

  // Round 2: Elimination bracket (weeks 11-14)
  let remaining = [...advancers]
  let round = 2

  while (remaining.length > 4) {
    const events: string[] = []
    const weekScores: Record<string, number> = {}

    for (const t of remaining) {
      weekScores[t.id] = Math.round((t.projectedPoints + (rng() - 0.5) * 40) * 10) / 10
    }

    const sorted = remaining.sort((a, b) => (weekScores[b.id] ?? 0) - (weekScores[a.id] ?? 0))
    const cutCount = Math.max(1, Math.floor(remaining.length / 4))
    const advancing = sorted.slice(0, -cutCount)
    const cut = sorted.slice(-cutCount)

    cut.forEach((t) => {
      eliminated.push(t)
      events.push(`Eliminated: ${t.name} (${weekScores[t.id]?.toFixed(1)} pts)`)
    })

    events.push(`Round ${round}: ${advancing.length} remain, ${cut.length} eliminated`)
    weeks.push({ week: qualWeeks + round, events, scores: weekScores })
    keyEvents.push(`Round ${round}: ${cut.length} eliminated, ${advancing.length} remain`)

    remaining = advancing
    round++
  }

  // Championship
  const finalScores: Record<string, number> = {}
  remaining.forEach((t) => {
    finalScores[t.id] = Math.round((t.projectedPoints * 1.1 + (rng() - 0.5) * 30) * 10) / 10
  })
  const champion = remaining.sort((a, b) => (finalScores[b.id] ?? 0) - (finalScores[a.id] ?? 0))[0]!
  const runnerUp = remaining[1]!

  weeks.push({
    week: qualWeeks + round,
    events: [
      `CHAMPIONSHIP`,
      ...remaining.map((t) => `${t.name}: ${finalScores[t.id]?.toFixed(1)} pts`),
      `CHAMPION: ${champion.name}!`,
    ],
  })
  keyEvents.push(`Champion: ${champion.name} (${finalScores[champion.id]?.toFixed(1)} pts)`)

  return {
    leagueId: config.leagueId, leagueType: 'tournament', leagueVariant: 'tournament_mode',
    sport: config.sport, weeksSimulated: weeks.length, playerCount: teams.length,
    champion: champion.name, runnerUp: runnerUp.name, weeks, keyEvents,
    finalStandings: [
      ...remaining.map((t, i) => ({ rank: i + 1, name: t.name, points: Math.round(finalScores[t.id] ?? 0) })),
      ...eliminated.reverse().map((t, i) => ({ rank: remaining.length + i + 1, name: t.name })),
    ],
    formatSpecific: {
      conferences,
      conferenceCount,
      leaguesPerConference: leaguesPerConf,
      teamsPerLeague,
      advancersPerLeague,
      qualificationWeeks: qualWeeks,
      totalRounds: round,
      totalAdvancers: advancers.length,
      totalEliminated: eliminated.length,
    },
    simulatedAt: new Date().toISOString(),
  }
}
