import type { RecentPerformanceMetrics, TrajectoryDirection } from './types'

export interface StandingsSample {
  week: number
  rank: number
  size: number
}

export function computeRecentPerformance(
  wins: number,
  losses: number,
  lastNGames: number,
  standings: StandingsSample | null,
): RecentPerformanceMetrics {
  const total = wins + losses
  const recentWinPct = total > 0 ? wins / total : 0

  return {
    recentWinPct,
    lastNGames,
    standingsRank: standings?.rank ?? null,
    standingsSize: standings?.size ?? null,
  }
}

export function inferTrajectoryDirection(
  recent: RecentPerformanceMetrics,
  nextYearStrength: number,
  threeYearStrength: number,
): TrajectoryDirection {
  const strengthDelta = threeYearStrength - nextYearStrength
  if (strengthDelta >= 8 && recent.recentWinPct >= 0.5) return 'rising'
  if (strengthDelta <= -8 && recent.recentWinPct <= 0.5) return 'falling'
  return 'flat'
}

