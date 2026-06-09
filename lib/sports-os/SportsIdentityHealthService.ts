import "server-only"

import { prisma } from "@/lib/prisma"

export type SportsIdentityHealthStatus = "ready" | "partial" | "missing"

export type SportsIdentityHealthRow = {
  id: string
  sport: string
  label: string
  playerCount: number
  teamCount: number
  canonicalIdentityCount: number
  playersMissingProviderIds: number
  playersMissingTeam: number
  playersMissingPosition: number
  playersMissingStatus: number
  duplicatePlayerNameGroups: number
  duplicateTeamIdentityGroups: number
  duplicateProviderMappingGroups: number
  unmappedProviderPlayers: number
  unmappedProviderTeams: number
  inactiveOrUnknownPlayers: number
  activeStatusTeamMismatches: number
  teamMappingMismatches: number
  status: SportsIdentityHealthStatus
  topProblems: string[]
}

export type SportsImageHealthRow = {
  id: string
  sport: string
  label: string
  playersMissingHeadshots: number
  teamsMissingLogos: number
  duplicateHeadshotGroups: number
  duplicateLogoGroups: number
  invalidHeadshotUrlPatterns: number
  invalidLogoUrlPatterns: number
  status: SportsIdentityHealthStatus
  topProblems: string[]
}

export type SportsDataQualityProblem = {
  id: string
  sport: string
  label: string
  severity: "high" | "medium" | "low"
  category: "identity" | "image" | "provider"
  message: string
  count: number
  recommendation: string
}

export type SportsProviderMappingHealthRow = {
  id: string
  sport: string
  label: string
  provider: string
  providerPlayerRows: number
  mappedPlayerIds: number
  unmappedProviderPlayers: number
  providerTeamRows: number
  mappedTeamRows: number
  unmappedProviderTeams: number
  duplicatePlayerMappingGroups: number
  duplicateTeamMappingGroups: number
  status: SportsIdentityHealthStatus
}

export type SportsIdentityHealthSnapshot = {
  generatedAt: string
  summary: {
    sportsAudited: number
    totalPlayers: number
    totalTeams: number
    identityProblems: number
    imageProblems: number
    providerMappingProblems: number
    readySports: number
    partialSports: number
    missingSports: number
  }
  rows: SportsIdentityHealthRow[]
  imageRows: SportsImageHealthRow[]
  providerRows: SportsProviderMappingHealthRow[]
  topProblems: SportsDataQualityProblem[]
}

export type SportsProviderMappingAggregate = {
  provider: string
  providerPlayerRows?: number | null
  mappedPlayerIds?: number | null
  unmappedProviderPlayers?: number | null
  providerTeamRows?: number | null
  mappedTeamRows?: number | null
  unmappedProviderTeams?: number | null
  duplicatePlayerMappingGroups?: number | null
  duplicateTeamMappingGroups?: number | null
}

export type SportsIdentityHealthAggregate = {
  id: string
  sport: string
  label: string
  playerCount?: number | null
  sportsPlayerRecordCount?: number | null
  teamCount?: number | null
  teamAssetCount?: number | null
  canonicalIdentityCount?: number | null
  playersMissingProviderIds?: number | null
  playersMissingTeam?: number | null
  playerRecordsMissingTeam?: number | null
  playersMissingPosition?: number | null
  playerRecordsMissingPosition?: number | null
  playersMissingStatus?: number | null
  duplicatePlayerNameGroups?: number | null
  duplicateTeamIdentityGroups?: number | null
  duplicateProviderMappingGroups?: number | null
  unmappedProviderPlayers?: number | null
  unmappedProviderTeams?: number | null
  inactiveOrUnknownPlayers?: number | null
  activeStatusTeamMismatches?: number | null
  teamMappingMismatches?: number | null
  playersMissingHeadshots?: number | null
  playerRecordsMissingHeadshots?: number | null
  teamsMissingLogos?: number | null
  teamAssetsMissingLogos?: number | null
  duplicateHeadshotGroups?: number | null
  duplicateLogoGroups?: number | null
  invalidHeadshotUrlPatterns?: number | null
  invalidLogoUrlPatterns?: number | null
  providerMappings?: SportsProviderMappingAggregate[]
}

