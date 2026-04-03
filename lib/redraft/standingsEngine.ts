import { prisma } from '@/lib/prisma'

/**
 * Recompute standings from completed matchups for a week.
 * Full implementation: win/loss, streak, median-game rules, tiebreakers.
 */
export async function updateStandings(_seasonId: string, _week: number): Promise<void> {
  void prisma
  // Placeholder — integrate with finalized matchup scores and league median rules.
}
