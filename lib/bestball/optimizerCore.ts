import type { LineupSlotDef, OptimizerPlayer, OptimizerResult, SlotAssignment } from './types'
import { optimizeSoccerFormation } from './soccerFormationOptimizer'

const ALGO_VERSION = 'bestball-greedy-v1'

function sortRanked(players: OptimizerPlayer[]): OptimizerPlayer[] {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return a.playerId.localeCompare(b.playerId)
  })
}

function positionsForPlayer(p: OptimizerPlayer): string[] {
  const raw = p.position.trim()
  if (raw.includes('/')) {
    return raw.split('/').map((s) => s.trim()).filter(Boolean)
  }
  return [raw]
}

function playerEligibleForSlot(p: OptimizerPlayer, slot: LineupSlotDef): boolean {
  const pos = positionsForPlayer(p)
  if (slot.eligible.includes('*')) return true
  return pos.some((x) => slot.eligible.includes(x))
}

/**
 * Greedy multi-slot fill + FLEX/UTIL pass. SOCCER uses formation optimizer (caller).
 */
export function runGreedyOptimizer(ranked: OptimizerPlayer[], slots: LineupSlotDef[], sport: string): OptimizerResult {
  const used = new Set<string>()
  const lineup: SlotAssignment[] = []
  const log: Record<string, unknown> = { algorithm: ALGO_VERSION, sport, unfilledSlots: [] as string[] }

  const nonFlex = slots.filter((s) => s.slot !== 'FLEX' && s.slot !== 'UTIL')
  const flexSlots = slots.filter((s) => s.slot === 'FLEX' || s.slot === 'UTIL')

  for (const slot of nonFlex) {
    for (let i = 0; i < slot.count; i++) {
      const eligible = ranked.filter((p) => playerEligibleForSlot(p, slot) && !used.has(p.playerId))
      const pick = eligible[0]
      if (!pick) {
        ;(log.unfilledSlots as string[]).push(
          `${slot.slot} #${i + 1} — no eligible player (required=${slot.required !== false})`,
        )
        continue
      }
      lineup.push({ slot: slot.slot, player: pick })
      used.add(pick.playerId)
    }
  }

  for (const slot of flexSlots) {
    for (let i = 0; i < slot.count; i++) {
      const eligible = ranked.filter((p) => playerEligibleForSlot(p, slot) && !used.has(p.playerId))
      const pick = eligible[0]
      if (!pick) {
        ;(log.unfilledSlots as string[]).push(`${slot.slot} #${i + 1} — no eligible player`)
        continue
      }
      lineup.push({ slot: slot.slot, player: pick })
      used.add(pick.playerId)
    }
  }

  const totalPoints = lineup.reduce((s, a) => s + a.player.points, 0)

  // Tie: detect alternate with same total (swap equal-score players in same slot group) — rare; mark if any duplicate scores at margin
  let alternateExists = false
  const scores = lineup.map((x) => x.player.points)
  const dup = scores.filter((s, i) => scores.indexOf(s) !== i)
  if (dup.length) alternateExists = true

  return {
    assignments: lineup,
    totalPoints,
    alternateExists,
    alternateLineup: alternateExists ? { note: 'possible tie alternate' } : null,
    optimizerLog: log,
  }
}

export function optimizeLineupForSport(
  players: OptimizerPlayer[],
  slots: LineupSlotDef[],
  sport: string,
): OptimizerResult {
  const ranked = sortRanked(players)
  if (sport === 'SOCCER') {
    const soc = optimizeSoccerFormation(ranked, { lineupSlots: slots })
    const log: Record<string, unknown> = {
      algorithm: ALGO_VERSION,
      sport: 'SOCCER',
      formation: soc.formation,
      note: soc.log,
    }
    return {
      assignments: soc.assignments,
      totalPoints: soc.totalPoints,
      alternateExists: false,
      alternateLineup: null,
      optimizerLog: log,
    }
  }
  return runGreedyOptimizer(ranked, slots, sport)
}