const PROVIDER_MAPPINGS = [
  { provider: "Sleeper", playerField: "sleeperId", aliases: ["sleeper"] },
  { provider: "FantasyCalc", playerField: "fantasyCalcId", aliases: ["fantasycalc", "fantasy_calc"] },
  { provider: "Rolling Insights", playerField: "rollingInsightsId", aliases: ["rollinginsights", "rolling_insights"] },
  { provider: "API-Sports", playerField: "apiSportsId", aliases: ["api_sports", "apisports", "api-football", "api_football"] },
  { provider: "ESPN", playerField: "espnId", aliases: ["espn"] },
  { provider: "ClearSports", playerField: "clearSportsId", aliases: ["clearsports", "clear_sports"] },
  { provider: "MFL", playerField: "mflId", aliases: ["mfl"] },
  { provider: "Fleaflicker", playerField: "fleaflickerId", aliases: ["fleaflicker"] },
] as const

const SPORTS_TO_AUDIT = [
  { id: "nfl", sport: "NFL", label: "NFL" },
  { id: "mlb", sport: "MLB", label: "MLB" },
  { id: "nba", sport: "NBA", label: "NBA" },
  { id: "nhl", sport: "NHL", label: "NHL" },
  { id: "ncaaf", sport: "NCAAF", label: "NCAAF" },
  { id: "ncaab", sport: "NCAAB", label: "NCAAB" },
  { id: "soccer", sport: "SOCCER", label: "Soccer" },
  { id: "world-cup", sport: "WC_SOCCER", label: "World Cup" },
]

