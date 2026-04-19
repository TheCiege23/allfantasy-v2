/**
 * Pull numeric fantasy projection totals from provider JSON blobs (DB or API).
 * Returns null when no real numeric projection is present.
 */

export function extractProjectionPoints(projections: unknown): number | null {
  if (projections == null) return null
  if (typeof projections === 'number' && Number.isFinite(projections)) return projections
  if (typeof projections === 'string' && /^-?\d+(\.\d+)?$/.test(projections.trim())) {
    return Number(projections)
  }
  if (typeof projections !== 'object' || Array.isArray(projections)) return null
  const o = projections as Record<string, unknown>
  const keys = [
    'fantasyPoints',
    'projectedPoints',
    'projected_points',
    'points',
    'fp',
    'total',
    'week',
    'pts',
    'fantasy_points',
    'mean',
    'projection',
  ]
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v)
  }
  return null
}

export function extractFantasyPointsPerGame(stats: unknown): number | null {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return null
  const o = stats as Record<string, unknown>
  for (const k of ['fantasyPointsPerGame', 'fppg', 'avgPoints', 'avg_fp', 'DK_fantasy_points_per_game']) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

export function extractReceptionsPerGame(seasonStats: Record<string, unknown> | null | undefined): number | null {
  if (!seasonStats) return null
  const rec =
    typeof seasonStats.receptions === 'number'
      ? seasonStats.receptions
      : typeof seasonStats.receptions === 'string'
        ? Number(seasonStats.receptions)
        : null
  const gp =
    typeof seasonStats.games_played === 'number'
      ? seasonStats.games_played
      : typeof seasonStats.gamesPlayed === 'number'
        ? seasonStats.gamesPlayed
        : typeof seasonStats.games_played === 'string'
          ? Number(seasonStats.games_played)
          : null
  if (rec != null && gp != null && gp > 0 && Number.isFinite(rec)) return rec / gp
  return null
}
