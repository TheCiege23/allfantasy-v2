import { createRng, sampleTeamWeeklyScore } from '@/lib/ai/sim/playerModel'
import type { SimTeamInput } from '@/lib/ai/sim/types'
import type { MatchupSimResult } from '@/lib/ai/sim/types'

export function simulateMatchup(
  teamA: SimTeamInput,
  teamB: SimTeamInput,
  opts: { iterations: number; seed?: number },
): MatchupSimResult {
  const iterations = Math.max(10, Math.min(5000, opts.iterations))
  const rng = createRng(opts.seed ?? 0xafcafe)
  let winsA = 0
  let scoreASum = 0
  let scoreBSum = 0
  for (let i = 0; i < iterations; i++) {
    const sa = sampleTeamWeeklyScore(teamA.roster, rng)
    const sb = sampleTeamWeeklyScore(teamB.roster, rng)
    scoreASum += sa
    scoreBSum += sb
    if (sa > sb) winsA++
    else if (sa === sb) {
      if (rng() < 0.5) winsA++
    }
  }
  const p = winsA / iterations
  return {
    teamAId: teamA.id,
    teamBId: teamB.id,
    scoreA: scoreASum / iterations,
    scoreB: scoreBSum / iterations,
    winnerId: p >= 0.5 ? teamA.id : teamB.id,
    winProbA: p,
    iterations,
  }
}
