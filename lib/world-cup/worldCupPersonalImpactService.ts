import type { DbEntryForLb, DbMatch } from "./worldCupScoringService"
import { evaluateWorldCupPick } from "./worldCupScoringService"
import { getWorldCupRoundPoints } from "./worldCupBracketBuilder"
import type { WorldCupLeaderboardRow, WorldCupRound, WorldCupScoringValues } from "./types"
import { WORLD_CUP_ROUNDS } from "./types"

const FINAL_STATUSES = new Set(["FT", "AET", "PEN", "final"])

const ROUND_IMPACT_WEIGHT: Record<string, number> = {
  final: 1.0,
  semifinal: 0.85,
  quarterfinal: 0.70,
  round_of_16: 0.55,
  round_of_32: 0.40,
  third_place: 0.30,
}

export type WorldCupPersonalImpactResult = {
  matchId: string
  impactScore: number
  userRootingSide: "home" | "away" | "neither"
  possiblePointsAtStake: number
  affectedUserPickIds: string[]
  rivalsHelped: number
  rivalsHurt: number
  rankSwingEstimate: number
  championRiskNote: string | null
  bestResultForUser: { teamName: string; pointsGained: number } | null
  worstResultForUser: { teamName: string; pointsLost: number } | null
  explanation: string
  confidence: "high" | "medium" | "low"
  dataSourceLabel: string
  noEntry: boolean
}

export type ComputeWorldCupPersonalImpactParams = {
  matchId: string
  userId: string
  userEntry: DbEntryForLb | null
  allEntries: DbEntryForLb[]
  allMatches: DbMatch[]
  leaderboard: WorldCupLeaderboardRow[]
  scoring: Partial<WorldCupScoringValues> | null
}

function roundOrder(round: string): number {
  const idx = (WORLD_CUP_ROUNDS as readonly string[]).indexOf(round)
  return idx >= 0 ? idx : -1
}

function isMatchCompleted(match: DbMatch): boolean {
  return (
    FINAL_STATUSES.has(match.status) ||
    FINAL_STATUSES.has(match.apiStatusShort ?? "") ||
    Boolean(match.winnerTeamId)
  )
}

