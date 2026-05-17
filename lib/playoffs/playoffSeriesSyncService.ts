import "server-only"
import type { LeagueSport } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  fetchEspnScoreboard,
  fetchRollingInsightsScheduleSeasonWithDiagnostics,
  fetchRollingInsightsScoreboard,
  type LiveScoreRow,
  type RollingInsightsScheduleShapeDiagnostics,
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
  venue?: string | null
  broadcast?: string | null
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
  seriesSummary: string
  nextGameAt: Date | null
  venue: string | null
  broadcastNetwork: string | null
  liveHomeScore: number | null
  liveAwayScore: number | null
  liveStatus: string | null
  providerGamesJson: unknown[]
}

type ProviderSeriesGroup = {
  key: string
  roundIndex: number
  conference: "east" | "west" | null
  eventName: string | null
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

export type PlayoffSeriesSyncMode = "schedule_only" | "official_bracket" | "autofill_results"

type ProviderAttemptDiagnostic = {
  provider: string
  source: string
  seasonYear: number
  sport: PlayoffSport
  gamesReturned: number
  postseasonGames: number
  warning?: string
}

type ProviderSeasonAttemptDiagnostic = {
  provider: string
  seasonYear: number
  rowsReturned: number
  postseasonRows: number
  warning?: string
  responseShape?: RollingInsightsScheduleShapeDiagnostics
}

type TeamPairDiagnostic = {
  round?: number | null
  homeTeam: string
  awayTeam: string
  eventName?: string | null
  status?: string | null
}

type EventNameRoundMapDiagnostic = {
  eventName: string | null
  round: number | null
  ignored?: boolean
}

type UpdatedSeriesDiagnostic = {
  round: number
  oldHomeTeam: string
  oldAwayTeam: string
  newHomeTeam: string
  newAwayTeam: string
  eventName?: string | null
  status?: string | null
}

export type PlayoffSyncDiagnostics = {
  seasonYear: number
  challengeSeasonYear: number
  selectedProviderSeason: number | null
  providerSeasonAttempts: ProviderSeasonAttemptDiagnostic[]
  seasonSelectionExplanation?: string | null
  sport: PlayoffSport
  selectedProvider: string
  providerAttempts: ProviderAttemptDiagnostic[]
  existingSeriesExamples: TeamPairDiagnostic[]
  providerGameExamples: TeamPairDiagnostic[]
  providerSeriesExamples: TeamPairDiagnostic[]
  ignoredPlayInGames: number
  eventNameRoundMapExamples: EventNameRoundMapDiagnostic[]
  providerSeriesByRound: Record<string, number>
  templateReplacementCount: number
  updatedSeriesExamples: UpdatedSeriesDiagnostic[]
  noMatchReason?: string | null
}

export type SyncPlayoffChallengeSeriesResult = {
  ok: boolean
  challengeId: string
  sport: PlayoffSport
  mode: PlayoffSeriesSyncMode
  source: string
  challengeSeasonYear: number
  selectedProviderSeason: number | null
  providerSeasonAttempts: ProviderSeasonAttemptDiagnostic[]
  attemptedProviders: string[]
  postseasonGames: number
  gamesSeen: number
  gamesMatched: number
  seriesReturned: number
  seriesMatched: number
  seriesUpdated: number
  winnersUpdated: number
  picksAutoFilled: number
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

function isTemplateSeries(series: any): boolean {
  return isPlaceholderTeamName(series.homeTeamName) || isPlaceholderTeamName(series.awayTeamName)
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
    venue: row.venue,
    broadcast: row.broadcast,
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
    statusDetail: row.statusDetail ?? row.status,
    startTime: row.startsAt,
    venue: row.venue,
    broadcast: row.broadcast,
    providerRound: row.round,
    eventName: row.eventName,
    seasonType: row.seasonType,
  }
}

function isPostseasonRow(row: RollingInsightsScheduleGameRow): boolean {
  return row.seasonType.toLowerCase() === "postseason"
}

function candidateProviderSeasons(seasonYear: number): number[] {
  const currentYear = new Date().getUTCFullYear()
  return Array.from(new Set([seasonYear, seasonYear - 1, currentYear, currentYear - 1].filter(Number.isFinite)))
}

function seasonSelectionExplanation(challengeSeasonYear: number, selectedProviderSeason: number | null): string | null {
  if (!selectedProviderSeason || selectedProviderSeason === challengeSeasonYear) return null
  return `Rolling Insights uses season start year; ${selectedProviderSeason} was selected for the ${selectedProviderSeason}-${String(challengeSeasonYear).slice(-2)} season.`
}

export async function fetchRollingInsightsPostseasonScheduleGames(input: {
  sport: PlayoffSport
  seasonYear: number
}): Promise<{ source: string; games: PlayoffSeriesSyncGame[]; warnings: string[]; attemptedProviders: string[]; diagnostics: PlayoffSyncDiagnostics }> {
  const leagueSport = SPORT_TO_LEAGUE_SPORT[input.sport]
  const providerSeasonAttempts: ProviderSeasonAttemptDiagnostic[] = []
  let selectedRows: RollingInsightsScheduleGameRow[] = []
  let selectedProviderSeason: number | null = null
  for (const providerSeason of candidateProviderSeasons(input.seasonYear)) {
    const result = await fetchRollingInsightsScheduleSeasonWithDiagnostics(leagueSport, providerSeason)
    const rows = result.rows
    const postseasonRows = rows.filter(isPostseasonRow)
    providerSeasonAttempts.push({
      provider: "rolling_insights_schedule_season",
      seasonYear: providerSeason,
      rowsReturned: rows.length,
      postseasonRows: postseasonRows.length,
      warning: postseasonRows.length === 0
        ? `No ${input.sport.toUpperCase()} postseason games returned from Rolling Insights schedule-season for season ${providerSeason}.`
        : undefined,
      responseShape: rows.length <= 1 || postseasonRows.length === 0 ? result.diagnostics : undefined,
    })
    if (postseasonRows.length > 0) {
      selectedRows = postseasonRows
      selectedProviderSeason = providerSeason
      break
    }
  }
  const games = selectedRows.map(scheduleRowToSyncGame)
  const warnings = games.length === 0
    ? [`No ${input.sport.toUpperCase()} postseason games returned from Rolling Insights schedule-season for candidate seasons ${providerSeasonAttempts.map((attempt) => attempt.seasonYear).join(", ")}.`]
    : []
  const explanation = seasonSelectionExplanation(input.seasonYear, selectedProviderSeason)
  return {
    source: "rolling_insights_schedule_season",
    games,
    warnings,
    attemptedProviders: ["rolling_insights_schedule_season"],
    diagnostics: {
      seasonYear: input.seasonYear,
      challengeSeasonYear: input.seasonYear,
      selectedProviderSeason,
      providerSeasonAttempts,
      seasonSelectionExplanation: explanation,
      sport: input.sport,
      selectedProvider: "rolling_insights_schedule_season",
      providerAttempts: [{
        provider: "rolling_insights_schedule_season",
        source: "rolling_insights_schedule_season",
        seasonYear: selectedProviderSeason ?? input.seasonYear,
        sport: input.sport,
        gamesReturned: selectedRows.length,
        postseasonGames: games.length,
        warning: warnings[0],
      }],
      existingSeriesExamples: [],
      providerGameExamples: sampleGameDiagnostics(games),
      providerSeriesExamples: sampleSeriesDiagnostics(buildProviderSeriesGroups(games, input.sport)),
      ignoredPlayInGames: games.filter(isPlayInGame).length,
      eventNameRoundMapExamples: sampleEventNameRoundDiagnostics(games, input.sport),
      providerSeriesByRound: providerSeriesByRound(buildProviderSeriesGroups(games, input.sport)),
      templateReplacementCount: 0,
      updatedSeriesExamples: [],
      noMatchReason: null,
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
  let providerSeasonAttempts: ProviderSeasonAttemptDiagnostic[] = []
  const providerOrder = providerPreference === "espn"
    ? ["espn_live"]
    : providerPreference === "rolling_insights"
      ? ["rolling_insights_schedule_season", "rolling_insights"]
      : ["rolling_insights_schedule_season", "rolling_insights"]
  const providerLabels: Record<string, string> = {
    rolling_insights_schedule_season: "Rolling Insights schedule-season",
    rolling_insights: "Rolling Insights",
    espn_live: "ESPN",
  }

  for (const providerName of providerOrder) {
    attemptedProviders.push(providerName)
    const schedulePayload = providerName === "rolling_insights_schedule_season"
      ? await fetchRollingInsightsPostseasonScheduleGames(input)
      : null
    if (schedulePayload) {
      providerSeasonAttempts = schedulePayload.diagnostics.providerSeasonAttempts
    }
    const games = schedulePayload
      ? schedulePayload.games
      : (providerName === "espn_live"
          ? await fetchEspnScoreboard(leagueSport)
          : await fetchRollingInsightsScoreboard(leagueSport, { forceRefresh: true }))
        .filter((row) => row.season === input.seasonYear || !Number.isFinite(row.season))
        .map(rowToSyncGame)
    providerAttempts.push({
      provider: providerName,
      source: providerName,
      seasonYear: schedulePayload?.diagnostics.selectedProviderSeason ?? input.seasonYear,
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
          challengeSeasonYear: input.seasonYear,
          selectedProviderSeason: schedulePayload?.diagnostics.selectedProviderSeason ?? input.seasonYear,
          providerSeasonAttempts: schedulePayload?.diagnostics.providerSeasonAttempts ?? [],
          seasonSelectionExplanation: schedulePayload?.diagnostics.seasonSelectionExplanation ?? null,
          sport: input.sport,
          selectedProvider: providerName,
          providerAttempts: schedulePayload?.diagnostics.providerAttempts ?? providerAttempts,
          existingSeriesExamples: [],
          providerGameExamples: sampleGameDiagnostics(games),
          providerSeriesExamples: sampleSeriesDiagnostics(buildProviderSeriesGroups(games, input.sport)),
          ignoredPlayInGames: games.filter(isPlayInGame).length,
          eventNameRoundMapExamples: sampleEventNameRoundDiagnostics(games, input.sport),
          providerSeriesByRound: providerSeriesByRound(buildProviderSeriesGroups(games, input.sport)),
          templateReplacementCount: 0,
          updatedSeriesExamples: [],
          noMatchReason: null,
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
      challengeSeasonYear: input.seasonYear,
      selectedProviderSeason: null,
      providerSeasonAttempts: providerAttempts
        .filter((attempt) => attempt.provider === "rolling_insights_schedule_season")
        .length > 0
          ? providerSeasonAttempts
          : [],
      seasonSelectionExplanation: null,
      sport: input.sport,
      selectedProvider: attemptedProviders[attemptedProviders.length - 1] ?? "none",
      providerAttempts,
      existingSeriesExamples: [],
      providerGameExamples: [],
      providerSeriesExamples: [],
      ignoredPlayInGames: 0,
      eventNameRoundMapExamples: [],
      providerSeriesByRound: {},
      templateReplacementCount: 0,
      updatedSeriesExamples: [],
      noMatchReason: null,
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

function normalizedEventName(game: PlayoffSeriesSyncGame): string {
  return String(game.eventName ?? "").toLowerCase().replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim()
}

function isPlayInGame(game: PlayoffSeriesSyncGame): boolean {
  return /\bplay\s*in\b/.test(normalizedEventName(game))
}

function conferenceFromEventName(game: PlayoffSeriesSyncGame): "east" | "west" | null {
  const eventName = normalizedEventName(game)
  if (/\beast\b|\beastern\b/.test(eventName)) return "east"
  if (/\bwest\b|\bwestern\b/.test(eventName)) return "west"
  return null
}

function roundIndexFromGame(game: PlayoffSeriesSyncGame, sport?: PlayoffSport): number | null {
  const eventName = normalizedEventName(game)
  if (isPlayInGame(game)) return null
  if (sport === "nba") {
    if (/\bnba finals?\b/.test(eventName)) return 4
    if (/\bconference finals?\b|\beast finals?\b|\bwest finals?\b|\beastern conference finals?\b|\bwestern conference finals?\b/.test(eventName)) return 3
    if (/\bsemifinals?\b|\bsemi finals?\b|\bconference semifinals?\b|\beast semifinals?\b|\bwest semifinals?\b/.test(eventName)) return 2
    if (/\b1st round\b|\bfirst round\b/.test(eventName)) return 1
  } else if (sport === "nhl") {
    if (/\bstanley cup final\b|\bstanley cup finals\b/.test(eventName)) return 4
    if (/\bconference finals?\b|\beast finals?\b|\bwest finals?\b|\beastern conference finals?\b|\bwestern conference finals?\b/.test(eventName)) return 3
    if (/\b2nd round\b|\bsecond round\b|\bround 2\b/.test(eventName)) return 2
    if (/\b1st round\b|\bfirst round\b|\bround 1\b/.test(eventName)) return 1
  }
  if (eventName.includes("final") && !eventName.includes("conference")) return 4
  if (eventName.includes("conference")) return 3
  if (eventName.includes("second") || eventName.includes("semifinal") || eventName.includes("semifinals")) return 2
  if (eventName.includes("first") || eventName.includes("1st round")) return 1
  const explicit = Number(game.providerRound)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  return null
}

function pairKey(homeTeam: string | null | undefined, awayTeam: string | null | undefined): string {
  return [normalizeName(homeTeam).toLowerCase(), normalizeName(awayTeam).toLowerCase()].sort().join("__")
}

function buildProviderSeriesGroups(games: PlayoffSeriesSyncGame[], sport?: PlayoffSport): ProviderSeriesGroup[] {
  const byKey = new Map<string, ProviderSeriesGroup>()
  for (const game of games) {
    const roundIndex = roundIndexFromGame(game, sport)
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
      conference: conferenceFromEventName(game),
      eventName: game.eventName ?? null,
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
    eventName: group.eventName ?? group.games[0]?.eventName ?? null,
    status: group.games[0]?.status ?? group.games[0]?.statusDetail ?? null,
  }))
}

function sampleEventNameRoundDiagnostics(games: PlayoffSeriesSyncGame[], sport: PlayoffSport): EventNameRoundMapDiagnostic[] {
  const byName = new Map<string, EventNameRoundMapDiagnostic>()
  for (const game of games) {
    const eventName = game.eventName ?? null
    const key = String(eventName ?? "")
    if (byName.has(key)) continue
    byName.set(key, {
      eventName,
      round: roundIndexFromGame(game, sport),
      ignored: isPlayInGame(game) || undefined,
    })
    if (byName.size >= 12) break
  }
  return Array.from(byName.values())
}

function providerSeriesByRound(groups: ProviderSeriesGroup[]): Record<string, number> {
  return groups.reduce<Record<string, number>>((acc, group) => {
    const key = String(group.roundIndex)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

function sortSeriesForReplacement(series: any[]): any[] {
  return [...series].sort((a, b) => {
    const conferenceA = String(a.conference ?? "")
    const conferenceB = String(b.conference ?? "")
    if (conferenceA !== conferenceB) return conferenceA.localeCompare(conferenceB)
    return Number(a.seriesNumber ?? 0) - Number(b.seriesNumber ?? 0)
  })
}

function sortProviderGroupsForReplacement(groups: ProviderSeriesGroup[]): ProviderSeriesGroup[] {
  return [...groups].sort((a, b) => {
    const conferenceA = a.conference ?? ""
    const conferenceB = b.conference ?? ""
    if (conferenceA !== conferenceB) return conferenceA.localeCompare(conferenceB)
    return a.key.localeCompare(b.key)
  })
}

function mapTemplateReplacementGroups(seriesList: any[], groups: ProviderSeriesGroup[]): Map<string, ProviderSeriesGroup> {
  const map = new Map<string, ProviderSeriesGroup>()
  for (const roundIndex of [1, 2, 3, 4]) {
    const roundSeries = sortSeriesForReplacement(
      seriesList.filter((series) => Number(series.roundIndex) === roundIndex)
    )
    if (roundSeries.length === 0) continue
    const roundGroups = groups.filter((group) => group.roundIndex === roundIndex)
    if (roundGroups.length === 0) continue
    assignReplacementGroupsByConference(map, roundSeries, roundGroups)
    if (roundIndex === 4 && !Array.from(map.keys()).some((id) => roundSeries.some((series) => series.id === id)) && roundGroups.length >= roundSeries.length) {
      sortSeriesForReplacement(roundSeries).forEach((series, index) => {
        const group = sortProviderGroupsForReplacement(roundGroups)[index]
        if (group) map.set(series.id, group)
      })
    }
  }
  return map
}

function assignReplacementGroupsByConference(map: Map<string, ProviderSeriesGroup>, roundSeries: any[], roundGroups: ProviderSeriesGroup[]) {
  const groupsByConference = new Map<string, ProviderSeriesGroup[]>()
  for (const group of roundGroups) {
    const key = group.conference ?? "unknown"
    groupsByConference.set(key, [...(groupsByConference.get(key) ?? []), group])
  }

  for (const conference of new Set(roundSeries.map((series) => String(series.conference ?? "unknown")))) {
    const seriesForConference = roundSeries.filter((series) => String(series.conference ?? "unknown") === conference)
    const groupsForConference = sortProviderGroupsForReplacement(groupsByConference.get(conference) ?? [])
    if (groupsForConference.length === 0) continue
    if (groupsForConference.length < seriesForConference.length) continue
    seriesForConference.forEach((series, index) => {
      const group = groupsForConference[index]
      if (group) map.set(series.id, group)
    })
  }
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

function gameStartTime(game: PlayoffSeriesSyncGame): number {
  return game.startTime ? new Date(game.startTime).getTime() : Number.NaN
}

function nextScheduledGame(games: PlayoffSeriesSyncGame[]): PlayoffSeriesSyncGame | null {
  const now = Date.now()
  return games
    .filter((game) => {
      const status = statusFromGame(game)
      const start = gameStartTime(game)
      return status === "in_progress" || status === "scheduled" && (!Number.isFinite(start) || start >= now)
    })
    .sort((a, b) => {
      const aStatus = statusFromGame(a)
      const bStatus = statusFromGame(b)
      if (aStatus !== bStatus) return aStatus === "in_progress" ? -1 : 1
      return (gameStartTime(a) || Number.MAX_SAFE_INTEGER) - (gameStartTime(b) || Number.MAX_SAFE_INTEGER)
    })[0] ?? null
}

function liveGame(games: PlayoffSeriesSyncGame[]): PlayoffSeriesSyncGame | null {
  return games.find((game) => statusFromGame(game) === "in_progress") ?? null
}

function buildSeriesSummary(homeTeamName: string, awayTeamName: string, homeWins: number, awayWins: number, winnerTeamName: string | null): string {
  if (winnerTeamName) {
    const verb = winnerTeamName.toLowerCase().endsWith("s") ? "win" : "wins"
    return `${winnerTeamName} ${verb} series ${homeWins}-${awayWins}`
  }
  if (homeWins === 0 && awayWins === 0) return "Series starts TBD"
  if (homeWins === awayWins) return `Series tied ${homeWins}-${awayWins}`
  const leader = homeWins > awayWins ? homeTeamName : awayTeamName
  return `${leader} leads series ${Math.max(homeWins, awayWins)}-${Math.min(homeWins, awayWins)}`
}

function safeProviderGame(game: PlayoffSeriesSyncGame) {
  return {
    homeTeam: displayName(game.homeTeamFull || game.homeTeam),
    awayTeam: displayName(game.awayTeamFull || game.awayTeam),
    homeScore: game.homeScore ?? null,
    awayScore: game.awayScore ?? null,
    status: game.status ?? null,
    statusDetail: game.statusDetail ?? null,
    startTime: game.startTime ?? null,
    venue: game.venue ?? null,
    broadcast: game.broadcast ?? null,
    eventName: game.eventName ?? null,
    seasonType: game.seasonType ?? null,
  }
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

  const nextGame = nextScheduledGame(games)
  const activeGame = liveGame(games)
  const seriesSummary = buildSeriesSummary(homeTeamName, awayTeamName, homeWins, awayWins, winnerTeamName)

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
    seriesSummary,
    nextGameAt: nextGame?.startTime ? new Date(nextGame.startTime) : null,
    venue: nextGame?.venue ?? null,
    broadcastNetwork: nextGame?.broadcast ?? null,
    liveHomeScore: activeGame?.homeScore ?? null,
    liveAwayScore: activeGame?.awayScore ?? null,
    liveStatus: activeGame?.statusDetail ?? activeGame?.status ?? null,
    providerGamesJson: games.map(safeProviderGame),
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
    seriesSummary: "Series starts TBD",
    nextGameAt: earliestStart(group.games),
    venue: null,
    broadcastNetwork: null,
    liveHomeScore: null,
    liveAwayScore: null,
    liveStatus: null,
    providerGamesJson: group.games.map(safeProviderGame),
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
  mode?: PlayoffSeriesSyncMode
}): Promise<SyncPlayoffChallengeSeriesResult> {
  const warnings: string[] = []
  const mode = input.mode ?? "official_bracket"
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

  if (mode === "autofill_results" && !challenge.isTestMode) {
    throw new Error("Auto-fill official results is only available for commissioner test pools")
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
    challengeSeasonYear: payload.diagnostics?.challengeSeasonYear ?? challenge.seasonYear,
    selectedProviderSeason: payload.diagnostics?.selectedProviderSeason ?? null,
    providerSeasonAttempts: payload.diagnostics?.providerSeasonAttempts ?? [],
    seasonSelectionExplanation: payload.diagnostics?.seasonSelectionExplanation ?? null,
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
    ignoredPlayInGames: payload.diagnostics?.ignoredPlayInGames ?? payload.games.filter(isPlayInGame).length,
    eventNameRoundMapExamples: payload.diagnostics?.eventNameRoundMapExamples ?? sampleEventNameRoundDiagnostics(payload.games, sport),
    providerSeriesByRound: payload.diagnostics?.providerSeriesByRound ?? {},
    templateReplacementCount: 0,
    updatedSeriesExamples: [],
    noMatchReason: null,
  }

  let seriesUpdated = 0
  let winnersUpdated = 0
  let gamesMatched = 0
  let seriesMatched = 0
  const matchedGameKeys = new Set<string>()
  const providerSeriesGroups = buildProviderSeriesGroups(payload.games, sport)
  diagnostics.providerSeriesExamples = sampleSeriesDiagnostics(providerSeriesGroups)
  diagnostics.providerSeriesByRound = providerSeriesByRound(providerSeriesGroups)
  const usedGroupKeys = new Set<string>()
  const invalidatedSeriesIds = new Set<string>()
  const templateReplacementGroups = mapTemplateReplacementGroups(challenge.series, providerSeriesGroups)
  let templateReplacementCount = 0
  const updatedSeriesExamples: UpdatedSeriesDiagnostic[] = []
  const officialWinnerBySeriesId = new Map<string, string>()

  for (const series of challenge.series) {
    const replacementGroup = templateReplacementGroups.get(series.id) ?? null
    const seriesGames = gamesForSeries(series, payload.games)
    let matchedGroup: ProviderSeriesGroup | null = replacementGroup
    let aggregate = matchedGroup ? aggregateProviderSeriesGroup(matchedGroup, Number(series.bestOf ?? 7)) : aggregateSeriesGames(series, seriesGames)
    if (matchedGroup) {
      usedGroupKeys.add(matchedGroup.key)
      templateReplacementCount += 1
    }
    if (!aggregate) {
      matchedGroup = templateReplacementGroups.get(series.id) ?? providerSeriesGroups.find((group) => {
        if (usedGroupKeys.has(group.key)) return false
        if (group.roundIndex !== Number(series.roundIndex)) return false
        if (gameMatchesSeries(series, group.games[0])) return true
        return isTemplateSeries(series)
      }) ?? null
      if (matchedGroup) {
        aggregate = aggregateProviderSeriesGroup(matchedGroup, Number(series.bestOf ?? 7))
        usedGroupKeys.add(matchedGroup.key)
        if (templateReplacementGroups.get(series.id)?.key === matchedGroup.key) {
          templateReplacementCount += 1
        }
      }
    }
    if (!aggregate) continue
    const aggregateGames = matchedGroup?.games ?? seriesGames
    gamesMatched += aggregateGames.length
    seriesMatched += 1
    for (const game of aggregateGames) {
      matchedGameKeys.add(gameKey(game))
    }
    const shouldUpdateOfficialTeams = mode !== "schedule_only"
    const nextHomeTeamName = shouldUpdateOfficialTeams ? aggregate.homeTeamName : series.homeTeamName
    const nextAwayTeamName = shouldUpdateOfficialTeams ? aggregate.awayTeamName : series.awayTeamName
    const previousTeams = [series.homeTeamName, series.awayTeamName].map((name) => normalizeName(name).toLowerCase())
    const nextTeams = [nextHomeTeamName, nextAwayTeamName].map((name) => normalizeName(name).toLowerCase())
    const teamsChanged = !previousTeams.every((name) => nextTeams.includes(name))
    if (shouldUpdateOfficialTeams && teamsChanged) {
      invalidatedSeriesIds.add(series.id)
    }

    await (prisma as any).playoffBracketSeries.update({
      where: { id: series.id },
      data: {
        homeTeamName: nextHomeTeamName,
        awayTeamName: nextAwayTeamName,
        status: aggregate.status,
        startsAt: aggregate.startsAt,
        winnerTeamName: aggregate.winnerTeamName,
        homeTeamWins: aggregate.homeWins,
        awayTeamWins: aggregate.awayWins,
        seriesSummary: aggregate.seriesSummary,
        nextGameAt: aggregate.nextGameAt,
        venue: aggregate.venue,
        broadcastNetwork: aggregate.broadcastNetwork,
        liveHomeScore: aggregate.liveHomeScore,
        liveAwayScore: aggregate.liveAwayScore,
        liveStatus: aggregate.liveStatus,
        providerGamesJson: aggregate.providerGamesJson,
        lastSyncedAt: new Date(),
      },
    })
    seriesUpdated += 1
    if (updatedSeriesExamples.length < 8) {
      updatedSeriesExamples.push({
        round: Number(series.roundIndex ?? aggregate.roundIndex),
        oldHomeTeam: displayName(series.homeTeamName),
        oldAwayTeam: displayName(series.awayTeamName),
        newHomeTeam: nextHomeTeamName,
        newAwayTeam: nextAwayTeamName,
        eventName: matchedGroup?.eventName ?? aggregateGames[0]?.eventName ?? null,
        status: aggregate.status,
      })
    }
    if (aggregate.winnerTeamName) winnersUpdated += 1
    if (aggregate.winnerTeamName) {
      officialWinnerBySeriesId.set(series.id, aggregate.winnerTeamName)
    }
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

  let picksAutoFilled = 0
  if (mode === "autofill_results") {
    const entries = await (prisma as any).playoffBracketEntry.findMany({
      where: { challengeId: challenge.id },
      select: { id: true },
    })
    for (const entry of entries) {
      for (const [seriesId, winnerTeamName] of officialWinnerBySeriesId) {
        await (prisma as any).playoffBracketPick.upsert({
          where: {
            entryId_seriesId: {
              entryId: entry.id,
              seriesId,
            },
          },
          create: {
            challengeId: challenge.id,
            entryId: entry.id,
            seriesId,
            pickTeamName: winnerTeamName,
          },
          update: {
            pickTeamName: winnerTeamName,
          },
        })
        picksAutoFilled += 1
      }
    }
  }

  if (seriesUpdated === 0) {
    warnings.push("No playoff series matched provider games.")
    diagnostics.noMatchReason = providerSeriesGroups.length === 0
      ? "No provider playoff series could be built after event name round mapping."
      : "Provider playoff series were built, but none matched existing bracket series or eligible template slots."
  }
  diagnostics.templateReplacementCount = templateReplacementCount
  diagnostics.updatedSeriesExamples = updatedSeriesExamples
  const unmatchedGames = payload.games.filter((game) => !matchedGameKeys.has(gameKey(game)))
  const ignoredPlayInGames = unmatchedGames.filter(isPlayInGame)
  const trueUnmatchedGames = unmatchedGames.filter((game) => !isPlayInGame(game))
  diagnostics.ignoredPlayInGames = ignoredPlayInGames.length
  if (ignoredPlayInGames.length > 0) {
    warnings.push(`${ignoredPlayInGames.length} Play-In games ignored because this pool does not include Play-In picks.`)
  }
  if (trueUnmatchedGames.length > 0) {
    warnings.push(`${trueUnmatchedGames.length} provider games did not match playoff series.`)
  }

  return {
    ok: warnings.length === 0 || seriesUpdated > 0,
    challengeId: challenge.id,
    sport,
    mode,
    source: payload.source,
    challengeSeasonYear: challenge.seasonYear,
    selectedProviderSeason: diagnostics.selectedProviderSeason,
    providerSeasonAttempts: diagnostics.providerSeasonAttempts,
    attemptedProviders,
    postseasonGames: payload.games.filter((game) => String(game.seasonType ?? "").toLowerCase() === "postseason").length,
    gamesSeen: payload.games.length,
    gamesMatched,
    seriesReturned: providerSeriesGroups.length,
    seriesMatched,
    seriesUpdated,
    winnersUpdated,
    picksAutoFilled,
    warnings,
    unmatchedExamples: trueUnmatchedGames.slice(0, 5).map((game) => ({
      homeTeam: displayName(game.homeTeamFull || game.homeTeam),
      awayTeam: displayName(game.awayTeamFull || game.awayTeam),
      eventName: game.eventName ?? null,
      round: game.providerRound ?? null,
    })),
    diagnostics,
  }
}
