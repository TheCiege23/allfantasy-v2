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
  duplicateProviderMappingGroups: number
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
  category: "identity" | "image"
  message: string
  count: number
  recommendation: string
}

export type SportsIdentityHealthSnapshot = {
  generatedAt: string
  summary: {
    sportsAudited: number
    totalPlayers: number
    totalTeams: number
    identityProblems: number
    imageProblems: number
    readySports: number
    partialSports: number
    missingSports: number
  }
  rows: SportsIdentityHealthRow[]
  imageRows: SportsImageHealthRow[]
  topProblems: SportsDataQualityProblem[]
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
  duplicateProviderMappingGroups?: number | null
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
}

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
  category: "identity" | "image"
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
      n(row.duplicateProviderMappingGroups) +
      n(row.activeStatusTeamMismatches) +
      n(row.teamMappingMismatches)
    const topProblems: string[] = []
    pushProblem(topProblems, "Missing provider ids", n(row.playersMissingProviderIds))
    pushProblem(topProblems, "Missing team", playersMissingTeam)
    pushProblem(topProblems, "Missing position", playersMissingPosition)
    pushProblem(topProblems, "Duplicate player names", n(row.duplicatePlayerNameGroups))
    pushProblem(topProblems, "Duplicate provider mappings", n(row.duplicateProviderMappingGroups))
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
      duplicateProviderMappingGroups: n(row.duplicateProviderMappingGroups),
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
        id: `${row.id}:team-mismatch`,
        sport: row.sport,
        label: row.label,
        category: "identity" as const,
        count: row.teamMappingMismatches,
        total: row.playerCount,
        message: "Player team values do not match known team codes/names.",
        recommendation: "Backfill team aliases and normalize provider team abbreviations before live launch.",
      }),
    ])
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
          row.duplicateProviderMappingGroups +
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
      readySports: summaryStatuses.filter((status) => status === "ready").length,
      partialSports: summaryStatuses.filter((status) => status === "partial").length,
      missingSports: summaryStatuses.filter((status) => status === "missing").length,
    },
    rows,
    imageRows,
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
  const fields = ["sleeperId", "fantasyCalcId", "rollingInsightsId", "apiSportsId", "espnId", "clearSportsId"]
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
    duplicateProviderMappings,
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
    duplicateProviderMappingGroups(sport),
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
    duplicateProviderMappingGroups: duplicateProviderMappings,
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
  }
}

export async function getSportsIdentityHealthSnapshot(): Promise<SportsIdentityHealthSnapshot> {
  const rows = await Promise.all(SPORTS_TO_AUDIT.map((row) => buildAggregateForSport(row)))
  return buildSportsIdentityHealthSnapshot({ rows })
}
