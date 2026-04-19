/**
 * Detect Sleeper best-ball / auto-lineup leagues so we do not count manual lineup chores.
 * Uses only fields present on Sleeper league JSON — no guessing from league name.
 */
export function isSleeperBestBallLeague(leagueJson: Record<string, unknown> | null | undefined): boolean {
  if (!leagueJson || typeof leagueJson !== 'object') return false

  const settings = leagueJson.settings
  if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
    const s = settings as Record<string, unknown>
    if (s.best_ball === 1 || s.best_ball === true) return true
    if (s.type === 2 || s.type === 'best_ball') return true // some clients use numeric type
    if (String(s.scoring_type ?? '').toLowerCase().includes('best_ball')) return true
  }

  const meta = leagueJson.metadata
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>
    if (String(m.scoring_type ?? '').toLowerCase().includes('best_ball')) return true
    if (m.best_ball === true || m.best_ball === 1) return true
  }

  return false
}