function n(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function statusFor(playerCount: number, problemCount: number): SportsIdentityHealthStatus {
  if (playerCount <= 0) return "missing"
  if (problemCount <= 0) return "ready"
  return "partial"
}

function pushProblem(
  target: string[],
  label: string,
  count: number,
  limit = 4
) {
  if (count > 0 && target.length < limit) target.push(`${label}: ${count}`)
}

function problemSeverity(count: number, total: number): SportsDataQualityProblem["severity"] {
  if (count >= 100 || (total > 0 && count / total >= 0.2)) return "high"
  if (count >= 10 || (total > 0 && count / total >= 0.05)) return "medium"
  return "low"
}

function topProblem(input: {
  id: string
  sport: string
  label: string
  category: SportsDataQualityProblem["category"]
  count: number
  total: number
  message: string
  recommendation: string
}): SportsDataQualityProblem | null {
  if (input.count <= 0) return null
  return {
    id: input.id,
    sport: input.sport,
    label: input.label,
    category: input.category,
    count: input.count,
    severity: problemSeverity(input.count, input.total),
    message: input.message,
    recommendation: input.recommendation,
  }
}

export function buildSportsIdentityHealthSnapshot(input: {
  rows: SportsIdentityHealthAggregate[]
  now?: Date
}): SportsIdentityHealthSnapshot {
  const rows: SportsIdentityHealthRow[] = input.rows.map((row) => {
    const playerCount = n(row.playerCount) + n(row.sportsPlayerRecordCount)
    const teamCount = n(row.teamCount) + n(row.teamAssetCount)
    const playersMissingTeam = n(row.playersMissingTeam) + n(row.playerRecordsMissingTeam)
    const playersMissingPosition = n(row.playersMissingPosition) + n(row.playerRecordsMissingPosition)
    const problemCount =
      n(row.playersMissingProviderIds) +
      playersMissingTeam +
      playersMissingPosition +
      n(row.playersMissingStatus) +
      n(row.duplicatePlayerNameGroups) +
      n(row.duplicateTeamIdentityGroups) +
      n(row.duplicateProviderMappingGroups) +
      n(row.unmappedProviderPlayers) +
      n(row.unmappedProviderTeams) +
      n(row.inactiveOrUnknownPlayers) +
      n(row.activeStatusTeamMismatches) +
      n(row.teamMappingMismatches)
    const topProblems: string[] = []
    pushProblem(topProblems, "Missing provider ids", n(row.playersMissingProviderIds))
    pushProblem(topProblems, "Missing team", playersMissingTeam)
    pushProblem(topProblems, "Missing position", playersMissingPosition)
    pushProblem(topProblems, "Duplicate player names", n(row.duplicatePlayerNameGroups))
    pushProblem(topProblems, "Duplicate team identity", n(row.duplicateTeamIdentityGroups))
    pushProblem(topProblems, "Duplicate provider mappings", n(row.duplicateProviderMappingGroups))
    pushProblem(topProblems, "Unmapped provider players", n(row.unmappedProviderPlayers))
    pushProblem(topProblems, "Unmapped provider teams", n(row.unmappedProviderTeams))
    pushProblem(topProblems, "Inactive/unknown status", n(row.inactiveOrUnknownPlayers))
    pushProblem(topProblems, "Team mapping mismatch", n(row.teamMappingMismatches))
    return {
      id: row.id,
      sport: row.sport,
      label: row.label,
      playerCount,
      teamCount,
      canonicalIdentityCount: n(row.canonicalIdentityCount),
      playersMissingProviderIds: n(row.playersMissingProviderIds),
      playersMissingTeam,
      playersMissingPosition,
      playersMissingStatus: n(row.playersMissingStatus),
      duplicatePlayerNameGroups: n(row.duplicatePlayerNameGroups),
      duplicateTeamIdentityGroups: n(row.duplicateTeamIdentityGroups),
      duplicateProviderMappingGroups: n(row.duplicateProviderMappingGroups),
      unmappedProviderPlayers: n(row.unmappedProviderPlayers),
      unmappedProviderTeams: n(row.unmappedProviderTeams),
      inactiveOrUnknownPlayers: n(row.inactiveOrUnknownPlayers),
      activeStatusTeamMismatches: n(row.activeStatusTeamMismatches),
      teamMappingMismatches: n(row.teamMappingMismatches),
      status: statusFor(playerCount, problemCount),
      topProblems,
    }
  })

  const imageRows: SportsImageHealthRow[] = input.rows.map((row) => {
    const playerCount = n(row.playerCount) + n(row.sportsPlayerRecordCount)
    const playersMissingHeadshots = n(row.playersMissingHeadshots) + n(row.playerRecordsMissingHeadshots)
    const teamsMissingLogos = n(row.teamsMissingLogos) + n(row.teamAssetsMissingLogos)
    const problemCount =
      playersMissingHeadshots +
      teamsMissingLogos +
      n(row.duplicateHeadshotGroups) +
      n(row.duplicateLogoGroups) +
      n(row.invalidHeadshotUrlPatterns) +
      n(row.invalidLogoUrlPatterns)
    const topProblems: string[] = []
    pushProblem(topProblems, "Missing headshots", playersMissingHeadshots)
    pushProblem(topProblems, "Missing logos", teamsMissingLogos)
    pushProblem(topProblems, "Duplicate headshot URLs", n(row.duplicateHeadshotGroups))
    pushProblem(topProblems, "Duplicate logo URLs", n(row.duplicateLogoGroups))
    pushProblem(topProblems, "Invalid headshot URL patterns", n(row.invalidHeadshotUrlPatterns))
    pushProblem(topProblems, "Invalid logo URL patterns", n(row.invalidLogoUrlPatterns))
    return {
      id: row.id,
      sport: row.sport,
      label: row.label,
      playersMissingHeadshots,
      teamsMissingLogos,
      duplicateHeadshotGroups: n(row.duplicateHeadshotGroups),
      duplicateLogoGroups: n(row.duplicateLogoGroups),
      invalidHeadshotUrlPatterns: n(row.invalidHeadshotUrlPatterns),
      invalidLogoUrlPatterns: n(row.invalidLogoUrlPatterns),
      status: statusFor(playerCount, problemCount),
      topProblems,
    }
  })

  const providerRows: SportsProviderMappingHealthRow[] = input.rows.flatMap((row) => {
    const providerMappings = row.providerMappings ?? []
    return providerMappings.map((provider) => {
      const unmappedProviderPlayers =
        n(provider.unmappedProviderPlayers) ||
        Math.max(0, n(provider.providerPlayerRows) - n(provider.mappedPlayerIds))
      const unmappedProviderTeams =
        n(provider.unmappedProviderTeams) ||
        Math.max(0, n(provider.providerTeamRows) - n(provider.mappedTeamRows))
      const problemCount =
        unmappedProviderPlayers +
        unmappedProviderTeams +
        n(provider.duplicatePlayerMappingGroups) +
        n(provider.duplicateTeamMappingGroups)

      return {
        id: `${row.id}:${provider.provider.toLowerCase().replace(/\s+/g, "-")}`,
        sport: row.sport,
        label: row.label,
        provider: provider.provider,
        providerPlayerRows: n(provider.providerPlayerRows),
        mappedPlayerIds: n(provider.mappedPlayerIds),
        unmappedProviderPlayers,
        providerTeamRows: n(provider.providerTeamRows),
        mappedTeamRows: n(provider.mappedTeamRows),
        unmappedProviderTeams,
        duplicatePlayerMappingGroups: n(provider.duplicatePlayerMappingGroups),
        duplicateTeamMappingGroups: n(provider.duplicateTeamMappingGroups),
        status: statusFor(n(provider.providerPlayerRows) + n(provider.providerTeamRows), problemCount),
      }
    })
  })

  const topProblems = rows
    .flatMap((row) => [
      topProblem({
        id: `${row.id}:missing-provider-ids`,
        sport: row.sport,
        label: row.label,
        category: "identity" as const,
        count: row.playersMissingProviderIds,
        total: Math.max(row.canonicalIdentityCount, row.playerCount),
        message: "Players missing every tracked provider id.",
        recommendation: "Backfill PlayerIdentityMap provider ids before cross-provider AI comparisons.",
      }),
      topProblem({
        id: `${row.id}:duplicate-player-names`,
        sport: row.sport,
        label: row.label,
        category: "identity" as const,
        count: row.duplicatePlayerNameGroups,
        total: row.playerCount,
        message: "Duplicate player names within the same sport.",
        recommendation: "Require canonical id resolution before Trade Analyzer or Draft Advisor uses exact player facts.",
      }),
      topProblem({
        id: `${row.id}:duplicate-team-identities`,
        sport: row.sport,
        label: row.label,
        category: "identity" as const,
        count: row.duplicateTeamIdentityGroups,
        total: row.teamCount,
        message: "Duplicate team names or team assets within the same sport.",
        recommendation: "Resolve duplicate team identity rows before logos, schedules, and live score joins render.",
      }),
      topProblem({
        id: `${row.id}:team-mismatch`,
        sport: row.sport,
        label: row.label,
        category: "identity" as const,
        count: row.teamMappingMismatches,
        total: row.playerCount,
        message: "Player team values do not match known team codes/names.",
        recommendation: "Backfill team aliases and normalize provider team abbreviations before live launch.",
      }),
      topProblem({
        id: `${row.id}:inactive-unknown-status`,
        sport: row.sport,
        label: row.label,
        category: "identity" as const,
        count: row.inactiveOrUnknownPlayers,
        total: row.playerCount,
        message: "Cached player statuses are inactive, retired, or unknown.",
        recommendation: "Keep these players out of exact-answer AI contexts unless their current status is refreshed.",
      }),
    ])
    .concat(
      providerRows.flatMap((row) => [
        topProblem({
          id: `${row.id}:unmapped-provider-players`,
          sport: row.sport,
          label: `${row.label} ${row.provider}`,
          category: "provider" as const,
          count: row.unmappedProviderPlayers,
          total: row.providerPlayerRows,
          message: "Provider player rows are not mapped to canonical player identities.",
          recommendation: "Backfill provider ids in PlayerIdentityMap before using this provider for AI grounding.",
        }),
        topProblem({
          id: `${row.id}:duplicate-provider-player-maps`,
          sport: row.sport,
          label: `${row.label} ${row.provider}`,
          category: "provider" as const,
          count: row.duplicatePlayerMappingGroups,
          total: row.mappedPlayerIds,
          message: "Multiple canonical identities share the same provider player id.",
          recommendation: "Resolve duplicate provider ids before using cross-provider stat or injury facts.",
        }),
      ])
    )
    .concat(
      imageRows.flatMap((row) => [
        topProblem({
          id: `${row.id}:missing-headshots`,
          sport: row.sport,
          label: row.label,
          category: "image" as const,
          count: row.playersMissingHeadshots,
          total: rows.find((identity) => identity.id === row.id)?.playerCount ?? 0,
          message: "Players missing usable headshot URLs.",
          recommendation: "Backfill from configured media providers or show deterministic initials fallback.",
        }),
        topProblem({
          id: `${row.id}:missing-logos`,
          sport: row.sport,
          label: row.label,
          category: "image" as const,
          count: row.teamsMissingLogos,
          total: rows.find((identity) => identity.id === row.id)?.teamCount ?? 0,
          message: "Teams missing logo URLs.",
          recommendation: "Backfill TeamAsset/SportsTeam logo fields before premium UI demos.",
        }),
        topProblem({
          id: `${row.id}:duplicate-headshots`,
          sport: row.sport,
          label: row.label,
          category: "image" as const,
          count: row.duplicateHeadshotGroups,
          total: rows.find((identity) => identity.id === row.id)?.playerCount ?? 0,
          message: "The same headshot URL is shared by multiple players.",
          recommendation: "Audit duplicated media values before exposing player images in draft/trade tools.",
        }),
      ])
    )
    .filter((problem): problem is SportsDataQualityProblem => Boolean(problem))
    .sort((a, b) => {
      const severityScore = { high: 3, medium: 2, low: 1 }
      return severityScore[b.severity] - severityScore[a.severity] || b.count - a.count
    })
    .slice(0, 12)

  const summaryStatuses = rows.map((row) => row.status)
  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    summary: {
      sportsAudited: rows.length,
      totalPlayers: rows.reduce((sum, row) => sum + row.playerCount, 0),
      totalTeams: rows.reduce((sum, row) => sum + row.teamCount, 0),
      identityProblems: rows.reduce(
        (sum, row) =>
          sum +
          row.playersMissingProviderIds +
          row.playersMissingTeam +
          row.playersMissingPosition +
          row.playersMissingStatus +
          row.duplicatePlayerNameGroups +
          row.duplicateTeamIdentityGroups +
          row.duplicateProviderMappingGroups +
          row.unmappedProviderPlayers +
          row.unmappedProviderTeams +
          row.inactiveOrUnknownPlayers +
          row.activeStatusTeamMismatches +
          row.teamMappingMismatches,
        0
      ),
      imageProblems: imageRows.reduce(
        (sum, row) =>
          sum +
          row.playersMissingHeadshots +
          row.teamsMissingLogos +
          row.duplicateHeadshotGroups +
          row.duplicateLogoGroups +
          row.invalidHeadshotUrlPatterns +
          row.invalidLogoUrlPatterns,
        0
      ),
      providerMappingProblems: providerRows.reduce(
        (sum, row) =>
          sum +
          row.unmappedProviderPlayers +
          row.unmappedProviderTeams +
          row.duplicatePlayerMappingGroups +
          row.duplicateTeamMappingGroups,
        0
      ),
      readySports: summaryStatuses.filter((status) => status === "ready").length,
      partialSports: summaryStatuses.filter((status) => status === "partial").length,
      missingSports: summaryStatuses.filter((status) => status === "missing").length,
    },
    rows,
    imageRows,
    providerRows,
    topProblems,
  }
}

