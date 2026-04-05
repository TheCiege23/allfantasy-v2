/**
 * Best-ball league detection — safe for client and server (no prisma, no server-only).
 */

export const BESTBALL_VARIANTS = new Set(['best_ball', 'bestball', 'best-ball'])

export function isBestBallLeague(leagueVariant: string | null | undefined, bestBallMode?: boolean | null): boolean {
  if (bestBallMode === true) return true
  if (!leagueVariant) return false
  const v = leagueVariant.toLowerCase()
  return BESTBALL_VARIANTS.has(v) || v.includes('best_ball') || v.includes('bestball')
}
