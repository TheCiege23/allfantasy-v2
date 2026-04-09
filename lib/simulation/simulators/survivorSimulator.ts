/**
 * Survivor League Simulator — simulates full Survivor season.
 * Tribes → challenges → tribals → merge → jury → Final 3 → winner.
 */

import type { SimulationConfig, SimulationReport, SimulatedWeek, SimTeam } from '../types'

function seededRng(seed: string) {
  let h = 0
  for (const c of seed) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return () => { h = (h * 1664525 + 1013904223) | 0; return (h >>> 0) / 0xffffffff }
}

const IDOL_TYPES = [
  'Hidden Immunity Idol', 'Double Vote', 'Vote Nullifier', 'Safety Without Power',
  'Extra Vote', 'Vote Steal', 'Steal 3 Players', 'Score Boost +20',
  'Waiver Priority Override', 'Tribe Immunity Modifier',
]

export async function simulateSurvivor(
  config: SimulationConfig,
  teams: SimTeam[],
  commissionerMode: 'spectator' | 'participating' = 'spectator',
): Promise<SimulationReport> {
  const rng = seededRng(`${config.leagueId}-survivor-${Date.now()}`)
  const tribeCount = Math.min(4, Math.ceil(teams.length / 5))
  const mergeAt = Math.max(6, Math.ceil(teams.length / 2))
  const weeks: SimulatedWeek[] = []
  const keyEvents: string[] = []

  // Form tribes
  const shuffled = [...teams].sort(() => rng() - 0.5)
  const tribes: SimTeam[][] = Array.from({ length: tribeCount }, () => [])
  shuffled.forEach((t, i) => tribes[i % tribeCount]!.push(t))
  const tribeNames = ['Malakal', 'Airai', 'Fang', 'Kota'].slice(0, tribeCount)
  keyEvents.push(`Tribes formed: ${tribeNames.map((n, i) => `${n} (${tribes[i]!.length})`).join(', ')}`)

  // Commissioner participation
  const commissionerTeam = teams[0]! // Assume first team is commissioner
  const isParticipating = commissionerMode === 'participating'
  if (isParticipating) {
    keyEvents.push(`Commissioner Mode: PARTICIPATING (blind mode active — system handles votes autonomously)`)
    keyEvents.push(`Commissioner (${commissionerTeam.name}) plays as a regular manager — no access to hidden idol info or vote counts`)
  } else {
    keyEvents.push(`Commissioner Mode: SPECTATOR (full admin access, not playing)`)
  }

  // Assign idols (~30-35% of league, each unique)
  const idolHolders: Map<string, string> = new Map()
  const idolCount = Math.max(1, Math.round(teams.length * 0.32))
  const shuffledIdolTypes = [...IDOL_TYPES].sort(() => rng() - 0.5)
  for (let i = 0; i < idolCount && i < shuffledIdolTypes.length; i++) {
    const holder = shuffled[Math.floor(rng() * shuffled.length)]!
    if (!idolHolders.has(holder.id)) {
      const idol = shuffledIdolTypes[i]!
      idolHolders.set(holder.id, idol)
      keyEvents.push(`${holder.name} secretly received: ${idol}`)
    }
  }

  let active = [...shuffled]
  let merged = false
  let juryMembers: SimTeam[] = []
  let idolsPlayed = 0
  let eliminated: SimTeam[] = []

  for (let w = 1; active.length > 3; w++) {
    const events: string[] = []
    const weekScores: Record<string, number> = {}

    // Score everyone
    for (const p of active) {
      weekScores[p.id] = Math.round((p.projectedPoints + (rng() - 0.5) * 60) * 10) / 10
    }

    // Check merge
    if (!merged && active.length <= mergeAt) {
      merged = true
      events.push(`MERGE at ${active.length} players! Welcome to the merged tribe.`)
      keyEvents.push(`Week ${w}: Merge at ${active.length} players`)
    }

    let eliminatedThis: SimTeam | null = null
    let immunityWinner: string | undefined

    if (!merged) {
      // Pre-merge: lowest scoring tribe goes to tribal
      const tribeScores: Record<number, number> = {}
      for (let t = 0; t < tribeCount; t++) {
        tribeScores[t] = tribes[t]!.filter((p) => active.includes(p)).reduce((s, p) => s + (weekScores[p.id] ?? 0), 0)
      }
      const losingTribeIdx = Object.entries(tribeScores).sort(([, a], [, b]) => a - b)[0]?.[0]
      const losingTribe = Number(losingTribeIdx)
      const tribeActive = tribes[losingTribe]!.filter((p) => active.includes(p))

      events.push(`${tribeNames[losingTribe]} loses with ${tribeScores[losingTribe]?.toFixed(1)} pts → Tribal Council`)

      // Vote out lowest scorer in losing tribe (simplified)
      const sorted = tribeActive.sort((a, b) => (weekScores[a.id] ?? 0) - (weekScores[b.id] ?? 0))
      let target = sorted[0]!

      // Idol play chance
      if (idolHolders.has(target.id) && rng() > 0.4) {
        events.push(`${target.name} plays ${idolHolders.get(target.id)}! Votes don't count.`)
        idolHolders.delete(target.id)
        idolsPlayed++
        target = sorted[1] ?? sorted[0]!
      }

      eliminatedThis = target
    } else {
      // Post-merge: highest scorer gets immunity, lowest voted out
      const sorted = active.sort((a, b) => (weekScores[b.id] ?? 0) - (weekScores[a.id] ?? 0))
      immunityWinner = sorted[0]!.name
      events.push(`Individual Immunity: ${immunityWinner} (${weekScores[sorted[0]!.id]?.toFixed(1)} pts)`)

      let target = sorted[sorted.length - 1]!

      if (idolHolders.has(target.id) && rng() > 0.3) {
        events.push(`${target.name} plays ${idolHolders.get(target.id)}!`)
        idolHolders.delete(target.id)
        idolsPlayed++
        target = sorted[sorted.length - 2] ?? target
      }

      eliminatedThis = target
    }

    if (eliminatedThis && active.length > 3) {
      active = active.filter((p) => p.id !== eliminatedThis!.id)
      eliminated.push(eliminatedThis)
      events.push(`Voted out: ${eliminatedThis.name}`)
      if (merged) juryMembers.push(eliminatedThis)
    }

    weeks.push({ week: w, events, scores: weekScores, eliminated: eliminatedThis?.name, immunityWinner })
  }

  // Final 3 → jury vote
  const final3 = active.slice(0, 3)
  const juryVotes: Record<string, number> = {}
  final3.forEach((f) => { juryVotes[f.id] = 0 })

  for (const juror of juryMembers) {
    const pick = final3[Math.floor(rng() * final3.length)]!
    juryVotes[pick.id] = (juryVotes[pick.id] ?? 0) + 1
  }

  const winner = final3.sort((a, b) => (juryVotes[b.id] ?? 0) - (juryVotes[a.id] ?? 0))[0]!
  const runnerUp = final3[1]!

  keyEvents.push(`Final 3: ${final3.map((f) => f.name).join(', ')}`)
  keyEvents.push(`Jury votes: ${final3.map((f) => `${f.name}: ${juryVotes[f.id]}`).join(', ')}`)
  keyEvents.push(`Sole Survivor: ${winner.name} (${juryVotes[winner.id]} votes)`)

  weeks.push({
    week: weeks.length + 1,
    events: [
      `Final Tribal Council`,
      ...final3.map((f) => `${f.name}: ${juryVotes[f.id]} jury votes`),
      `SOLE SURVIVOR: ${winner.name}`,
    ],
  })

  return {
    leagueId: config.leagueId, leagueType: 'survivor', leagueVariant: 'survivor',
    sport: config.sport, weeksSimulated: weeks.length, playerCount: teams.length,
    champion: winner.name, runnerUp: runnerUp.name, weeks, keyEvents,
    finalStandings: [
      ...final3.map((f, i) => ({ rank: i + 1, name: f.name, points: juryVotes[f.id] })),
      ...eliminated.reverse().map((e, i) => ({ rank: final3.length + i + 1, name: e.name })),
    ],
    formatSpecific: {
      commissionerMode,
      commissionerBlindMode: isParticipating,
      commissionerTeam: isParticipating ? commissionerTeam.name : null,
      tribes: tribeNames, mergeWeek: weeks.findIndex((w) => w.events.some((e) => e.includes('MERGE'))) + 1,
      idolsPlayed, jurySize: juryMembers.length, soleSurvivor: winner.name,
      eliminationOrder: eliminated.map((e) => e.name),
      blindModeNotes: isParticipating
        ? 'Commissioner played as a regular manager. System handled all vote counting, idol processing, and tribal council autonomously. Commissioner had no access to hidden idol info or vote counts during the simulation.'
        : 'Commissioner observed as spectator with full admin access.',
    },
    simulatedAt: new Date().toISOString(),
  }
}