type CountDelegate = {
  count: (args?: Record<string, unknown>) => Promise<number>
}

type FindManyDelegate = {
  findMany: (args?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
}

type GroupByDelegate = {
  groupBy: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
}

function delegate<T>(name: string): T | null {
  return ((prisma as unknown as Record<string, unknown>)[name] as T | undefined) ?? null
}

async function safeCount(modelName: string, args?: Record<string, unknown>): Promise<number> {
  const model = delegate<CountDelegate>(modelName)
  if (!model?.count) return 0
  try {
    return await model.count(args)
  } catch {
    return 0
  }
}

async function safeFindMany(modelName: string, args?: Record<string, unknown>): Promise<Array<Record<string, unknown>>> {
  const model = delegate<FindManyDelegate>(modelName)
  if (!model?.findMany) return []
  try {
    return await model.findMany(args)
  } catch {
    return []
  }
}

async function duplicateGroupCount(modelName: string, field: string, where: Record<string, unknown>): Promise<number> {
  const model = delegate<GroupByDelegate>(modelName)
  if (!model?.groupBy) return 0
  try {
    const rows = await model.groupBy({
      by: [field],
      where,
      _count: { _all: true },
    })
    return rows.filter((row) => {
      const value = row[field]
      const count = (row._count as { _all?: number } | undefined)?._all ?? 0
      return value != null && String(value).trim().length > 0 && count > 1
    }).length
  } catch {
    return 0
  }
}

async function duplicateProviderMappingGroups(sport: string): Promise<number> {
  const fields = [
    "sleeperId",
    "fantasyCalcId",
    "rollingInsightsId",
    "apiSportsId",
    "espnId",
    "clearSportsId",
    "mflId",
    "fleaflickerId",
  ]
  const counts = await Promise.all(
    fields.map((field) =>
      duplicateGroupCount("playerIdentityMap", field, {
        sport,
        [field]: { not: null },
      })
    )
  )
  return counts.reduce((sum, count) => sum + count, 0)
}

function providerSourceWhere(sport: string, aliases: readonly string[]) {
  return {
    sport,
    OR: aliases.map((alias) => ({
      source: { equals: alias, mode: "insensitive" },
    })),
  }
}

async function buildProviderMappingAggregate(
  sport: string,
  mapping: (typeof PROVIDER_MAPPINGS)[number]
): Promise<SportsProviderMappingAggregate> {
  const where = providerSourceWhere(sport, mapping.aliases)
  const [
    providerPlayerRows,
    playerRows,
    identityRows,
    duplicatePlayerMappingGroups,
    providerTeamRows,
    teamRows,
    teamAssetRows,
    duplicateTeamMappingGroups,
  ] = await Promise.all([
    safeCount("sportsPlayer", { where }),
    safeFindMany("sportsPlayer", {
      where,
      select: { externalId: true },
      take: 10000,
    }),
    safeFindMany("playerIdentityMap", {
      where: {
        sport,
        [mapping.playerField]: { not: null },
      },
      select: { [mapping.playerField]: true },
      take: 10000,
    }),
    duplicateGroupCount("playerIdentityMap", mapping.playerField, {
      sport,
      [mapping.playerField]: { not: null },
    }),
    safeCount("sportsTeam", { where }),
    safeFindMany("sportsTeam", {
      where,
      select: { externalId: true, name: true, shortName: true },
      take: 5000,
    }),
    safeFindMany("teamAsset", {
      where: { sport },
      select: { teamCode: true, teamName: true },
      take: 5000,
    }),
    duplicateGroupCount("sportsTeam", "name", where),
  ])

  const mappedPlayerIds = new Set(
    identityRows
      .map((row) => row[mapping.playerField])
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase())
  )
  const unmappedProviderPlayers = playerRows.filter((row) => {
    const externalId = typeof row.externalId === "string" ? row.externalId.trim().toLowerCase() : ""
    return Boolean(externalId) && !mappedPlayerIds.has(externalId)
  }).length

  const knownTeamKeys = new Set<string>()
  for (const row of teamAssetRows) {
    for (const key of ["teamCode", "teamName"]) {
      const value = row[key]
      if (typeof value === "string" && value.trim()) knownTeamKeys.add(value.trim().toLowerCase())
    }
  }
  const mappedTeamRows = teamRows.filter((row) => {
    if (knownTeamKeys.size === 0) return false
    return ["externalId", "name", "shortName"].some((key) => {
      const value = row[key]
      return typeof value === "string" && knownTeamKeys.has(value.trim().toLowerCase())
    })
  }).length

  return {
    provider: mapping.provider,
    providerPlayerRows,
    mappedPlayerIds: mappedPlayerIds.size,
    unmappedProviderPlayers,
    providerTeamRows,
    mappedTeamRows,
    unmappedProviderTeams: Math.max(0, providerTeamRows - mappedTeamRows),
    duplicatePlayerMappingGroups,
    duplicateTeamMappingGroups,
  }
}

