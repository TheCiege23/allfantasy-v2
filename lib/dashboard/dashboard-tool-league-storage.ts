/** Persisted dashboard "tool league" — intelligence widgets + AI grid share one selection on /dashboard */

const STORAGE_KEY = 'af-dashboard-tool-league-id'

export function readDashboardToolLeagueId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)?.trim()
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export function writeDashboardToolLeagueId(leagueId: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (!leagueId?.trim()) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, leagueId.trim())
    }
  } catch {}
}

export function resolveDashboardToolLeagueId(
  leagues: { id: string }[],
  preferredId: string | null | undefined,
): string | null {
  if (leagues.length === 0) return null
  const stored = readDashboardToolLeagueId()
  const candidates = [preferredId, stored].filter((x): x is string => Boolean(x?.trim()))
  for (const c of candidates) {
    const id = c.trim()
    if (leagues.some((l) => l.id === id)) return id
  }
  return leagues[0]?.id ?? null
}