export function computeWorldCupPersonalImpact(
  params: ComputeWorldCupPersonalImpactParams
): WorldCupPersonalImpactResult {
  const { matchId, userId, userEntry, allEntries, allMatches, leaderboard, scoring } = params

  const match = allMatches.find((m) => m.id === matchId)
  if (!match) return noDataResult(matchId)

  if (!userEntry) return noEntryResult(matchId)

  if (isMatchCompleted(match)) return completedResult(matchId, match)

  const matchRoundOrder = roundOrder(match.round)
  const userRow = leaderboard.find((r) => r.userId === userId) ?? null

  // Direct pick for this exact match
  const directPick = userEntry.picks.find((p) => p.matchId === matchId) ?? null

  // Cascade picks: user picked a team from this match to win in a LATER round
  const cascadeHome = userEntry.picks.filter(
    (p) =>
      p.matchId !== matchId &&
      p.selectedTeamId !== null &&
      p.selectedTeamId === match.homeTeamId &&
      roundOrder(p.round) > matchRoundOrder
  )
  const cascadeAway = userEntry.picks.filter(
    (p) =>
      p.matchId !== matchId &&
      p.selectedTeamId !== null &&
      p.selectedTeamId === match.awayTeamId &&
      roundOrder(p.round) > matchRoundOrder
  )

  const affectedUserPickIds = [
    ...(directPick ? [directPick.id] : []),
    ...cascadeHome.map((p) => p.id),
    ...cascadeAway.map((p) => p.id),
  ]

  // Champion risk
  const isChampionMatch =
    Boolean(userEntry.championTeamId) &&
    (userEntry.championTeamId === match.homeTeamId ||
      userEntry.championTeamId === match.awayTeamId)

  const championRiskNote = isChampionMatch
    ? `Your champion ${userEntry.championTeamName ?? "pick"} is playing — a loss ends all champion bonus points.`
    : null

  // Points from direct pick for this match round
  const directPickPoints = getWorldCupRoundPoints(match.round as WorldCupRound, scoring)

  // Points at stake from cascade picks if their team is eliminated
  const homeCascadePoints = cascadeHome.reduce(
    (sum, p) => sum + getWorldCupRoundPoints(p.round as WorldCupRound, scoring),
    0
  )
  const awayCascadePoints = cascadeAway.reduce(
    (sum, p) => sum + getWorldCupRoundPoints(p.round as WorldCupRound, scoring),
    0
  )

  // Determine user's rooting side from direct pick first
  let userRootingSide: "home" | "away" | "neither" = "neither"
  if (directPick?.selectedTeamId) {
    if (directPick.selectedTeamId === match.homeTeamId) userRootingSide = "home"
    else if (directPick.selectedTeamId === match.awayTeamId) userRootingSide = "away"
  }
  // Fall back to cascade pick side with more points at stake
  if (userRootingSide === "neither") {
    if (homeCascadePoints > awayCascadePoints) userRootingSide = "home"
    else if (awayCascadePoints > homeCascadePoints) userRootingSide = "away"
    else if (isChampionMatch) {
      userRootingSide = userEntry.championTeamId === match.homeTeamId ? "home" : "away"
    }
  }

  // Simulate each outcome using evaluateWorldCupPick
  const hypoHome: DbMatch = {
    ...match,
    status: "final",
    winnerTeamId: match.homeTeamId,
    winnerTeamName: match.homeTeamName,
    apiStatusShort: match.apiStatusShort || "FT",
  }
  const hypoAway: DbMatch = {
    ...match,
    status: "final",
    winnerTeamId: match.awayTeamId,
    winnerTeamName: match.awayTeamName,
    apiStatusShort: match.apiStatusShort || "FT",
  }

  const homeEval = directPick ? evaluateWorldCupPick(hypoHome, directPick, scoring) : null
  const awayEval = directPick ? evaluateWorldCupPick(hypoAway, directPick, scoring) : null

  const pointsIfHomeWins = (homeEval?.pointsAwarded ?? 0) + homeCascadePoints
  const pointsIfAwayWins = (awayEval?.pointsAwarded ?? 0) + awayCascadePoints

  const possiblePointsAtStake = Math.max(
    pointsIfHomeWins,
    pointsIfAwayWins,
    directPickPoints
  )

  const bestForUser =
    pointsIfHomeWins >= pointsIfAwayWins
      ? { teamName: match.homeTeamName, points: pointsIfHomeWins }
      : { teamName: match.awayTeamName, points: pointsIfAwayWins }

  const worstForUser =
    pointsIfHomeWins < pointsIfAwayWins
      ? { teamName: match.homeTeamName, points: pointsIfHomeWins }
      : { teamName: match.awayTeamName, points: pointsIfAwayWins }

  // Tally rival picks for each side
  const otherEntries = allEntries.filter((e) => e.userId !== userId)
  let rivalsOnHome = 0
  let rivalsOnAway = 0

  for (const entry of otherEntries) {
    const rivalDirect = entry.picks.find((p) => p.matchId === matchId)
    if (rivalDirect?.selectedTeamId === match.homeTeamId) rivalsOnHome++
    else if (rivalDirect?.selectedTeamId === match.awayTeamId) rivalsOnAway++
  }

  // Rivals who benefit if the worst outcome for user happens
  const rivalsHelped = userRootingSide === "home" ? rivalsOnAway : rivalsOnHome
  // Rivals who gain nothing if the best outcome for user happens
  const rivalsHurt = userRootingSide === "home" ? rivalsOnAway : rivalsOnHome

  const oppositeRivalsCount = userRootingSide === "home" ? rivalsOnAway : rivalsOnHome
  const rankSwingEstimate =
    userRow?.rank !== null && userRow !== null && possiblePointsAtStake > 0
      ? oppositeRivalsCount
      : 0

  // Composite impact score
  const roundWeight = ROUND_IMPACT_WEIGHT[match.round] ?? 0.4
  const hasPick = directPick !== null ? 1 : 0
  const totalEntries = Math.max(allEntries.length, 1)
  const rivalFrac = oppositeRivalsCount / totalEntries
  const championBoost = isChampionMatch ? 0.15 : 0

  const rawScore =
    (roundWeight * 0.5 + rivalFrac * 0.3 + hasPick * 0.1 + championBoost) * 100

  const impactScore = Math.min(Math.max(Math.round(rawScore), 0), 100)

  const confidence: "high" | "medium" | "low" = directPick
    ? "high"
    : cascadeHome.length > 0 || cascadeAway.length > 0
      ? "medium"
      : "low"

  return {
    matchId,
    impactScore,
    userRootingSide,
    possiblePointsAtStake,
    affectedUserPickIds,
    rivalsHelped,
    rivalsHurt,
    rankSwingEstimate,
    championRiskNote,
    bestResultForUser:
      bestForUser.points > 0
        ? { teamName: bestForUser.teamName, pointsGained: bestForUser.points }
        : null,
    worstResultForUser:
      worstForUser.points > 0
        ? { teamName: worstForUser.teamName, pointsLost: worstForUser.points }
        : null,
    explanation: buildExplanation({
      match,
      directPick: !!directPick,
      userRootingSide,
      bestForUser,
      rankSwingEstimate,
      isChampionMatch,
      championRiskNote,
    }),
    confidence,
    dataSourceLabel: "pool + bracket data",
    noEntry: false,
  }
}