async function teamMappingMismatchCount(sport: string): Promise<number> {
  const [teamRows, assetRows, playerTeams, recordTeams] = await Promise.all([
    safeFindMany("sportsTeam", {
      where: { sport },
      select: { externalId: true, name: true, shortName: true, city: true },
      take: 2000,
    }),
    safeFindMany("teamAsset", {
      where: { sport },
      select: { teamCode: true, teamName: true },
      take: 2000,
    }),
    safeFindMany("sportsPlayer", {
      where: { sport },
      select: { team: true },
      distinct: ["team"],
      take: 2000,
    }),
    safeFindMany("sportsPlayerRecord", {
      where: { sport },
      select: { team: true },
      distinct: ["team"],
      take: 2000,
    }),
  ])
  const known = new Set<string>()
  for (const row of teamRows) {
    for (const key of ["externalId", "name", "shortName", "city"]) {
      const value = row[key]
      if (typeof value === "string" && value.trim()) known.add(value.trim().toLowerCase())
    }
  }
  for (const row of assetRows) {
    for (const key of ["teamCode", "teamName"]) {
      const value = row[key]
      if (typeof value === "string" && value.trim()) known.add(value.trim().toLowerCase())
    }
  }
  if (known.size === 0) return 0
  return [...playerTeams, ...recordTeams].filter((row) => {
    const team = typeof row.team === "string" ? row.team.trim().toLowerCase() : ""
    return Boolean(team) && !known.has(team)
  }).length
}

