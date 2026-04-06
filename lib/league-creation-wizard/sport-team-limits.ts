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

export function getMaxTeamsForSport(sport: string): number {
  return MAX_TEAMS_BY_SPORT[sport] ?? 20
}

/** Every integer team count from 4 through the sport maximum (one manager per team). */
export function getTeamCountOptionsForSport(sport: string): number[] {
  const max = getMaxTeamsForSport(sport)
  const out: number[] = []
  for (let n = 4; n <= max; n += 1) {
    out.push(n)
  }
  return out
}

export function clampTeamCountForSport(sport: string, teamCount: number): number {
  const max = getMaxTeamsForSport(sport)
  const n = Number.isFinite(teamCount) ? Math.round(teamCount) : 12
  return Math.min(Math.max(n, 4), max)
}
