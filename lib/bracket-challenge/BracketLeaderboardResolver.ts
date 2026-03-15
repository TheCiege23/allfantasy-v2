/**
 * BracketLeaderboardResolver — leaderboard URLs and rank display for bracket challenge.
 */

/**
 * URL to pool/league leaderboard (standings within a league).
 */
export function getPoolLeaderboardUrl(leagueId: string): string {
  return `/brackets/leagues/${encodeURIComponent(leagueId)}`
}

/**
 * URL to global rankings for a tournament (with optional page).
 */
export function getGlobalRankingsUrl(tournamentId: string, page = 1): string {
  return `/api/bracket/global-rankings?tournamentId=${encodeURIComponent(tournamentId)}&page=${page}&limit=50`
}

/**
 * URL to public pools list for a tournament.
 */
export function getPublicPoolsUrl(tournamentId: string): string {
  return `/api/bracket/public-pools?tournamentId=${encodeURIComponent(tournamentId)}`
}

/**
 * Format rank for display (1st, 2nd, 3rd, 4th, ...).
 */
export function formatRank(rank: number): string {
  if (rank <= 0) return '—'
  const s = rank % 10
  const th = rank % 100
  if (s === 1 && th !== 11) return `${rank}st`
  if (s === 2 && th !== 12) return `${rank}nd`
  if (s === 3 && th !== 13) return `${rank}rd`
  return `${rank}th`
}
