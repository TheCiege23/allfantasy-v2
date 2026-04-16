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

function evenTeamRange(min: number, max: number): number[] {
  const out: number[] = []
  const start = min % 2 === 0 ? min : min + 1
  for (let n = start; n <= max; n += 2) out.push(n)
  return out
}

/** Every integer team count from 4 through the sport maximum (one manager per team). */
export function getTeamCountOptionsForSport(sport: string, leagueType?: string): number[] {
  if (String(leagueType ?? '').toLowerCase() === 'survivor') {
    return [...SURVIVOR_CAST_SIZE_OPTIONS]
  }
  if (String(leagueType ?? '').toLowerCase() === 'devy' || String(leagueType ?? '').toLowerCase() === 'c2c') {
    const u = sport.toUpperCase()
    if (u === 'NFL') return evenTeamRange(4, 32)
    if (u === 'NBA') return evenTeamRange(4, 30)
    return evenTeamRange(4, 20)
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

function clampDevyEvenTeamCount(sport: string, teamCount: number): number {
  const u = sport.toUpperCase()
  const max = u === 'NFL' ? 32 : u === 'NBA' ? 30 : 20
  const min = 4
  const n = Number.isFinite(teamCount) ? Math.round(teamCount) : 12
  const clamped = Math.min(Math.max(n, min), max)
  return clamped % 2 === 0 ? clamped : clamped + (clamped < max ? 1 : -1)
}

export function clampTeamCountForSport(sport: string, teamCount: number, leagueType?: string): number {
  if (String(leagueType ?? '').toLowerCase() === 'zombie') {
    const max = getMaxTeamsForSport(sport)
    const n = Number.isFinite(teamCount) ? Math.round(teamCount) : 12
    return Math.min(Math.max(n, 4), max)
  }
  if (String(leagueType ?? '').toLowerCase() === 'survivor') {
    return clampSurvivorCastSize(teamCount)
  }
  if (String(leagueType ?? '').toLowerCase() === 'devy' || String(leagueType ?? '').toLowerCase() === 'c2c') {
    return clampDevyEvenTeamCount(sport, teamCount)
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
