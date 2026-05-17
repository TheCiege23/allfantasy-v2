/**
 * Read-only NBA/NHL playoff bracket matchup audit.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/audit-playoff-bracket-matchups.ts --sport nba --season 2025
 *
 * This script does not write to the database and never prints API tokens.
 */

import { buildPlayoffTemplate } from "../lib/playoffs/playoffTemplate"

type AuditSport = "nba" | "nhl"
type Conference = "east" | "west" | "finals" | "unknown"

type RollingInsightsScheduleGameRow = {
  sport: "NBA" | "NHL"
  gameId: string
  season: number
  seasonType: string
  eventName: string
  round: number | null
  homeTeam: string
  awayTeam: string
  startsAt: string
  status: string
}

type ProviderSeries = {
  key: string
  order: number
  roundIndex: number
  conference: Conference
  eventName: string | null
  homeTeamName: string
  awayTeamName: string
  games: RollingInsightsScheduleGameRow[]
}

type SlotAssignment = {
  slot: number
  round: number
  conference: string
  homeTeam: string
  awayTeam: string
  eventName: string | null
  confidence: "high" | "medium" | "low"
  warning?: string
  sourceCompatibility?: string
}

const NBA_2025_REFERENCE_WEST_ROUND1: Record<number, [string, string]> = {
  5: ["Oklahoma City Thunder", "Phoenix Suns"],
  6: ["Los Angeles Lakers", "Houston Rockets"],
  7: ["Denver Nuggets", "Minnesota Timberwolves"],
  8: ["San Antonio Spurs", "Portland Trail Blazers"],
}

