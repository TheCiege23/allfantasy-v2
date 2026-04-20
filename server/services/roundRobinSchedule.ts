/**
 * Deterministic head-to-head schedule: round-robin (circle method).
 */
function rotateCircle(teams: string[]): string[] {
  const n = teams.length
  if (n < 3) return teams
  return [teams[0], teams[n - 1], ...teams.slice(1, n - 1)]
}

export function buildRoundRobinPairsForWeek(teamIdsSorted: string[], week: number): Map<string, string | null> {
  const teams = [...teamIdsSorted].sort((a, b) => a.localeCompare(b))
  if (teams.length < 2) return new Map()

  const working = [...teams]
  if (working.length % 2 === 1) working.push('__BYE__')

  const n = working.length
  const rounds = n - 1
  const roundIndex = ((week - 1) % rounds + rounds) % rounds

  let roundTeams = [...working]
  for (let r = 0; r < roundIndex; r++) {
    roundTeams = rotateCircle(roundTeams)
  }

  const out = new Map<string, string | null>()
  const half = n / 2
  for (let i = 0; i < half; i++) {
    const a = roundTeams[i]
    const b = roundTeams[n - 1 - i]
    if (a === '__BYE__') {
      if (b !== '__BYE__') out.set(b, null)
    } else if (b === '__BYE__') {
      out.set(a, null)
    } else {
      out.set(a, b)
      out.set(b, a)
    }
  }
  return out
}
