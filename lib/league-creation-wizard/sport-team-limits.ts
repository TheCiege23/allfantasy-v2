/**
 * League size limits by sport — aligned with common ESPN / Sleeper-style caps
 * (every team has one manager; no duplicate slots).
 */

const MAX_TEAMS_BY_SPORT: Record<string, number> = {
  NFL: 32,
  NBA: 20,
  MLB: 20,
  NHL: 16,
  NCAAF: 20,
  NCAAB: 20,
  SOCCER: 20,
}

const COMMON_SIZES = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32] as const

export function getMaxTeamsForSport(sport: string): number {
  return MAX_TEAMS_BY_SPORT[sport] ?? 20
}

/** Selectable team counts for UI (4 … max for sport). */
export function getTeamCountOptionsForSport(sport: string): number[] {
  const max = getMaxTeamsForSport(sport)
  return COMMON_SIZES.filter((n) => n <= max)
}

export function clampTeamCountForSport(sport: string, teamCount: number): number {
  const max = getMaxTeamsForSport(sport)
  const n = Number.isFinite(teamCount) ? Math.round(teamCount) : 12
  return Math.min(Math.max(n, 4), max)
}