async function buildAggregateForSport(row: (typeof SPORTS_TO_AUDIT)[number]): Promise<SportsIdentityHealthAggregate> {
  const sport = row.sport
  const missingProviderWhere = {
    sport,
    AND: [
      { OR: [{ sleeperId: null }, { sleeperId: "" }] },
      { OR: [{ fantasyCalcId: null }, { fantasyCalcId: "" }] },
      { OR: [{ rollingInsightsId: null }, { rollingInsightsId: "" }] },
      { OR: [{ apiSportsId: null }, { apiSportsId: "" }] },
      { OR: [{ espnId: null }, { espnId: "" }] },
      { OR: [{ clearSportsId: null }, { clearSportsId: "" }] },
      { OR: [{ mflId: null }, { mflId: "" }] },
      { OR: [{ fleaflickerId: null }, { fleaflickerId: "" }] },
    ],
  }
  const invalidUrl = (field: string) => ({
    AND: [
      { [field]: { not: null } },
      { [field]: { not: "" } },
      {
        NOT: [
          { [field]: { startsWith: "http" } },
          { [field]: { startsWith: "/" } },
          { [field]: { startsWith: "data:image/" } },
        ],
      },
    ],
  })
  const [
    playerCount,
    sportsPlayerRecordCount,
    teamCount,
    teamAssetCount,
    canonicalIdentityCount,
    playersMissingProviderIds,
    playersMissingTeam,
    playerRecordsMissingTeam,
    playersMissingPosition,
    playerRecordsMissingPosition,
    playersMissingStatus,
    duplicateSportsPlayerNames,
    duplicateSportsPlayerRecordNames,
    duplicateSportsTeamNames,
    duplicateTeamAssetNames,
    duplicateProviderMappings,
    providerMappings,
    inactiveOrUnknownPlayers,
    activeStatusTeamMismatches,
    teamMappingMismatches,
    playersMissingHeadshots,
    playerRecordsMissingHeadshots,
    teamsMissingLogos,
    teamAssetsMissingLogos,
    duplicateSportsPlayerHeadshots,
    duplicateSportsPlayerRecordHeadshots,
    duplicateSportsTeamLogos,
    duplicateTeamAssetLogos,
    invalidSportsPlayerHeadshots,
    invalidSportsPlayerRecordHeadshots,
    invalidSportsTeamLogos,
    invalidTeamAssetLogos,
  ] = await Promise.all([
    safeCount("sportsPlayer", { where: { sport } }),
    safeCount("sportsPlayerRecord", { where: { sport } }),
    safeCount("sportsTeam", { where: { sport } }),
    safeCount("teamAsset", { where: { sport } }),
    safeCount("playerIdentityMap", { where: { sport } }),
    safeCount("playerIdentityMap", { where: missingProviderWhere }),
    safeCount("sportsPlayer", { where: { sport, OR: [{ team: null }, { team: "" }] } }),
    safeCount("sportsPlayerRecord", { where: { sport, team: "" } }),
    safeCount("sportsPlayer", { where: { sport, OR: [{ position: null }, { position: "" }] } }),
    safeCount("sportsPlayerRecord", { where: { sport, position: "" } }),
    safeCount("sportsPlayer", { where: { sport, OR: [{ status: null }, { status: "" }] } }),
    duplicateGroupCount("sportsPlayer", "name", { sport }),
    duplicateGroupCount("sportsPlayerRecord", "name", { sport }),
    duplicateGroupCount("sportsTeam", "name", { sport }),
    duplicateGroupCount("teamAsset", "teamName", { sport }),
    duplicateProviderMappingGroups(sport),
    Promise.all(PROVIDER_MAPPINGS.map((mapping) => buildProviderMappingAggregate(sport, mapping))),
    safeCount("sportsPlayer", {
      where: {
        sport,
        OR: [
          { status: { contains: "inactive", mode: "insensitive" } },
          { status: { contains: "retired", mode: "insensitive" } },
          { status: { contains: "unknown", mode: "insensitive" } },
        ],
      },
    }),
    safeCount("sportsPlayer", {
      where: {
        sport,
        status: { contains: "active", mode: "insensitive" },
        OR: [{ team: null }, { team: "" }],
      },
    }),
    teamMappingMismatchCount(sport),
    safeCount("sportsPlayer", { where: { sport, OR: [{ imageUrl: null }, { imageUrl: "" }] } }),
    safeCount("sportsPlayerRecord", {
      where: {
        sport,
        AND: [
          { OR: [{ headshotUrl: null }, { headshotUrl: "" }] },
          { OR: [{ headshotUrlSm: null }, { headshotUrlSm: "" }] },
          { OR: [{ headshotUrlLg: null }, { headshotUrlLg: "" }] },
        ],
      },
    }),
    safeCount("sportsTeam", { where: { sport, OR: [{ logo: null }, { logo: "" }] } }),
    safeCount("teamAsset", {
      where: {
        sport,
        AND: [
          { OR: [{ logoUrl: null }, { logoUrl: "" }] },
          { OR: [{ logoUrlSm: null }, { logoUrlSm: "" }] },
          { OR: [{ logoUrlLg: null }, { logoUrlLg: "" }] },
        ],
      },
    }),
    duplicateGroupCount("sportsPlayer", "imageUrl", { sport, imageUrl: { not: null } }),
    duplicateGroupCount("sportsPlayerRecord", "headshotUrl", { sport, headshotUrl: { not: null } }),
    duplicateGroupCount("sportsTeam", "logo", { sport, logo: { not: null } }),
    duplicateGroupCount("teamAsset", "logoUrl", { sport, logoUrl: { not: null } }),
    safeCount("sportsPlayer", { where: { sport, ...invalidUrl("imageUrl") } }),
    safeCount("sportsPlayerRecord", { where: { sport, ...invalidUrl("headshotUrl") } }),
    safeCount("sportsTeam", { where: { sport, ...invalidUrl("logo") } }),
    safeCount("teamAsset", { where: { sport, ...invalidUrl("logoUrl") } }),
  ])

  return {
    ...row,
    playerCount,
    sportsPlayerRecordCount,
    teamCount,
    teamAssetCount,
    canonicalIdentityCount,
    playersMissingProviderIds,
    playersMissingTeam,
    playerRecordsMissingTeam,
    playersMissingPosition,
    playerRecordsMissingPosition,
    playersMissingStatus,
    duplicatePlayerNameGroups: duplicateSportsPlayerNames + duplicateSportsPlayerRecordNames,
    duplicateTeamIdentityGroups: duplicateSportsTeamNames + duplicateTeamAssetNames,
    duplicateProviderMappingGroups: duplicateProviderMappings,
    unmappedProviderPlayers: providerMappings.reduce((sum, provider) => sum + n(provider.unmappedProviderPlayers), 0),
    unmappedProviderTeams: providerMappings.reduce((sum, provider) => sum + n(provider.unmappedProviderTeams), 0),
    inactiveOrUnknownPlayers,
    activeStatusTeamMismatches,
    teamMappingMismatches,
    playersMissingHeadshots,
    playerRecordsMissingHeadshots,
    teamsMissingLogos,
    teamAssetsMissingLogos,
    duplicateHeadshotGroups: duplicateSportsPlayerHeadshots + duplicateSportsPlayerRecordHeadshots,
    duplicateLogoGroups: duplicateSportsTeamLogos + duplicateTeamAssetLogos,
    invalidHeadshotUrlPatterns: invalidSportsPlayerHeadshots + invalidSportsPlayerRecordHeadshots,
    invalidLogoUrlPatterns: invalidSportsTeamLogos + invalidTeamAssetLogos,
    providerMappings,
  }
}

