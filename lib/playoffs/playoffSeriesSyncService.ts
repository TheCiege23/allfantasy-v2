import "server-only"
import type { LeagueSport } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  fetchEspnScoreboard,
  fetchRollingInsightsScheduleSeason,
  fetchRollingInsightsScoreboard,
  type LiveScoreRow,
  type RollingInsightsScheduleGameRow,
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
  providerRound?: number | null
  eventName?: string | null
  seasonType?: string | null
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
  roundIndex: number
}

type ProviderSeriesGroup = {
  key: string
  roundIndex: number
  homeTeamName: string
  awayTeamName: string
  games: PlayoffSeriesSyncGame[]
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
  diagnostics?: PlayoffSyncDiagnostics
}>

export type PlayoffSeriesSyncProviderPreference = "auto" | "rolling_insights" | "espn"

type ProviderAttemptDiagnostic = {
  provider: string
  source: string
  seasonYear: number
  sport: PlayoffSport
  gamesReturned: number
  postseasonGames: number
  warning?: string
}

type TeamPairDiagnostic = {
  round?: number | null
  homeTeam: string
  awayTeam: string
  eventName?: string | null
  status?: string | null
}

export type PlayoffSyncDiagnostics = {
  seasonYear: number
  sport: PlayoffSport
  selectedProvider: string
  providerAttempts: ProviderAttemptDiagnostic[]
  existingSeriesExamples: TeamPairDiagnostic[]
  providerGameExamples: TeamPairDiagnostic[]
  providerSeriesExamples: TeamPairDiagnostic[]
}

