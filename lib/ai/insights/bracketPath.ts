/**
 * Bracket Path Calculator
 *
 * Given a team and the current bracket results, trace the path that team
 * must take to win the championship. Shows:
 *   - Which rounds they've already won
 *   - Which opponent they face next (or "TBD" if not yet known)
 *   - Whether they've been eliminated
 *
 * Used for rooting guide ("Your champion pick still needs to beat 3 teams")
 * and for commissioner recaps ("Brazil is still alive — 2 wins needed").
 *
 * roundOrder = array of rounds from current to final, e.g.:
 *   ["quarter_final", "semi_final", "final"]
 */

export type BracketPathNode = {
  round: string
  matchId: string | null
  requiredOpponent: string | null
  description: string
  /** True if this team already won this round. */
  isWon: boolean
  /** True if this team was eliminated in this round. */
  isEliminated: boolean
}

export type BracketPathResult = {
  teamName: string
  /** "alive" = still in the tournament | "eliminated" = knocked out | "champion" = won it all */
  currentStatus: "alive" | "eliminated" | "champion"
  pathNodes: BracketPathNode[]
  matchesWon: number
  matchesRemaining: number
}

type MatchSlim = {
  matchId: string
  homeTeam: string
  awayTeam: string
  round: string
  status: "scheduled" | "live" | "final"
  homeScore: number | null
  awayScore: number | null
}

export function computeBracketPath(
  teamName: string,
  matches: MatchSlim[],
  roundOrder: string[],
): BracketPathResult {
  let matchesWon = 0
  let isGloballyEliminated = false

  // Check every final match involving this team
  for (const m of matches) {
    if (m.status !== "final") continue
    const teamIsHome = m.homeTeam === teamName
    const teamIsAway = m.awayTeam === teamName
    if (!teamIsHome && !teamIsAway) continue

    const myScore = teamIsHome ? m.homeScore : m.awayScore
    const oppScore = teamIsHome ? m.awayScore : m.homeScore
    if (myScore === null || oppScore === null) continue

    if (myScore > oppScore) matchesWon++
    else if (myScore < oppScore) {
      isGloballyEliminated = true
      break
    }
    // exact draw shouldn't happen in knockout, skip
  }

  const currentStatus: BracketPathResult["currentStatus"] =
    isGloballyEliminated
      ? "eliminated"
      : matchesWon >= roundOrder.length
        ? "champion"
        : "alive"

  // Build one node per round
  const pathNodes: BracketPathNode[] = roundOrder.map((round): BracketPathNode => {
    const match = matches.find(
      (m) =>
        m.round === round && (m.homeTeam === teamName || m.awayTeam === teamName),
    )

    if (!match) {
      return {
        round,
        matchId: null,
        requiredOpponent: null,
        description: `Must win ${round.replace(/_/g, " ")} — opponent TBD`,
        isWon: false,
        isEliminated: false,
      }
    }

    const opponent = match.homeTeam === teamName ? match.awayTeam : match.homeTeam
    const myScore = match.homeTeam === teamName ? match.homeScore : match.awayScore
    const oppScore = match.homeTeam === teamName ? match.awayScore : match.homeScore

    const isWon =
      match.status === "final" &&
      myScore !== null &&
      oppScore !== null &&
      myScore > oppScore

    const isLost =
      match.status === "final" &&
      myScore !== null &&
      oppScore !== null &&
      myScore < oppScore

    const roundLabel = round.replace(/_/g, " ")
    const description = isWon
      ? `✓ Beat ${opponent} in ${roundLabel}`
      : isLost
        ? `✗ Lost to ${opponent} in ${roundLabel}`
        : match.status === "live"
          ? `Live vs ${opponent} in ${roundLabel}`
          : `Needs to beat ${opponent} in ${roundLabel}`

    return {
      round,
      matchId: match.matchId,
      requiredOpponent: opponent,
      description,
      isWon,
      isEliminated: isLost,
    }
  })

  const matchesRemaining = pathNodes.filter((n) => !n.isWon && !n.isEliminated).length

  return {
    teamName,
    currentStatus,
    pathNodes,
    matchesWon,
    matchesRemaining,
  }
}