/**
 * World Cup uses dedicated tables (worldCupTeam, worldCupOfficialFixture,
 * worldCupOfficialGroupStanding) rather than the generic sportsTeam/sportsPlayer
 * tables, so it needs its own aggregate builder.
 *
 * Status logic:
 *   - Missing  → 0 worldCupTeam rows
 *   - Partial  → teams exist but some are missing both flagUrl and logoUrl
 *   - Ready    → teams exist and all have at least one image URL
 *
 * We map teamCount into the aggregate's `playerCount` field so the shared
 * `statusFor(playerCount, problemCount)` helper works without modification:
 *   statusFor(teamCount, teamsWithNoLogo) → correct status
 */
async function buildAggregateForWorldCup(
  row: (typeof SPORTS_TO_AUDIT)[number]
): Promise<SportsIdentityHealthAggregate> {
  const [teamCount, teamsWithLogo, fixtureCount, standingCount] = await Promise.all([
    safeCount("worldCupTeam"),
    safeCount("worldCupTeam", {
      where: {
        OR: [{ flagUrl: { not: null } }, { logoUrl: { not: null } }],
      },
    }),
    safeCount("worldCupOfficialFixture"),
    safeCount("worldCupOfficialGroupStanding"),
  ])

  const teamsWithNoLogo = Math.max(0, teamCount - teamsWithLogo)

  return {
    ...row,
    // Use teamCount as the entity count so statusFor() returns "missing" when 0
    playerCount: teamCount,
    sportsPlayerRecordCount: 0,
    teamCount,
    teamAssetCount: 0,
    // canonicalIdentityCount repurposed to surface fixture + standing row totals
    canonicalIdentityCount: fixtureCount + standingCount,
    // No player-identity metrics apply to World Cup
    playersMissingProviderIds: 0,
    playersMissingTeam: 0,
    playerRecordsMissingTeam: 0,
    playersMissingPosition: 0,
    playerRecordsMissingPosition: 0,
    playersMissingStatus: 0,
    duplicatePlayerNameGroups: 0,
    duplicateTeamIdentityGroups: 0,
    duplicateProviderMappingGroups: 0,
    unmappedProviderPlayers: 0,
    unmappedProviderTeams: 0,
    inactiveOrUnknownPlayers: 0,
    activeStatusTeamMismatches: 0,
    teamMappingMismatches: 0,
    // Image health — only team logos are applicable; headshots do not exist
    playersMissingHeadshots: 0,
    playerRecordsMissingHeadshots: 0,
    teamsMissingLogos: teamsWithNoLogo,
    teamAssetsMissingLogos: 0,
    duplicateHeadshotGroups: 0,
    duplicateLogoGroups: 0,
    invalidHeadshotUrlPatterns: 0,
    invalidLogoUrlPatterns: 0,
    // No provider mappings for World Cup
    providerMappings: [],
  }
}

export async function getSportsIdentityHealthSnapshot(): Promise<SportsIdentityHealthSnapshot> {
  const rows = await Promise.all(
    SPORTS_TO_AUDIT.map((row) =>
      row.id === "world-cup" ? buildAggregateForWorldCup(row) : buildAggregateForSport(row)
    )
  )
  return buildSportsIdentityHealthSnapshot({ rows })
}
