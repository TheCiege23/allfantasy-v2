import "server-only"
import type { LeagueSport } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  fetchEspnScoreboard,
  fetchRollingInsightsScoreboard,
  type LiveScoreRow,
} from "@/lib/sports-live-scores-service"
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

type PlayoffSeriesAggregate = {
  games: PlayoffSeriesSyncGame[]
  homeWins: number
  awayWins: number
  status: "scheduled" | "in_progress" | "final"
  startsAt: Date | null
  winnerTeamName: string | null
  homeTeamName: string
  awayTeamName: string
}

export type PlayoffSeriesSyncProvider = (input: {
  sport: PlayoffSport
  seasonYear: number
  providerPreference?: PlayoffSeriesSyncProviderPreference
}) => Promise<{
  source: string
  games: PlayoffSeriesSyncGame[]
  warnings?: string[]
  attemptedProviders?: string[]
}>

export type PlayoffSeriesSyncProviderPreference = "auto" | "rolling_insights" | "espn"

export type SyncPlayoffChallengeSeriesResult = {
  ok: boolean
  challengeId: string
  sport: PlayoffSport
  source: string
  attemptedProviders: string[]
  gamesSeen: number
  gamesMatched: number
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
  providerPreference?: PlayoffSeriesSyncProviderPreference
}): Promise<{ source: string; games: PlayoffSeriesSyncGame[]; warnings: string[]; attemptedProviders: string[] }> {
  const leagueSport = SPORT_TO_LEAGUE_SPORT[input.sport]
  const providerPreference = input.providerPreference ?? "auto"
  const attemptedProviders: string[] = []
  const providerOrder = providerPreference === "espn"
    ? ["espn_live"]
    : providerPreference === "rolling_insights"
      ? ["rolling_insights"]
      : ["rolling_insights", "espn_live"]
  const providerLabels: Record<string, string> = {
    rolling_insights: "Rolling Insights",
    espn_live: "ESPN",
  }

  for (const providerName of providerOrder) {
    attemptedProviders.push(providerName)
    const rows = providerName === "espn_live"
      ? await fetchEspnScoreboard(leagueSport)
      : await fetchRollingInsightsScoreboard(leagueSport, { forceRefresh: true })
    const games = rows
      .filter((row) => row.season === input.seasonYear || !Number.isFinite(row.season))
      .map(rowToSyncGame)
    if (games.length > 0) {
      return { source: providerName, games, warnings: [], attemptedProviders }
    }
  }

  const attemptedLabels = attemptedProviders.map((providerName) => providerLabels[providerName] ?? providerName)
  return {
    source: attemptedProviders[attemptedProviders.length - 1] ?? "none",
    games: [],
    warnings: [
      `No ${input.sport.toUpperCase()} games returned from ${attemptedLabels.join(" or ")} for season ${input.seasonYear}.`,
    ],
    attemptedProviders,
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

function isFinalGame(game: PlayoffSeriesSyncGame): boolean {
  return statusFromGame(game) === "final"
}

function winnerFromGame(game: PlayoffSeriesSyncGame): string | null {
  if (!isFinalGame(game)) return null
  const homeScore = Number(game.homeScore ?? 0)
  const awayScore = Number(game.awayScore ?? 0)
  if (homeScore === awayScore) return null
  return homeScore > awayScore
    ? displayName(game.homeTeamFull || game.homeTeam)
    : displayName(game.awayTeamFull || game.awayTeam)
}

function gameMatchesSeries(series: any, game: PlayoffSeriesSyncGame): boolean {
    const homeMatchesHome = sameTeam(series.homeTeamName, game.homeTeam) || sameTeam(series.homeTeamName, game.homeTeamFull)
    const awayMatchesAway = sameTeam(series.awayTeamName, game.awayTeam) || sameTeam(series.awayTeamName, game.awayTeamFull)
    const homeMatchesAway = sameTeam(series.homeTeamName, game.awayTeam) || sameTeam(series.homeTeamName, game.awayTeamFull)
    const awayMatchesHome = sameTeam(series.awayTeamName, game.homeTeam) || sameTeam(series.awayTeamName, game.homeTeamFull)
    return (homeMatchesHome && awayMatchesAway) || (homeMatchesAway && awayMatchesHome)
}

function gamesForSeries(series: any, games: PlayoffSeriesSyncGame[]): PlayoffSeriesSyncGame[] {
  return games.filter((game) => gameMatchesSeries(series, game))
}

function earliestStart(games: PlayoffSeriesSyncGame[]): Date | null {
  const times = games
    .map((game) => game.startTime ? new Date(game.startTime).getTime() : Number.NaN)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  return times.length > 0 ? new Date(times[0]) : null
}

function aggregateSeriesGames(series: any, games: PlayoffSeriesSyncGame[]): PlayoffSeriesAggregate | null {
  if (games.length === 0) return null
  const homeTeamName = displayName(games[0].homeTeamFull || games[0].homeTeam || series.homeTeamName)
  const awayTeamName = displayName(games[0].awayTeamFull || games[0].awayTeam || series.awayTeamName)
  const bestOf = Number(series.bestOf ?? 7)
  const winsNeeded = Math.floor(bestOf / 2) + 1
  let homeWins = 0
  let awayWins = 0
  let hasLive = false
  let hasScheduled = false

  for (const game of games) {
    const status = statusFromGame(game)
    if (status === "in_progress") hasLive = true
    if (status === "scheduled") hasScheduled = true
    if (!isFinalGame(game)) continue
    const winner = winnerFromGame(game)
    if (!winner) continue
    if (sameTeam(winner, series.homeTeamName) || sameTeam(winner, game.homeTeam) || sameTeam(winner, game.homeTeamFull)) {
      homeWins += 1
    } else if (sameTeam(winner, series.awayTeamName) || sameTeam(winner, game.awayTeam) || sameTeam(winner, game.awayTeamFull)) {
      awayWins += 1
    }
  }

  const winnerTeamName = homeWins >= winsNeeded
    ? displayName(series.homeTeamName || homeTeamName)
    : awayWins >= winsNeeded
      ? displayName(series.awayTeamName || awayTeamName)
      : null
  const status = winnerTeamName
    ? "final"
    : hasLive
      ? "in_progress"
      : hasScheduled
        ? "scheduled"
        : homeWins > 0 || awayWins > 0
          ? "in_progress"
          : "scheduled"

  return {
    games,
    homeWins,
    awayWins,
    status,
    startsAt: earliestStart(games),
    winnerTeamName,
    homeTeamName,
    awayTeamName,
  }
}

function gameKey(game: PlayoffSeriesSyncGame): string {
  return [
    normalizeName(game.homeTeamFull || game.homeTeam).toLowerCase(),
    normalizeName(game.awayTeamFull || game.awayTeam).toLowerCase(),
    game.startTime ?? "",
  ].join("|")
}

export async function syncPlayoffChallengeSeries(input: {
  challengeId: string
  provider?: PlayoffSeriesSyncProvider
  providerPreference?: PlayoffSeriesSyncProviderPreference
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
    providerPreference: input.providerPreference ?? "auto",
  })
  const attemptedProviders = payload.attemptedProviders ?? [payload.source].filter(Boolean)
  warnings.push(...(payload.warnings ?? []))

  let seriesUpdated = 0
  let winnersUpdated = 0
  let gamesMatched = 0
  const matchedGameKeys = new Set<string>()

  for (const series of challenge.series) {
    if (series.sourceSeriesHome || series.sourceSeriesAway) continue
    const seriesGames = gamesForSeries(series, payload.games)
    const aggregate = aggregateSeriesGames(series, seriesGames)
    if (!aggregate) continue
    gamesMatched += seriesGames.length
    for (const game of seriesGames) {
      matchedGameKeys.add(gameKey(game))
    }

    await (prisma as any).playoffBracketSeries.update({
      where: { id: series.id },
      data: {
        homeTeamName: displayName(series.homeTeamName || aggregate.homeTeamName),
        awayTeamName: displayName(series.awayTeamName || aggregate.awayTeamName),
        status: aggregate.status,
        startsAt: aggregate.startsAt,
        winnerTeamName: aggregate.winnerTeamName,
      },
    })
    seriesUpdated += 1
    if (aggregate.winnerTeamName) winnersUpdated += 1
  }

  if (seriesUpdated === 0) {
    warnings.push("No playoff series matched provider games.")
  }
  const unmatchedGames = payload.games.filter((game) => !matchedGameKeys.has(gameKey(game)))
  if (unmatchedGames.length > 0) {
    warnings.push(`${unmatchedGames.length} provider games did not match playoff series.`)
  }

  return {
    ok: warnings.length === 0 || seriesUpdated > 0,
    challengeId: challenge.id,
    sport,
    source: payload.source,
    attemptedProviders,
    gamesSeen: payload.games.length,
    gamesMatched,
    seriesUpdated,
    winnersUpdated,
    warnings,
  }
}
