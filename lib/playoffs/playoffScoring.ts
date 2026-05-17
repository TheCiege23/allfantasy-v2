import type { PlayoffPickView, PlayoffSeriesView } from "./types"

export type PlayoffEntryScore = {
  totalScore: number
  correctPicks: number
  resolvedPicks: number
}

export type PlayoffPickResultStatus = "correct" | "wrong" | "pending" | "no_pick"

export type PlayoffPickResult = {
  status: PlayoffPickResultStatus
  points: number
  pickTeamName: string | null
  winnerTeamName: string | null
  seriesSummary: string | null
}

export function getPlayoffPickResult(
  series: Pick<PlayoffSeriesView, "winnerTeamName" | "seriesSummary">,
  pick: Pick<PlayoffPickView, "pickTeamName"> | null | undefined,
): PlayoffPickResult {
  const pickTeamName = pick?.pickTeamName?.trim() || null
  const winnerTeamName = series.winnerTeamName?.trim() || null
  const seriesSummary = series.seriesSummary?.trim() || null

  if (!pickTeamName) {
    return { status: "no_pick", points: 0, pickTeamName: null, winnerTeamName, seriesSummary }
  }
  if (!winnerTeamName) {
    return { status: "pending", points: 0, pickTeamName, winnerTeamName: null, seriesSummary }
  }
  if (pickTeamName === winnerTeamName) {
    return { status: "correct", points: 1, pickTeamName, winnerTeamName, seriesSummary }
  }
  return { status: "wrong", points: 0, pickTeamName, winnerTeamName, seriesSummary }
}

export function scorePlayoffEntryPicks(
  series: Array<Pick<PlayoffSeriesView, "id" | "winnerTeamName">>,
  picks: Array<Pick<PlayoffPickView, "seriesId" | "pickTeamName">>
): PlayoffEntryScore {
  const winnerBySeriesId = new Map(
    series
      .filter((item) => typeof item.winnerTeamName === "string" && item.winnerTeamName.trim().length > 0)
      .map((item) => [item.id, item.winnerTeamName?.trim() ?? ""])
  )

  let totalScore = 0
  let correctPicks = 0
  let resolvedPicks = 0

  for (const pick of picks) {
    const winner = winnerBySeriesId.get(pick.seriesId)
    if (!winner) continue
    resolvedPicks += 1
    if (pick.pickTeamName === winner) {
      correctPicks += 1
      totalScore += 1
    }
  }

  return { totalScore, correctPicks, resolvedPicks }
}
