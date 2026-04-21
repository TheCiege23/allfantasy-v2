import { positionalBalanceScore, rosterStrengthIndex } from '@/lib/ai/sim/playerModel'
import { simulateSeason } from '@/lib/ai/sim/seasonSimulator'
import type { DraftSimResult, MonteCarloOptions, SimPlayerInput, SimTeamInput } from '@/lib/ai/sim/types'

function syntheticOpponents(count: number, weeklyProj: number, seed: number): SimTeamInput[] {
  const out: SimTeamInput[] = []
  for (let i = 0; i < count; i++) {
    const roster: SimPlayerInput[] = Array.from({ length: 9 }, (_, j) => ({
      id: `syn-${seed}-${i}-${j}`,
      position: 'FLEX',
      projection: weeklyProj * (0.92 + ((i + j) % 5) * 0.02),
      variance: 7 + (j % 3),
      consistency: 0.45,
    }))
    out.push({ id: `opp-${seed}-${i}`, name: `League ${i + 1}`, roster })
  }
  return out
}

/**
 * What-if draft pick: compare roster strength and playoff/champ odds vs same synthetic league.
 */
export function simulateDraft(args: {
  userRoster: SimPlayerInput[]
  hypotheticalPick: SimPlayerInput
  numTeams: number
  iterations?: number
  seed?: number
  weeksRemaining?: number
}): DraftSimResult {
  const numTeams = Math.max(4, Math.min(32, args.numTeams))
  const iterations = Math.max(50, Math.min(1000, args.iterations ?? 200))
  const seed = args.seed ?? 42
  const weeks = args.weeksRemaining ?? 12

  const meanProj =
    args.userRoster.length > 0
      ? args.userRoster.reduce((s, p) => s + p.projection, 0) / args.userRoster.length
      : 8

  const opponents = syntheticOpponents(numTeams - 1, meanProj * 0.98, seed)

  const baseUser: SimTeamInput = { id: 'user', name: 'You', roster: [...args.userRoster] }
  const withUser: SimTeamInput = {
    id: 'user',
    name: 'You',
    roster: [...args.userRoster, args.hypotheticalPick],
  }

  const mc: MonteCarloOptions = {
    iterations,
    seed,
    weeksRemaining: weeks,
    playoffTeams: Math.min(6, numTeams),
    regularSeasonWeeks: weeks,
  }

  const before = simulateSeason([baseUser, ...opponents], mc)
  const after = simulateSeason([withUser, ...opponents], mc)

  const bStrength = rosterStrengthIndex(args.userRoster)
  const aStrength = rosterStrengthIndex([...args.userRoster, args.hypotheticalPick])
  const bal = positionalBalanceScore(args.userRoster)
  const balPick = positionalBalanceScore([...args.userRoster, args.hypotheticalPick])

  return {
    baselineStrength: bStrength,
    withPickStrength: aStrength,
    strengthDelta: aStrength - bStrength,
    winOddsImpact:
      (after.playoffOdds['user'] ?? 0) - (before.playoffOdds['user'] ?? 0) +
      ((after.championshipOdds['user'] ?? 0) - (before.championshipOdds['user'] ?? 0)) * 0.5,
    positionalBalance: bal,
    positionalBalanceWithPick: balPick,
    iterations,
  }
}

/**
 * Simulate next K hypothetical picks (sequential roster updates).
 */
export function simulateNextPicks(args: {
  userRoster: SimPlayerInput[]
  picks: SimPlayerInput[]
  numTeams: number
}): { perPick: DraftSimResult[]; final: DraftSimResult | null } {
  let roster = [...args.userRoster]
  const perPick: DraftSimResult[] = []
  for (const pick of args.picks) {
    perPick.push(
      simulateDraft({
        userRoster: roster,
        hypotheticalPick: pick,
        numTeams: args.numTeams,
        iterations: 120,
      }),
    )
    roster = [...roster, pick]
  }
  const final =
    args.picks.length > 0
      ? simulateDraft({
          userRoster: args.userRoster,
          hypotheticalPick: args.picks[args.picks.length - 1]!,
          numTeams: args.numTeams,
          iterations: 160,
        })
      : null
  return { perPick, final }
}
