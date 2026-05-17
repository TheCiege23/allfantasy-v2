import "server-only"
import type { LeagueSport } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getLiveScoresForSport, type LiveScoreRow } from "@/lib/sports-live-scores-service"
import { normalizeTeamAbbrev } from "@/lib/team-abbrev"
import type { PlayoffSport } from "./types"

export type PlayoffSeriesSyncGame = {
  homeTeam: string
  awayTeam: string
  homeTeamFull?: string | null
  awayTeamFull?: string | null
  homeScore?: number | null
  awayScore?: number | null
  completed?: boolean
  status?: string | null
  statusDetail?: string | null
  startTime?: string | null
}

export type PlayoffSeriesSyncProvider = (input: {
  sport: PlayoffSport
  seasonYear: number
}) => Promise<{
  source: string
  games: PlayoffSeriesSyncGame[]
  warnings?: string[]
}>

export type SyncPlayoffChallengeSeriesResult = {
  ok: boolean
  challengeId: string
  sport: PlayoffSport
  source: string
  gamesSeen: number
  seriesUpdated: number
  winnersUpdated: number
  warnings: string[]
}

const SPORT_TO_LEAGUE_SPORT: Record<PlayoffSport, LeagueSport> = {
  nba: "NBA",
  nhl: "NHL",
}

function normalizeName(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim()
  return normalizeTeamAbbrev(trimmed) || trimmed
}

function displayName(value: string | null | undefined): string {
  return String(value ?? "").trim()
}

function sameTeam(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase()
}

function rowToSyncGame(row: LiveScoreRow): PlayoffSeriesSyncGame {
  return {
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    homeTeamFull: row.homeTeamFull,
    awayTeamFull: row.awayTeamFull,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    completed: row.completed,
    status: row.status,
    statusDetail: row.statusDetail,
    startTime: row.startTime,
  }
}

export async function fetchLivePlayoffSeriesGames(input: {
  sport: PlayoffSport
  seasonYear: number
}): Promise<{ source: string; games: PlayoffSeriesSyncGame[]; warnings: string[] }> {
  const live = await getLiveScoresForSport({
    sport: SPORT_TO_LEAGUE_SPORT[input.sport],
    forceRefresh: true,
  })

  const games = live.scores
    .filter((row) => row.season === input.seasonYear || !Number.isFinite(row.season))
    .map(rowToSyncGame)

  return {
    source: live.source,
    games,
    warnings: games.length === 0 ? [`No ${input.sport.toUpperCase()} games returned from ${live.source}.`] : [],
  }
}

function statusFromGame(game: PlayoffSeriesSyncGame): "scheduled" | "in_progress" | "final" {
  const status = `${game.status ?? ""} ${game.statusDetail ?? ""}`.toLowerCase()
  if (game.completed || status.includes("final")) return "final"
  if (status.includes("progress") || status.includes("period") || status.includes("intermission") || status.includes("end of")) {
    return "in_progress"
  }
  return "scheduled"
}

function winnerFromGame(game: PlayoffSeriesSyncGame): string | null {
  if (!game.completed) return null
  const homeScore = Number(game.homeScore ?? 0)
  const awayScore = Number(game.awayScore ?? 0)
  if (homeScore === awayScore) return null
  return homeScore > awayScore
    ? displayName(game.homeTeamFull || game.homeTeam)
    : displayName(game.awayTeamFull || game.awayTeam)
}

function findGameForSeries(series: any, games: PlayoffSeriesSyncGame[]): PlayoffSeriesSyncGame | null {
  return games.find((game) => {
    const homeMatchesHome = sameTeam(series.homeTeamName, game.homeTeam) || sameTeam(series.homeTeamName, game.homeTeamFull)
    const awayMatchesAway = sameTeam(series.awayTeamName, game.awayTeam) || sameTeam(series.awayTeamName, game.awayTeamFull)
    const homeMatchesAway = sameTeam(series.homeTeamName, game.awayTeam) || sameTeam(series.homeTeamName, game.awayTeamFull)
    const awayMatchesHome = sameTeam(series.awayTeamName, game.homeTeam) || sameTeam(series.awayTeamName, game.homeTeamFull)
    return (homeMatchesHome && awayMatchesAway) || (homeMatchesAway && awayMatchesHome)
  }) ?? null
}

export async function syncPlayoffChallengeSeries(input: {
  challengeId: string
  provider?: PlayoffSeriesSyncProvider
}): Promise<SyncPlayoffChallengeSeriesResult> {
  const warnings: string[] = []
  const challenge = await (prisma as any).playoffBracketChallenge.findUnique({
    where: { id: input.challengeId },
    include: {
      series: {
        orderBy: [{ roundIndex: "asc" }, { seriesNumber: "asc" }],
      },
    },
  })

  if (!challenge) {
    throw new Error("Challenge not found")
  }

  const sport = String(challenge.sport ?? "").toLowerCase()
  if (sport !== "nba" && sport !== "nhl") {
    throw new Error("Only NBA and NHL playoff sync is supported")
  }

  const provider = input.provider ?? fetchLivePlayoffSeriesGames
  const payload = await provider({
    sport,
    seasonYear: challenge.seasonYear,
  })
  warnings.push(...(payload.warnings ?? []))

  let seriesUpdated = 0
  let winnersUpdated = 0

  for (const series of challenge.series) {
    if (series.sourceSeriesHome || series.sourceSeriesAway) continue
    const game = findGameForSeries(series, payload.games)
    if (!game) continue

    const status = statusFromGame(game)
    const winnerTeamName = winnerFromGame(game)
    const startsAt = game.startTime ? new Date(game.startTime) : null

    await (prisma as any).playoffBracketSeries.update({
      where: { id: series.id },
      data: {
        homeTeamName: displayName(game.homeTeamFull || game.homeTeam),
        awayTeamName: displayName(game.awayTeamFull || game.awayTeam),
        status,
        startsAt,
        winnerTeamName,
      },
    })
    seriesUpdated += 1
    if (winnerTeamName) winnersUpdated += 1
  }

  if (seriesUpdated === 0) {
    warnings.push("No playoff series matched provider games.")
  }

  return {
    ok: warnings.length === 0 || seriesUpdated > 0,
    challengeId: challenge.id,
    sport,
    source: payload.source,
    gamesSeen: payload.games.length,
    seriesUpdated,
    winnersUpdated,
    warnings,
  }
}