function buildExplanation(opts: {
  match: DbMatch
  directPick: boolean
  userRootingSide: "home" | "away" | "neither"
  bestForUser: { teamName: string; points: number }
  rankSwingEstimate: number
  isChampionMatch: boolean
  championRiskNote: string | null
}): string {
  const { match, directPick, userRootingSide, bestForUser, rankSwingEstimate, isChampionMatch } =
    opts

  if (userRootingSide === "neither" && !isChampionMatch) {
    return `${match.homeTeamName} vs ${match.awayTeamName} does not directly affect your bracket picks.`
  }

  const parts: string[] = []

  if (userRootingSide !== "neither") {
    parts.push(
      `Root for ${bestForUser.teamName}${bestForUser.points > 0 ? ` (${bestForUser.points} pts at stake)` : ""}.`
    )
  }

  if (rankSwingEstimate > 0) {
    parts.push(
      `${rankSwingEstimate} rival${rankSwingEstimate === 1 ? "" : "s"} on the other side — potential ${rankSwingEstimate}-spot rank swing.`
    )
  }

  if (isChampionMatch && opts.championRiskNote) {
    parts.push(opts.championRiskNote)
  }

  return parts.join(" ")
}

function noDataResult(matchId: string): WorldCupPersonalImpactResult {
  return {
    matchId,
    impactScore: 0,
    userRootingSide: "neither",
    possiblePointsAtStake: 0,
    affectedUserPickIds: [],
    rivalsHelped: 0,
    rivalsHurt: 0,
    rankSwingEstimate: 0,
    championRiskNote: null,
    bestResultForUser: null,
    worstResultForUser: null,
    explanation: "Match data not available.",
    confidence: "low",
    dataSourceLabel: "none",
    noEntry: false,
  }
}

function noEntryResult(matchId: string): WorldCupPersonalImpactResult {
  return {
    matchId,
    impactScore: 0,
    userRootingSide: "neither",
    possiblePointsAtStake: 0,
    affectedUserPickIds: [],
    rivalsHelped: 0,
    rivalsHurt: 0,
    rankSwingEstimate: 0,
    championRiskNote: null,
    bestResultForUser: null,
    worstResultForUser: null,
    explanation: "You have no bracket entry for this pool.",
    confidence: "low",
    dataSourceLabel: "none",
    noEntry: true,
  }
}

function completedResult(matchId: string, match: DbMatch): WorldCupPersonalImpactResult {
  return {
    matchId,
    impactScore: 0,
    userRootingSide: "neither",
    possiblePointsAtStake: 0,
    affectedUserPickIds: [],
    rivalsHelped: 0,
    rivalsHurt: 0,
    rankSwingEstimate: 0,
    championRiskNote: null,
    bestResultForUser: null,
    worstResultForUser: null,
    explanation: `${match.homeTeamName} vs ${match.awayTeamName} has already finished.`,
    confidence: "high",
    dataSourceLabel: "pool + bracket data",
    noEntry: false,
  }
}