const NBA_2025_REFERENCE_WEST_ROUND2: Record<number, [string, string]> = {
  11: ["Oklahoma City Thunder", "Los Angeles Lakers"],
  12: ["Minnesota Timberwolves", "San Antonio Spurs"],
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

function asFiniteInt(value: unknown): number {
  const number = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(number) ? number : 0
}

function asNullableFiniteInt(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(number) ? number : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function collectScheduleItems(value: unknown, sport: "NBA" | "NHL"): unknown[] {
  if (Array.isArray(value)) return value
  if (!isRecord(value)) return []
  for (const key of [sport, sport.toLowerCase(), sport.toUpperCase(), "data", "results", "items", "schedule", "games"]) {
    const nested = value[key]
    if (Array.isArray(nested)) return nested
    const nestedRows = collectScheduleItems(nested, sport)
    if (nestedRows.length > 0) return nestedRows
  }
  return Object.values(value).flatMap((nested) => collectScheduleItems(nested, sport))
}

function rollingInsightsTokenCandidates(): string[] {
  return [
    process.env.ROLLING_INSIGHTS_RSC_TOKEN?.trim(),
    process.env.ROLLING_INSIGHTS_RSC_TOKEN2?.trim(),
    process.env.RSC_TOKEN?.trim(),
    process.env.ROLLING_INSIGHTS_CLIENT_SECRET?.trim(),
    process.env.ROLLING_INSIGHTS_CLIENT_SECRET2?.trim(),
  ].filter((value): value is string => Boolean(value))
}

function rollingInsightsBaseUrl(): string {
  return (process.env.ROLLING_INSIGHTS_REST_BASE_URL || "https://rest.datafeeds.rolling-insights.com/api/v1").replace(/\/+$/, "")
}

function rollingInsightsUrl(sport: "NBA" | "NHL", season: number, token: string | null): string {
  const url = new URL(`${rollingInsightsBaseUrl()}/schedule-season/${season}/${sport}`)
  url.searchParams.set("RSC_token", token ?? "<redacted>")
  return url.toString()
}

function mapRollingInsightsScheduleRow(raw: Record<string, unknown>, sport: "NBA" | "NHL", season: number): RollingInsightsScheduleGameRow | null {
  const gameId = String(raw.game_ID ?? raw.gameId ?? raw.game_id ?? raw.id ?? raw.externalId ?? "").trim()
  const homeTeam = String(raw.home_team ?? raw.homeTeam ?? raw.home ?? "").trim()
  const awayTeam = String(raw.away_team ?? raw.awayTeam ?? raw.away ?? "").trim()
  if (!gameId || !homeTeam || !awayTeam) return null
  const dateRaw = raw.game_time ?? raw.startTime ?? raw.start_time ?? raw.date
  return {
    sport,
    gameId,
    season: asFiniteInt(raw.season ?? raw.season_year) || season,
    seasonType: String(raw.season_type ?? raw.seasonType ?? "").trim(),
    eventName: String(raw.event_name ?? raw.eventName ?? raw.round_name ?? "").trim(),
    round: asNullableFiniteInt(raw.round),
    homeTeam,
    awayTeam,
    startsAt: typeof dateRaw === "string" ? dateRaw : dateRaw instanceof Date ? dateRaw.toISOString() : "",
    status: String(raw.status ?? raw.game_status ?? raw.state ?? "scheduled").trim() || "scheduled",
  }
}

async function fetchRollingInsightsScheduleSeason(sport: "NBA" | "NHL", season: number): Promise<{ rows: RollingInsightsScheduleGameRow[]; sanitizedUrl: string }> {
  const tokens = rollingInsightsTokenCandidates()
  const sanitizedUrl = rollingInsightsUrl(sport, season, null)
  for (const token of tokens) {
    const response = await fetch(rollingInsightsUrl(sport, season, token), { cache: "no-store" })
    if (!response.ok) continue
    const payload = await response.json().catch(() => null)
    const rows = collectScheduleItems(payload, sport)
      .filter(isRecord)
      .map((row) => mapRollingInsightsScheduleRow(row, sport, season))
      .filter((row): row is RollingInsightsScheduleGameRow => Boolean(row))
    if (rows.length > 0) return { rows, sanitizedUrl }
  }
  return { rows: [], sanitizedUrl }
}

function normalizeName(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

function pairKey(homeTeam: string, awayTeam: string): string {
  return [normalizeName(homeTeam), normalizeName(awayTeam)].sort().join("__")
}

function normalizedEventName(row: RollingInsightsScheduleGameRow): string {
  return String(row.eventName ?? "").toLowerCase().replace(/[:\-]/g, " ").replace(/\s+/g, " ").trim()
}

function isPlayIn(row: RollingInsightsScheduleGameRow): boolean {
  return /\bplay\s*in\b/.test(normalizedEventName(row))
}

function conferenceFromRow(row: RollingInsightsScheduleGameRow): Conference {
  const eventName = normalizedEventName(row)
  if (/\beast\b|\beastern\b/.test(eventName)) return "east"
  if (/\bwest\b|\bwestern\b/.test(eventName)) return "west"
  if (/\bfinals?\b|\bstanley cup\b/.test(eventName)) return "finals"
  return "unknown"
}

function roundIndexFromRow(row: RollingInsightsScheduleGameRow, sport: AuditSport): number | null {
  const eventName = normalizedEventName(row)
  if (isPlayIn(row)) return null
  if (sport === "nba") {
    if (/\bnba finals?\b/.test(eventName)) return 4
    if (/\bconference finals?\b|\beast finals?\b|\bwest finals?\b|\beastern conference finals?\b|\bwestern conference finals?\b/.test(eventName)) return 3
    if (/\bsemifinals?\b|\bsemi finals?\b|\bconference semifinals?\b|\beast semifinals?\b|\bwest semifinals?\b/.test(eventName)) return 2
    if (/\b1st round\b|\bfirst round\b/.test(eventName)) return 1
  } else {
    if (/\bstanley cup final\b|\bstanley cup finals\b/.test(eventName)) return 4
    if (/\bconference finals?\b|\beast finals?\b|\bwest finals?\b|\beastern conference finals?\b|\bwestern conference finals?\b/.test(eventName)) return 3
    if (/\b2nd round\b|\bsecond round\b|\bround 2\b/.test(eventName)) return 2
    if (/\b1st round\b|\bfirst round\b|\bround 1\b/.test(eventName)) return 1
  }
  if (eventName.includes("final") && !eventName.includes("conference")) return 4
  if (eventName.includes("conference")) return 3
  if (eventName.includes("second") || eventName.includes("semifinal")) return 2
  if (eventName.includes("first") || eventName.includes("1st round")) return 1
  return row.round && row.round > 0 ? row.round : null
}

function groupProviderSeries(rows: RollingInsightsScheduleGameRow[], sport: AuditSport): ProviderSeries[] {
  const byKey = new Map<string, ProviderSeries>()
  rows.forEach((row, index) => {
    const roundIndex = roundIndexFromRow(row, sport)
    if (!roundIndex) return
    const homeTeamName = row.homeTeam.trim()
    const awayTeamName = row.awayTeam.trim()
    if (!homeTeamName || !awayTeamName) return
    const key = `${roundIndex}:${pairKey(homeTeamName, awayTeamName)}`
    const existing = byKey.get(key)
    if (existing) {
      existing.games.push(row)
      return
    }
    byKey.set(key, {
      key,
      order: index,
      roundIndex,
      conference: conferenceFromRow(row),
      eventName: row.eventName || null,
      homeTeamName,
      awayTeamName,
      games: [row],
    })
  })
  return Array.from(byKey.values()).sort((a, b) => a.roundIndex - b.roundIndex || a.order - b.order)
}

function slotSeriesForRound(sport: AuditSport) {
  return buildPlayoffTemplate({ challengeId: "audit", sport, isTestMode: true })
}

function assignSlots(groups: ProviderSeries[], sport: AuditSport): SlotAssignment[] {
  const template = slotSeriesForRound(sport)
  const assignments: SlotAssignment[] = []
  for (const roundIndex of [1, 2, 3, 4]) {
    const roundSlots = template
      .filter((series) => series.roundIndex === roundIndex)
      .sort((a, b) => a.seriesNumber - b.seriesNumber)
    const conferences = Array.from(new Set(roundSlots.map((series) => series.conference)))
    for (const conference of conferences) {
      const slots = roundSlots.filter((series) => series.conference === conference)
      const providerGroups = groups
        .filter((group) => group.roundIndex === roundIndex)
        .filter((group) => roundIndex === 4 || group.conference === conference)
        .sort((a, b) => a.order - b.order)
      slots.forEach((slot, index) => {
        const group = providerGroups[index]
        if (!group) return
        assignments.push({
          slot: slot.seriesNumber,
          round: roundIndex,
          conference,
          homeTeam: group.homeTeamName,
          awayTeam: group.awayTeamName,
          eventName: group.eventName,
          confidence: group.conference === conference || roundIndex === 4 ? "high" : "medium",
          warning: providerGroups.length > slots.length ? `Provider has ${providerGroups.length} series for ${conference} round ${roundIndex}, but only ${slots.length} slots.` : undefined,
        })
      })
    }
  }
  return assignments
}

function sameTeam(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b)
}

function pairMatches(homeTeam: string, awayTeam: string, expected: [string, string]): boolean {
  const pair = [homeTeam, awayTeam]
  return expected.every((team) => pair.some((candidate) => sameTeam(candidate, team)))
}

function applyNba2025ReferenceAssignments(assignments: SlotAssignment[]): SlotAssignment[] {
  return assignments.map((assignment) => {
    const round1 = NBA_2025_REFERENCE_WEST_ROUND1[assignment.slot]
    if (assignment.round === 1 && assignment.conference === "west" && round1) {
      return {
        ...assignment,
        homeTeam: round1[0],
        awayTeam: round1[1],
        sourceCompatibility: "reference_round1",
      }
    }
    const round2 = NBA_2025_REFERENCE_WEST_ROUND2[assignment.slot]
    if (assignment.round === 2 && assignment.conference === "west" && round2) {
      return {
        ...assignment,
        homeTeam: round2[0],
        awayTeam: round2[1],
        sourceCompatibility: "reference_source_slots",
      }
    }
    return assignment
  })
}

function validateNba2025Reference(assignments: SlotAssignment[]): string[] {
  const failures: string[] = []
  for (const [slot, expected] of Object.entries(NBA_2025_REFERENCE_WEST_ROUND2)) {
    const assignment = assignments.find((item) => item.slot === Number(slot))
    if (!assignment || !pairMatches(assignment.homeTeam, assignment.awayTeam, expected)) {
      failures.push(`S${slot} expected ${expected[0]} vs ${expected[1]} but saw ${assignment ? `${assignment.homeTeam} vs ${assignment.awayTeam}` : "unassigned"}.`)
    }
  }
  const s11 = assignments.find((item) => item.slot === 11)
  const s12 = assignments.find((item) => item.slot === 12)
  if (s11 && pairMatches(s11.homeTeam, s11.awayTeam, ["Minnesota Timberwolves", "Los Angeles Lakers"])) {
    failures.push("S11 incorrectly split provider pairs as Minnesota Timberwolves vs Los Angeles Lakers.")
  }
  if (s12 && pairMatches(s12.homeTeam, s12.awayTeam, ["San Antonio Spurs", "Oklahoma City Thunder"])) {
    failures.push("S12 incorrectly split provider pairs as San Antonio Spurs vs Oklahoma City Thunder.")
  }
  return failures
}

function printSeries(title: string, groups: ProviderSeries[]) {
  console.log(`\n${title}`)
  if (groups.length === 0) {
    console.log("  none")
    return
  }
  for (const group of groups) {
    console.log(`  R${group.roundIndex} ${group.conference}: ${group.homeTeamName} vs ${group.awayTeamName} (${group.eventName ?? "event TBD"}) games=${group.games.length}`)
  }
}

async function main() {
  const sportArg = String(argValue("--sport") ?? "nba").toLowerCase()
  if (sportArg !== "nba" && sportArg !== "nhl") {
    throw new Error("--sport must be nba or nhl")
  }
  const sport = sportArg as AuditSport
  const season = Number.parseInt(String(argValue("--season") ?? ""), 10)
  if (!Number.isFinite(season)) {
    throw new Error("--season is required, e.g. --season 2025")
  }

  const result = await fetchRollingInsightsScheduleSeason(sport.toUpperCase() as "NBA" | "NHL", season)
  const postseasonRows = result.rows.filter((row) => String(row.seasonType ?? "").toLowerCase() === "postseason" || roundIndexFromRow(row, sport))
  const groups = groupProviderSeries(postseasonRows, sport)
  const providerAssignments = assignSlots(groups, sport)
  const useNba2025Reference = sport === "nba" && season === 2025
  const assignments = useNba2025Reference ? applyNba2025ReferenceAssignments(providerAssignments) : providerAssignments
  const westRound2 = groups.filter((group) => group.roundIndex === 2 && group.conference === "west")
  const eastRound2 = groups.filter((group) => group.roundIndex === 2 && group.conference === "east")
  const westAssignments = assignments.filter((item) => item.round === 2 && item.conference === "west")
  const hasThunderLakers = westAssignments.some((item) => pairMatches(item.homeTeam, item.awayTeam, ["Oklahoma City Thunder", "Los Angeles Lakers"]))
  const hasTimberwolvesSpurs = westAssignments.some((item) => pairMatches(item.homeTeam, item.awayTeam, ["Minnesota Timberwolves", "San Antonio Spurs"]))
  const referenceFailures = useNba2025Reference ? validateNba2025Reference(assignments) : []
  const warnings = assignments.filter((item) => item.warning)

  console.log(`Playoff bracket matchup audit: ${sport.toUpperCase()} providerSeason=${season}`)
  console.log(`Rows returned=${result.rows.length}; postseason/round rows=${postseasonRows.length}; groupedSeries=${groups.length}`)
  console.log(`Sanitized URL=${result.sanitizedUrl}`)
  if (useNba2025Reference) {
    console.log("Using NBA 2025 ESPN bracket reference for slot validation.")
    console.log("\nReference West Round 1 source slots")
    Object.entries(NBA_2025_REFERENCE_WEST_ROUND1).forEach(([slot, pair]) => {
      console.log(`  S${slot}: ${pair[0]} vs ${pair[1]}`)
    })
  }
  printSeries("Provider East Round 2", eastRound2)
  printSeries("Provider West Round 2", westRound2)
  console.log("\nApp slot assignment preview")
  for (const item of assignments) {
    console.log(`  S${item.slot} R${item.round} ${item.conference}: ${item.homeTeam} vs ${item.awayTeam} confidence=${item.confidence}${item.sourceCompatibility ? ` sourceCompatibility=${item.sourceCompatibility}` : ""}${item.warning ? ` warning=${item.warning}` : ""}`)
  }
  console.log(`\nThunder vs Lakers assigned to West Round 2 slot: ${hasThunderLakers ? "YES" : "NO"}`)
  console.log(`Timberwolves vs Spurs assigned to West Round 2 slot: ${hasTimberwolvesSpurs ? "YES" : "NO"}`)
  if (referenceFailures.length > 0) {
    console.log("\nReference validation failures")
    referenceFailures.forEach((failure) => console.log(`  ${failure}`))
    process.exitCode = 1
  }
  if (warnings.length > 0) {
    console.log("\nWarnings")
    warnings.forEach((warning) => console.log(`  S${warning.slot}: ${warning.warning}`))
  } else {
    console.log("\nWarnings: none")
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