export type SyncPlayoffChallengeSeriesResult = {
  ok: boolean
  challengeId: string
  sport: PlayoffSport
  source: string
  attemptedProviders: string[]
  postseasonGames: number
  gamesSeen: number
  gamesMatched: number
  seriesReturned: number
  seriesMatched: number
  seriesUpdated: number
  winnersUpdated: number
  warnings: string[]
  unmatchedExamples: Array<{ homeTeam: string; awayTeam: string; eventName?: string | null; round?: number | null }>
  diagnostics: PlayoffSyncDiagnostics
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

function isPlaceholderTeamName(value: string | null | undefined): boolean {
  const name = String(value ?? "").trim()
  return /^([A-Z]+[0-9]+|Winner\s+S\d+|Winner\s+\w+)$/i.test(name)
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

function scheduleRowToSyncGame(row: RollingInsightsScheduleGameRow): PlayoffSeriesSyncGame {
  return {
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    homeTeamFull: row.homeTeam,
    awayTeamFull: row.awayTeam,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    completed: row.completed,
    status: row.status,
    statusDetail: row.status,
    startTime: row.startsAt,
    providerRound: row.round,
    eventName: row.eventName,
    seasonType: row.seasonType,
  }
}

function isPostseasonRow(row: RollingInsightsScheduleGameRow): boolean {
  return row.seasonType.toLowerCase() === "postseason"
}

export async function fetchRollingInsightsPostseasonScheduleGames(input: {
  sport: PlayoffSport
  seasonYear: number
}): Promise<{ source: string; games: PlayoffSeriesSyncGame[]; warnings: string[]; attemptedProviders: string[]; diagnostics: PlayoffSyncDiagnostics }> {
  const leagueSport = SPORT_TO_LEAGUE_SPORT[input.sport]
  const rows = await fetchRollingInsightsScheduleSeason(leagueSport, input.seasonYear, { forceRefresh: true })
  const postseasonRows = rows.filter(isPostseasonRow)
  const games = postseasonRows.map(scheduleRowToSyncGame)
  const warnings = postseasonRows.length === 0
    ? [`No ${input.sport.toUpperCase()} postseason games returned from Rolling Insights schedule-season for season ${input.seasonYear}.`]
    : []
  return {
    source: "rolling_insights_schedule_season",
    games,
    warnings,
    attemptedProviders: ["rolling_insights_schedule_season"],
    diagnostics: {
      seasonYear: input.seasonYear,
      sport: input.sport,
      selectedProvider: "rolling_insights_schedule_season",
      providerAttempts: [{
        provider: "rolling_insights_schedule_season",
        source: "rolling_insights_schedule_season",
        seasonYear: input.seasonYear,
        sport: input.sport,
        gamesReturned: rows.length,
        postseasonGames: games.length,
        warning: warnings[0],
      }],
      existingSeriesExamples: [],
      providerGameExamples: sampleGameDiagnostics(games),
      providerSeriesExamples: sampleSeriesDiagnostics(buildProviderSeriesGroups(games)),
    },
  }
}

export async function fetchLivePlayoffSeriesGames(input: {
  sport: PlayoffSport
  seasonYear: number
  providerPreference?: PlayoffSeriesSyncProviderPreference
}): Promise<{ source: string; games: PlayoffSeriesSyncGame[]; warnings: string[]; attemptedProviders: string[]; diagnostics: PlayoffSyncDiagnostics }> {
  const leagueSport = SPORT_TO_LEAGUE_SPORT[input.sport]
  const providerPreference = input.providerPreference ?? "auto"
  const attemptedProviders: string[] = []
  const providerAttempts: ProviderAttemptDiagnostic[] = []
  const providerOrder = providerPreference === "espn"
    ? ["espn_live"]
    : providerPreference === "rolling_insights"
      ? ["rolling_insights_schedule_season", "rolling_insights"]
      : ["rolling_insights_schedule_season", "rolling_insights", "espn_live"]
  const providerLabels: Record<string, string> = {
    rolling_insights_schedule_season: "Rolling Insights schedule-season",
    rolling_insights: "Rolling Insights",
    espn_live: "ESPN",
  }

  for (const providerName of providerOrder) {
    attemptedProviders.push(providerName)
    const games = providerName === "rolling_insights_schedule_season"
      ? (await fetchRollingInsightsPostseasonScheduleGames(input)).games
      : (providerName === "espn_live"
        ? await fetchEspnScoreboard(leagueSport)
        : await fetchRollingInsightsScoreboard(leagueSport, { forceRefresh: true }))
          .filter((row) => row.season === input.seasonYear || !Number.isFinite(row.season))
          .map(rowToSyncGame)
    providerAttempts.push({
      provider: providerName,
      source: providerName,
      seasonYear: input.seasonYear,
      sport: input.sport,
      gamesReturned: games.length,
      postseasonGames: games.filter((game) => String(game.seasonType ?? "").toLowerCase() === "postseason").length,
      warning: games.length === 0 ? `${providerName} returned no usable ${input.sport.toUpperCase()} games for season ${input.seasonYear}.` : undefined,
    })
    if (games.length > 0) {
      return {
        source: providerName,
        games,
        warnings: [],
        attemptedProviders,
        diagnostics: {
          seasonYear: input.seasonYear,
          sport: input.sport,
          selectedProvider: providerName,
          providerAttempts,
          existingSeriesExamples: [],
          providerGameExamples: sampleGameDiagnostics(games),
          providerSeriesExamples: sampleSeriesDiagnostics(buildProviderSeriesGroups(games)),
        },
      }
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
    diagnostics: {
      seasonYear: input.seasonYear,
      sport: input.sport,
      selectedProvider: attemptedProviders[attemptedProviders.length - 1] ?? "none",
      providerAttempts,
      existingSeriesExamples: [],
      providerGameExamples: [],
      providerSeriesExamples: [],
    },
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
  return games.filter((game) => {
    if (Number.isFinite(Number(game.providerRound)) && Number(game.providerRound) !== Number(series.roundIndex)) {
      return false
    }
    return gameMatchesSeries(series, game)
  })
}

function roundIndexFromGame(game: PlayoffSeriesSyncGame): number | null {
  const explicit = Number(game.providerRound)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  const eventName = String(game.eventName ?? "").toLowerCase()
  if (eventName.includes("final") && !eventName.includes("conference")) return 4
  if (eventName.includes("conference")) return 3
  if (eventName.includes("second") || eventName.includes("semifinal") || eventName.includes("semifinals")) return 2
  if (eventName.includes("first")) return 1
  return null
}

function pairKey(homeTeam: string | null | undefined, awayTeam: string | null | undefined): string {
  return [normalizeName(homeTeam).toLowerCase(), normalizeName(awayTeam).toLowerCase()].sort().join("__")
}

function buildProviderSeriesGroups(games: PlayoffSeriesSyncGame[]): ProviderSeriesGroup[] {
  const byKey = new Map<string, ProviderSeriesGroup>()
  for (const game of games) {
    const roundIndex = roundIndexFromGame(game)
    if (!roundIndex) continue
    const homeTeamName = displayName(game.homeTeamFull || game.homeTeam)
    const awayTeamName = displayName(game.awayTeamFull || game.awayTeam)
    if (!homeTeamName || !awayTeamName) continue
    const key = `${roundIndex}:${pairKey(homeTeamName, awayTeamName)}`
    const existing = byKey.get(key)
    if (existing) {
      existing.games.push(game)
      continue
    }
    byKey.set(key, {
      key,
      roundIndex,
      homeTeamName,
      awayTeamName,
      games: [game],
    })
  }
  return Array.from(byKey.values()).sort((a, b) => a.roundIndex - b.roundIndex || a.key.localeCompare(b.key))
}

function sampleGameDiagnostics(games: PlayoffSeriesSyncGame[]): TeamPairDiagnostic[] {
  return games.slice(0, 3).map((game) => ({
    round: game.providerRound ?? null,
    homeTeam: displayName(game.homeTeamFull || game.homeTeam),
    awayTeam: displayName(game.awayTeamFull || game.awayTeam),
    eventName: game.eventName ?? null,
    status: game.status ?? game.statusDetail ?? null,
  }))
}

function sampleSeriesDiagnostics(groups: ProviderSeriesGroup[]): TeamPairDiagnostic[] {
  return groups.slice(0, 3).map((group) => ({
    round: group.roundIndex,
    homeTeam: group.homeTeamName,
    awayTeam: group.awayTeamName,
    eventName: group.games[0]?.eventName ?? null,
    status: group.games[0]?.status ?? group.games[0]?.statusDetail ?? null,
  }))
}

function sampleExistingSeriesDiagnostics(series: any[]): TeamPairDiagnostic[] {
  return series.slice(0, 5).map((item) => ({
    round: Number(item.roundIndex ?? null),
    homeTeam: displayName(item.homeTeamName),
    awayTeam: displayName(item.awayTeamName),
    eventName: null,
    status: item.status ?? null,
  }))
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
    roundIndex: Number(series.roundIndex ?? roundIndexFromGame(games[0]) ?? 0),
  }
}

function aggregateProviderSeriesGroup(group: ProviderSeriesGroup, bestOf = 7): PlayoffSeriesAggregate {
  return aggregateSeriesGames(
    {
      roundIndex: group.roundIndex,
      homeTeamName: group.homeTeamName,
      awayTeamName: group.awayTeamName,
      bestOf,
    },
    group.games
  ) ?? {
    games: group.games,
    homeWins: 0,
    awayWins: 0,
    status: "scheduled",
    startsAt: earliestStart(group.games),
    winnerTeamName: null,
    homeTeamName: group.homeTeamName,
    awayTeamName: group.awayTeamName,
    roundIndex: group.roundIndex,
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
  const diagnostics: PlayoffSyncDiagnostics = {
    seasonYear: challenge.seasonYear,
    sport,
    selectedProvider: payload.source,
    providerAttempts: payload.diagnostics?.providerAttempts ?? [],
    existingSeriesExamples: sampleExistingSeriesDiagnostics(challenge.series),
    providerGameExamples: payload.diagnostics?.providerGameExamples?.length
      ? payload.diagnostics.providerGameExamples
      : sampleGameDiagnostics(payload.games),
    providerSeriesExamples: payload.diagnostics?.providerSeriesExamples?.length
      ? payload.diagnostics.providerSeriesExamples
      : [],
  }

  let seriesUpdated = 0
  let winnersUpdated = 0
  let gamesMatched = 0
  let seriesMatched = 0
  const matchedGameKeys = new Set<string>()
  const providerSeriesGroups = buildProviderSeriesGroups(payload.games)
  diagnostics.providerSeriesExamples = sampleSeriesDiagnostics(providerSeriesGroups)
  const usedGroupKeys = new Set<string>()
  const invalidatedSeriesIds = new Set<string>()

  for (const series of challenge.series) {
    if (series.sourceSeriesHome || series.sourceSeriesAway) {
      continue
    }
    const seriesGames = gamesForSeries(series, payload.games)
    let aggregate = aggregateSeriesGames(series, seriesGames)
    let matchedGroup: ProviderSeriesGroup | null = null
    if (!aggregate) {
      matchedGroup = providerSeriesGroups.find((group) => {
        if (usedGroupKeys.has(group.key)) return false
        if (group.roundIndex !== Number(series.roundIndex)) return false
        if (gameMatchesSeries(series, group.games[0])) return true
        return isPlaceholderTeamName(series.homeTeamName) || isPlaceholderTeamName(series.awayTeamName)
      }) ?? null
      if (matchedGroup) {
        aggregate = aggregateProviderSeriesGroup(matchedGroup, Number(series.bestOf ?? 7))
        usedGroupKeys.add(matchedGroup.key)
      }
    }
    if (!aggregate) continue
    const aggregateGames = matchedGroup?.games ?? seriesGames
    gamesMatched += aggregateGames.length
    seriesMatched += 1
    for (const game of aggregateGames) {
      matchedGameKeys.add(gameKey(game))
    }
    const previousTeams = [series.homeTeamName, series.awayTeamName].map((name) => normalizeName(name).toLowerCase())
    const nextTeams = [aggregate.homeTeamName, aggregate.awayTeamName].map((name) => normalizeName(name).toLowerCase())
    const teamsChanged = !previousTeams.every((name) => nextTeams.includes(name))
    if (teamsChanged) {
      invalidatedSeriesIds.add(series.id)
    }

    await (prisma as any).playoffBracketSeries.update({
      where: { id: series.id },
      data: {
        homeTeamName: aggregate.homeTeamName,
        awayTeamName: aggregate.awayTeamName,
        status: aggregate.status,
        startsAt: aggregate.startsAt,
        winnerTeamName: aggregate.winnerTeamName,
      },
    })
    seriesUpdated += 1
    if (aggregate.winnerTeamName) winnersUpdated += 1
  }

  if (invalidatedSeriesIds.size > 0) {
    const officialTeamNames = Array.from(new Set(providerSeriesGroups.flatMap((group) => [group.homeTeamName, group.awayTeamName])))
    await (prisma as any).playoffBracketPick.deleteMany({
      where: {
        challengeId: challenge.id,
        seriesId: { in: Array.from(invalidatedSeriesIds) },
        NOT: {
          pickTeamName: {
            in: officialTeamNames,
          },
        },
      },
    })
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
    postseasonGames: payload.games.filter((game) => String(game.seasonType ?? "").toLowerCase() === "postseason").length,
    gamesSeen: payload.games.length,
    gamesMatched,
    seriesReturned: providerSeriesGroups.length,
    seriesMatched,
    seriesUpdated,
    winnersUpdated,
    warnings,
    unmatchedExamples: unmatchedGames.slice(0, 5).map((game) => ({
      homeTeam: displayName(game.homeTeamFull || game.homeTeam),
      awayTeam: displayName(game.awayTeamFull || game.awayTeam),
      eventName: game.eventName ?? null,
      round: game.providerRound ?? null,
    })),
    diagnostics,
  }
}
