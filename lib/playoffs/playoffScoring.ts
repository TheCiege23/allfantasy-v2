import type { PlayoffPickView, PlayoffSeriesView } from "./types"

export type PlayoffEntryScore = {
  totalScore: number
  correctPicks: number
  resolvedPicks: number
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
