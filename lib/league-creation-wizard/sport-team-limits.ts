/**
 * League size limits by sport — aligned with common ESPN / Sleeper-style caps
 * (every team has one manager; no duplicate slots).
 */

const MAX_TEAMS_BY_SPORT: Record<string, number> = {
  NFL: 24,
  NBA: 20,
  MLB: 20,
  NHL: 16,
  NCAAF: 20,
  NCAAB: 20,
  SOCCER: 20,
}

const NFL_TEAM_COUNT_OPTIONS = [16, 20, 24] as const

/** Survivor cast sizes (one manager per team) — same for all sports in this flow. */
export const SURVIVOR_CAST_SIZE_OPTIONS = [16, 20, 24] as const

export function clampSurvivorCastSize(raw: number): number {
  const n = Number.isFinite(raw) ? Math.round(raw) : 20
  return SURVIVOR_CAST_SIZE_OPTIONS.reduce((closest, opt) =>
    Math.abs(opt - n) < Math.abs(closest - n) ? opt : closest,
  SURVIVOR_CAST_SIZE_OPTIONS[1])
}

export function getMaxTeamsForSport(sport: string): number {
  return MAX_TEAMS_BY_SPORT[sport] ?? 20
}

/** Every integer team count from 4 through the sport maximum (one manager per team). */
export function getTeamCountOptionsForSport(sport: string, leagueType?: string): number[] {
  if (String(leagueType ?? '').toLowerCase() === 'survivor') {
    return [...SURVIVOR_CAST_SIZE_OPTIONS]
  }
  if (sport.toUpperCase() === 'NFL') {
    return [...NFL_TEAM_COUNT_OPTIONS]
  }
  const max = getMaxTeamsForSport(sport)
  const out: number[] = []
  for (let n = 4; n <= max; n += 1) {
    out.push(n)
  }
  return out
}

export function clampTeamCountForSport(sport: string, teamCount: number, leagueType?: string): number {
  if (String(leagueType ?? '').toLowerCase() === 'survivor') {
    return clampSurvivorCastSize(teamCount)
  }
  if (sport.toUpperCase() === 'NFL') {
    const n = Number.isFinite(teamCount) ? Math.round(teamCount) : NFL_TEAM_COUNT_OPTIONS[0]
    return NFL_TEAM_COUNT_OPTIONS.reduce((closest, option) => {
      return Math.abs(option - n) < Math.abs(closest - n) ? option : closest
    }, NFL_TEAM_COUNT_OPTIONS[0])
  }
  const max = getMaxTeamsForSport(sport)
  const n = Number.isFinite(teamCount) ? Math.round(teamCount) : 12
  return Math.min(Math.max(n, 4), max)
}
