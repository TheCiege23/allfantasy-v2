/**
 * Group Advancement Calculator
 *
 * Given current group standings and remaining matches, determine which teams
 * have clinched advancement, which are eliminated, and which are still alive.
 *
 * Works for any group-stage competition: WC, Euro, Champions League, etc.
 * The advancingPerGroup param adapts to the format (2 for classic WC, 3 for WC 2026).
 */

export type GroupTeamStanding = {
  teamName: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export type GroupAdvancementStatus = {
  teamName: string
  standing: GroupTeamStanding
  currentPosition: number
  /** "advanced" = clinched | "eliminated" = cannot advance | "alive" = still possible */
  status: "advanced" | "eliminated" | "alive"
  remainingGames: number
  maxPointsReachable: number
  /** Points needed to clinch (≥ 0, or 0 if already clinched). */
  pointsNeededToClinch: number
}

export type GroupAdvancementResult = {
  group: string
  teamsCount: number
  teamsAdvancing: number
  standings: GroupAdvancementStatus[]
  confirmedAdvanced: string[]
  confirmedEliminated: string[]
  undecided: string[]
  matchesRemaining: number
}

export function computeGroupAdvancement(
  group: string,
  standings: GroupTeamStanding[],
  matchesRemainingPerTeam: number,
  advancingPerGroup: number = 2,
): GroupAdvancementResult {
  const PTS_PER_WIN = 3

  // Sort by: points desc, GD desc, GF desc
  const sorted = [...standings].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor,
  )

  const cutoffTeam = sorted[advancingPerGroup - 1] // last team that currently advances

  const statuses: GroupAdvancementStatus[] = sorted.map((team, i) => {
    const maxReachable = team.points + matchesRemainingPerTeam * PTS_PER_WIN

    // Can every team ranked above this one possibly drop below?
    // (Conservative — GD tiebreak ignored for simplicity)
    const thresholdToAdvance = cutoffTeam?.points ?? 0

    let status: GroupAdvancementStatus["status"] = "alive"

    // Clinched: even if the (advancingPerGroup)th-place team wins all remaining games,
    // this team is still above them
    const worstCaseBehind =
      i >= advancingPerGroup
        ? sorted[advancingPerGroup - 1]?.points ?? 0
        : 0

    if (
      i < advancingPerGroup &&
      team.points > (sorted[advancingPerGroup]?.points ?? -1) + matchesRemainingPerTeam * PTS_PER_WIN
    ) {
      status = "advanced"
    } else if (maxReachable < (sorted[advancingPerGroup - 1]?.points ?? 0)) {
      status = "eliminated"
    }

    const ptsNeeded =
      status === "advanced"
        ? 0
        : Math.max(0, thresholdToAdvance - team.points + 1)

    return {
      teamName: team.teamName,
      standing: team,
      currentPosition: i + 1,
      status,
      remainingGames: matchesRemainingPerTeam,
      maxPointsReachable: maxReachable,
      pointsNeededToClinch: ptsNeeded,
    }
  })

  return {
    group,
    teamsCount: standings.length,
    teamsAdvancing: advancingPerGroup,
    standings: statuses,
    confirmedAdvanced: statuses.filter((s) => s.status === "advanced").map((s) => s.teamName),
    confirmedEliminated: statuses.filter((s) => s.status === "eliminated").map((s) => s.teamName),
    undecided: statuses.filter((s) => s.status === "alive").map((s) => s.teamName),
    matchesRemaining: matchesRemainingPerTeam * standings.length,
  }
}
