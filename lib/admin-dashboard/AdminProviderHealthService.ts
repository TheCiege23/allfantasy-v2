import "server-only"

import { prisma } from "@/lib/prisma"
import {
  getClearSportsConfigFromEnv,
  getOpenAIConfigFromEnv,
  getProviderStartupValidationNotes,
  getRollingInsightsConfigFromEnv,
} from "@/lib/provider-config"
import { getWorldCupProviderOpsStatus } from "@/lib/world-cup/worldCupOperationsReadiness"
import {
  getWorldCupLiveProviderChain,
} from "@/lib/world-cup/live-providers/worldCupLiveProviderRegistry"

export type AdminProviderHealthStatus =
  | "configured"
  | "missing_env"
  | "configured_failing"
  | "scaffold_only"
  | "not_production_ready"
  | "disabled"
  | "public_fallback"
  | "unknown"

export type AdminProviderHealthRow = {
  id: string
  name: string
  category: string
  status: AdminProviderHealthStatus
  configured: boolean
  envVars: string[]
  dataCategories: string[]
  consumedBy: string[]
  storage: string[]
  requestCount24h: number | null
  avgLatencyMs24h: number | null
  rateLimit: string
  importedRows: number | null
  lastSyncAt: string | null
  lastError: string | null
  costProtection: string[]
  note: string
}

type ProviderCallSummary = {
  requestCount24h: number
  avgLatencyMs24h: number | null
}

type ProviderSyncSummary = {
  lastSyncAt: string | null
  lastError: string | null
  recordsImported: number
  recordsUpdated: number
  recordsSkipped: number
}

type ProviderRateWindow = {
  callsMade: number
  callsLimit: number
  resetAt: string | null
}

type CountBySource = Record<string, number>

const NOT_TRACKED = "Not tracked yet"

function clean(value?: string | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function hasAnyEnv(keys: string[]): boolean {
  return keys.some((key) => Boolean(clean(process.env[key])))
}

function hasAllEnv(keys: string[]): boolean {
  return keys.every((key) => Boolean(clean(process.env[key])))
}

function safeError(value: string | null | undefined): string | null {
  const text = clean(value)
  if (!text) return null
  return text.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 180)
}

function nowMinusHours(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

function keyForProvider(provider: string): string {
  return provider.trim().toLowerCase()
}

function requestAliases(id: string): string[] {
  switch (id) {
    case "api_football_world_cup":
      return ["api_football", "api_sports"]
    case "api_sports":
      return ["api_sports"]
    case "clearsports":
    case "clear_sports":
      return ["clearsports", "clear_sports"]
    default:
      return [id]
  }
}

function lookupCallSummary(
  calls: Record<string, ProviderCallSummary>,
  id: string
): ProviderCallSummary {
  const aliases = requestAliases(id)
  return aliases.reduce(
    (acc, alias) => {
      const row = calls[keyForProvider(alias)]
      if (!row) return acc
      const totalCount = acc.requestCount24h + row.requestCount24h
      const avg =
        acc.avgLatencyMs24h == null
          ? row.avgLatencyMs24h
          : row.avgLatencyMs24h == null
            ? acc.avgLatencyMs24h
            : Math.round((acc.avgLatencyMs24h + row.avgLatencyMs24h) / 2)
      return { requestCount24h: totalCount, avgLatencyMs24h: avg }
    },
    { requestCount24h: 0, avgLatencyMs24h: null } as ProviderCallSummary
  )
}

function lookupRateWindow(
  rates: Record<string, ProviderRateWindow>,
  id: string
): ProviderRateWindow | null {
  const aliases = requestAliases(id)
  let combined: ProviderRateWindow | null = null
  for (const alias of aliases) {
    const row = rates[keyForProvider(alias)]
    if (!row) continue
    combined = {
      callsMade: (combined?.callsMade ?? 0) + row.callsMade,
      callsLimit: (combined?.callsLimit ?? 0) + row.callsLimit,
      resetAt: row.resetAt ?? combined?.resetAt ?? null,
    }
  }
  return combined
}

function lookupSync(
  sync: Record<string, ProviderSyncSummary>,
  id: string
): ProviderSyncSummary | null {
  const aliases = requestAliases(id)
  for (const alias of aliases) {
    const row = sync[keyForProvider(alias)]
    if (row) return row
  }
  return null
}

function formatRateLimit(row: ProviderRateWindow | null): string {
  if (!row) return NOT_TRACKED
  if (row.callsLimit <= 0) return `${row.callsMade} calls this window`
  return `${row.callsMade}/${row.callsLimit} calls this window`
}

function statusFromConfig(input: {
  configured: boolean
  scaffold?: boolean
  productionReady?: boolean
  publicFallback?: boolean
  disabled?: boolean
  failing?: boolean
}): AdminProviderHealthStatus {
  if (input.disabled) return "disabled"
  if (input.scaffold) return "scaffold_only"
  if (input.publicFallback) return "public_fallback"
  if (input.failing) return "configured_failing"
  if (input.configured && input.productionReady === false) return "not_production_ready"
  if (input.configured) return "configured"
  return "missing_env"
}

async function groupCountsBySource(modelName: string): Promise<CountBySource> {
  const delegate = (prisma as unknown as Record<string, unknown>)[modelName] as
    | { groupBy: (args: Record<string, unknown>) => Promise<Array<{ source: string | null; _count: { _all: number } }>> }
    | undefined
  if (!delegate?.groupBy) return {}
  try {
    const rows = await delegate.groupBy({
      by: ["source"],
      _count: { _all: true },
    })
    return rows.reduce<CountBySource>((acc, row) => {
      if (row.source) acc[keyForProvider(row.source)] = (acc[keyForProvider(row.source)] ?? 0) + row._count._all
      return acc
    }, {})
  } catch {
    return {}
  }
}

function sumSourceCounts(sources: CountBySource[], aliases: string[]): number {
  return sources.reduce((total, sourceMap) => {
    return total + aliases.reduce((sum, alias) => sum + (sourceMap[keyForProvider(alias)] ?? 0), 0)
  }, 0)
}

async function getCallSummaries(): Promise<Record<string, ProviderCallSummary>> {
  try {
    const rows = await prisma.apiCallLogRecord.groupBy({
      by: ["provider"],
      where: {
        calledAt: { gte: nowMinusHours(24) },
        cached: false,
      },
      _count: { _all: true },
      _avg: { latencyMs: true },
    })
    return rows.reduce<Record<string, ProviderCallSummary>>((acc, row) => {
      acc[keyForProvider(row.provider)] = {
        requestCount24h: row._count._all,
        avgLatencyMs24h:
          row._avg.latencyMs == null ? null : Math.round(row._avg.latencyMs),
      }
      return acc
    }, {})
  } catch {
    return {}
  }
}

async function getRateWindows(): Promise<Record<string, ProviderRateWindow>> {
  try {
    const now = new Date()
    const rows = await prisma.apiRateLimitRecord.findMany({
      where: { windowEnd: { gte: now } },
      select: {
        provider: true,
        callsMade: true,
        callsLimit: true,
        windowEnd: true,
      },
      orderBy: { windowEnd: "desc" },
      take: 100,
    })
    return rows.reduce<Record<string, ProviderRateWindow>>((acc, row) => {
      const key = keyForProvider(row.provider)
      const current = acc[key]
      acc[key] = {
        callsMade: (current?.callsMade ?? 0) + row.callsMade,
        callsLimit: Math.max(current?.callsLimit ?? 0, row.callsLimit),
        resetAt: current?.resetAt ?? row.windowEnd.toISOString(),
      }
      return acc
    }, {})
  } catch {
    return {}
  }
}

async function getSyncSummaries(): Promise<Record<string, ProviderSyncSummary>> {
  try {
    const rows = await prisma.providerSyncState.findMany({
      select: {
        provider: true,
        lastCompletedAt: true,
        lastSuccessAt: true,
        lastErrorAt: true,
        lastError: true,
        recordsImported: true,
        recordsUpdated: true,
        recordsSkipped: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    })
    return rows.reduce<Record<string, ProviderSyncSummary>>((acc, row) => {
      const key = keyForProvider(row.provider)
      if (acc[key]) return acc
      acc[key] = {
        lastSyncAt: (row.lastSuccessAt ?? row.lastCompletedAt ?? row.updatedAt)?.toISOString() ?? null,
        lastError: row.lastErrorAt ? safeError(row.lastError) : null,
        recordsImported: row.recordsImported,
        recordsUpdated: row.recordsUpdated,
        recordsSkipped: row.recordsSkipped,
      }
      return acc
    }, {})
  } catch {
    return {}
  }
}

async function getWorldCupCounts() {
  try {
    const [teams, fixtures, standings, syncLogs] = await Promise.all([
      prisma.worldCupTeam.count(),
      prisma.worldCupOfficialFixture.count(),
      prisma.worldCupOfficialGroupStanding.count(),
      prisma.worldCupSyncLog.count(),
    ])
    return { teams, fixtures, standings, syncLogs }
  } catch {
    return { teams: 0, fixtures: 0, standings: 0, syncLogs: 0 }
  }
}

async function getCacheCounts() {
  try {
    const [
      total,
      apiSports,
      apiFootball,
      clearSports,
      theSportsDb,
      rollingInsights,
      cfbd,
      espn,
      sleeper,
    ] = await Promise.all([
      prisma.sportsDataCache.count(),
      prisma.sportsDataCache.count({ where: { cacheKey: { startsWith: "api_sports:" } } }),
      prisma.sportsDataCache.count({ where: { cacheKey: { startsWith: "api_football:" } } }),
      prisma.sportsDataCache.count({ where: { cacheKey: { startsWith: "clearsports:" } } }),
      prisma.sportsDataCache.count({ where: { cacheKey: { contains: "thesportsdb" } } }),
      prisma.sportsDataCache.count({ where: { cacheKey: { startsWith: "rolling_insights:" } } }),
      prisma.sportsDataCache.count({ where: { cacheKey: { startsWith: "cfbd:" } } }),
      prisma.sportsDataCache.count({ where: { cacheKey: { startsWith: "espn:" } } }),
      prisma.sportsDataCache.count({ where: { cacheKey: { startsWith: "sleeper:" } } }),
    ])
    return {
      total,
      api_sports: apiSports,
      api_football: apiFootball,
      clear_sports: clearSports,
      thesportsdb: theSportsDb,
      rolling_insights: rollingInsights,
      cfbd,
      espn,
      sleeper,
    }
  } catch {
    return {
      total: 0,
      api_sports: 0,
      api_football: 0,
      clear_sports: 0,
      thesportsdb: 0,
      rolling_insights: 0,
      cfbd: 0,
      espn: 0,
      sleeper: 0,
    }
  }
}

function providerRow(
  input: Omit<
    AdminProviderHealthRow,
    "requestCount24h" | "avgLatencyMs24h" | "rateLimit" | "lastSyncAt" | "lastError"
  > & {
    calls: Record<string, ProviderCallSummary>
    rates: Record<string, ProviderRateWindow>
    sync: Record<string, ProviderSyncSummary>
  }
): AdminProviderHealthRow {
  const callSummary = lookupCallSummary(input.calls, input.id)
  const rateWindow = lookupRateWindow(input.rates, input.id)
  const syncSummary = lookupSync(input.sync, input.id)
  return {
    ...input,
    requestCount24h: callSummary.requestCount24h,
    avgLatencyMs24h: callSummary.avgLatencyMs24h,
    rateLimit: formatRateLimit(rateWindow),
    lastSyncAt: syncSummary?.lastSyncAt ?? null,
    lastError: syncSummary?.lastError ?? null,
  }
}

export async function getAdminProviderHealthRows(): Promise<AdminProviderHealthRow[]> {
  const [
    calls,
    rates,
    sync,
    teamCounts,
    playerCounts,
    gameCounts,
    injuryCounts,
    newsCounts,
    cacheCounts,
    worldCupCounts,
  ] = await Promise.all([
    getCallSummaries(),
    getRateWindows(),
    getSyncSummaries(),
    groupCountsBySource("sportsTeam"),
    groupCountsBySource("sportsPlayer"),
    groupCountsBySource("sportsGame"),
    groupCountsBySource("sportsInjury"),
    groupCountsBySource("sportsNews"),
    getCacheCounts(),
    getWorldCupCounts(),
  ])

  const sourceCounts = [teamCounts, playerCounts, gameCounts, injuryCounts, newsCounts]
  const worldCupOps = getWorldCupProviderOpsStatus()
  const apiFootballWorldCupKeyConfigured = hasAnyEnv([
    "API_SPORTS_KEY",
    "API_FOOTBALL_KEY",
    "APISPORTS_FOOTBALL_KEY",
    "RAPIDAPI_KEY",
  ])
  const apiFootballWorldCupProductionReady =
    worldCupOps.name === "apifootball" &&
    apiFootballWorldCupKeyConfigured &&
    worldCupOps.leagueIdConfigured &&
    worldCupOps.cronSecretPresent
  const openaiConfigured = Boolean(getOpenAIConfigFromEnv())
  const clearSportsConfigured = Boolean(getClearSportsConfigFromEnv())
  const rollingInsights = getRollingInsightsConfigFromEnv()
  const rollingInsightsConfigured = Boolean(rollingInsights)
  const liveChain = getWorldCupLiveProviderChain()
  const startupWarnings = getProviderStartupValidationNotes()
  const sportsDataConfigured = hasAnyEnv(["SPORTSDATA_API_KEY"])

  return [
    providerRow({
      id: "api_football_world_cup",
      name: "API-Football / API-Sports World Cup",
      category: "World Cup soccer",
      status: statusFromConfig({
        configured: apiFootballWorldCupKeyConfigured,
        productionReady: apiFootballWorldCupProductionReady,
      }),
      configured: apiFootballWorldCupKeyConfigured,
      envVars: [
        "WORLD_CUP_DATA_PROVIDER",
        "API_SPORTS_KEY or API_FOOTBALL_KEY",
        "API_FOOTBALL_WORLD_CUP_LEAGUE_ID",
        "WORLD_CUP_CRON_SECRET",
      ],
      dataCategories: ["teams", "fixtures", "live scores", "group standings", "injuries", "knockout results"],
      consumedBy: ["World Cup sync cron", "World Cup scoring", "leaderboard", "Chimmy DB context", "injury notifications"],
      storage: [
        "world_cup_teams",
        "world_cup_official_fixtures",
        "world_cup_official_group_standings",
        "injury_reports",
        "platform_notifications",
        "api_call_log_records",
      ],
      importedRows: worldCupCounts.teams + worldCupCounts.fixtures + worldCupCounts.standings,
      costProtection: [
        "server-only provider client",
        "cron/admin sync path",
        "per-endpoint cooldowns",
        "ApiRateLimitRecord hourly/daily budgets",
        "batch live sync fetches once then fans out to pools",
      ],
      note:
        apiFootballWorldCupProductionReady
          ? "Primary World Cup provider is configured for production sync."
          : `Current WORLD_CUP_DATA_PROVIDER is ${worldCupOps.name}; production sync is not using API-Football.`,
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "world_cup_live_chain",
      name: "World Cup live provider chain",
      category: "World Cup live scores",
      status: liveChain.length > 0 ? "configured" : "disabled",
      configured: liveChain.length > 0,
      envVars: ["WORLD_CUP_LIVE_PROVIDER_CHAIN"],
      dataCategories: ["live scores", "match clock", "winner", "penalty shootout"],
      consumedBy: ["admin live score sync", "World Cup bracket match updates"],
      storage: ["world_cup_bracket_matches", "world_cup_bracket_chat_events"],
      importedRows: worldCupCounts.syncLogs,
      costProtection: ["configured fallback order", "skips unconfigured providers", "warnings instead of hard failure"],
      note: `Current chain: ${liveChain.join(" -> ")}.`,
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "sportsdata_world_cup",
      name: "SportsData.io World Cup",
      category: "World Cup soccer",
      status: statusFromConfig({ configured: sportsDataConfigured, scaffold: true }),
      configured: sportsDataConfigured,
      envVars: ["SPORTSDATA_API_KEY", "SPORTSDATA_WORLD_CUP_COMPETITION_ID"],
      dataCategories: ["teams", "fixtures", "live scores"],
      consumedBy: ["World Cup provider abstraction"],
      storage: ["Not production ready"],
      importedRows: null,
      costProtection: ["disabled by scaffold errors until endpoints are verified"],
      note: "Provider file is scaffold-only; getTeams/getFixtures intentionally throw until endpoint shapes are verified.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "rolling_insights",
      name: "Rolling Insights / Reality Sports",
      category: "multi-sport data",
      status: statusFromConfig({ configured: rollingInsightsConfigured }),
      configured: rollingInsightsConfigured,
      envVars: [
        "ROLLING_INSIGHTS_API_KEY or ROLLING_INSIGHTS_CLIENT_ID/SECRET",
        "RI_NBA_ENABLED / RI_MLB_ENABLED / RI_NHL_ENABLED / RI_NCAAF_ENABLED / RI_NCAAB_ENABLED / RI_SOCCER_ENABLED",
      ],
      dataCategories: ["teams", "players", "scores", "schedule", "standings", "projections", "rankings", "ADP"],
      consumedBy: ["sports API chain", "draft room", "Chimmy sports context"],
      storage: ["sports_teams", "sports_players", "sports_games", "sports_data_cache"],
      importedRows: sumSourceCounts(sourceCounts, ["rolling_insights"]) + cacheCounts.rolling_insights,
      costProtection: ["DB-first cache", "timeout budget", "enabled-sport flags"],
      note: rollingInsights
        ? `Auth mode: ${rollingInsights.authMode}. Enabled sports: ${Object.entries(rollingInsights.enabledSports)
            .filter(([, enabled]) => enabled)
            .map(([sport]) => sport)
            .join(", ") || "none"}.`
        : "Missing Rolling Insights credentials; chain falls through to backups.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "api_sports",
      name: "API-Sports American Football",
      category: "NFL / college football",
      status: statusFromConfig({ configured: hasAnyEnv(["APISPORTS_API_KEY", "API_SPORTS_KEY"]) }),
      configured: hasAnyEnv(["APISPORTS_API_KEY", "API_SPORTS_KEY"]),
      envVars: ["APISPORTS_API_KEY or API_SPORTS_KEY", "APISPORTS_NFL_LEAGUE_ID", "APISPORTS_NCAAF_LEAGUE_ID"],
      dataCategories: ["teams", "players", "games", "standings", "injuries", "odds"],
      consumedBy: ["sports API chain", "sports sync admin route", "draft/player identity enrichment"],
      storage: ["sports_teams", "sports_games", "sports_injuries", "sports_data_cache", "api_call_log"],
      importedRows: sumSourceCounts(sourceCounts, ["api_sports"]) + cacheCounts.api_sports,
      costProtection: ["ApiRateLimitRecord hourly/daily guard", "fallback records on quota guard", "server-only key"],
      note: "Supports NFL and NCAAF in the generic chain; World Cup uses the API-Football wrapper.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "thesportsdb",
      name: "TheSportsDB",
      category: "multi-sport backup/media",
      status: statusFromConfig({
        configured: hasAnyEnv(["THESPORTSDB_API_KEY", "SPORTSDB_API_KEY", "THE_SPORTS_DB_API_KEY"]),
        publicFallback: !hasAnyEnv(["THESPORTSDB_API_KEY", "SPORTSDB_API_KEY", "THE_SPORTS_DB_API_KEY"]),
      }),
      configured: hasAnyEnv(["THESPORTSDB_API_KEY", "SPORTSDB_API_KEY", "THE_SPORTS_DB_API_KEY"]),
      envVars: ["THESPORTSDB_API_KEY", "THESPORTSDB_*_LEAGUE_ID"],
      dataCategories: ["teams", "players", "schedule", "headshots", "team logos", "World Cup live fallback"],
      consumedBy: ["sports API chain", "World Cup live provider chain", "draft images"],
      storage: ["sports_data_cache", "sports_players", "team_assets"],
      importedRows: sumSourceCounts(sourceCounts, ["thesportsdb"]) + cacheCounts.thesportsdb,
      costProtection: ["DB-first cache before provider fallback", "provider called only after primary/cache misses"],
      note: "Falls back to public test key in some helper paths; production should set a real key and league ids.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "clear_sports",
      name: "ClearSports",
      category: "multi-sport backup",
      status: statusFromConfig({ configured: clearSportsConfigured }),
      configured: clearSportsConfigured,
      envVars: ["CLEARSPORTS_API_KEY", "CLEARSPORTS_API_BASE", "CLEARSPORTS_WORLD_CUP_LIVE_URL"],
      dataCategories: ["teams", "games", "players", "injuries", "stats", "odds", "news", "World Cup live bridge"],
      consumedBy: ["sports API chain", "ClearSports sync", "provider diagnostics"],
      storage: ["sports_teams", "sports_games", "sports_players", "sports_injuries", "sports_news", "provider_sync_state"],
      importedRows: sumSourceCounts(sourceCounts, ["clear_sports"]) + cacheCounts.clear_sports,
      costProtection: ["configurable timeout", "retry/backoff", "per-minute in-memory guard", "ApiRateLimitRecord guard"],
      note: clearSportsConfigured ? "Configured server-side." : "Missing ClearSports key/base; chain skips it.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "cfbd",
      name: "College Football Data",
      category: "college football backup",
      status: statusFromConfig({ configured: hasAnyEnv(["CFBD_API_KEY"]) }),
      configured: hasAnyEnv(["CFBD_API_KEY"]),
      envVars: ["CFBD_API_KEY"],
      dataCategories: ["NCAAF teams", "NCAAF schedule/games"],
      consumedBy: ["sports API chain fallback"],
      storage: ["sports_data_cache", "sports_teams", "sports_games"],
      importedRows: sumSourceCounts(sourceCounts, ["cfbd"]) + cacheCounts.cfbd,
      costProtection: ["called only after cache/primary miss"],
      note: "NCAAF fallback only; no in-repo player/stat coverage beyond supported endpoints.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "sleeper",
      name: "Sleeper",
      category: "NFL public fallback",
      status: "public_fallback",
      configured: true,
      envVars: [],
      dataCategories: ["NFL players", "NFL headshots"],
      consumedBy: ["sports API chain", "draft/player search fallback"],
      storage: ["sports_data_cache", "sports_players"],
      importedRows: sumSourceCounts(sourceCounts, ["sleeper"]) + cacheCounts.sleeper,
      costProtection: ["called only for NFL fallback data", "DB cache after successful fetch"],
      note: "No key required; should not be treated as official live scoring.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "espn",
      name: "ESPN public site APIs",
      category: "public fallback/news",
      status: "public_fallback",
      configured: true,
      envVars: ["ESPN_SOCCER_PATH optional"],
      dataCategories: ["teams", "scoreboard", "standings", "news fallback"],
      consumedBy: ["sports router fallback", "sports sync news path"],
      storage: ["sports_games", "sports_news", "sports_data_cache"],
      importedRows: sumSourceCounts(sourceCounts, ["espn", "espn_live"]) + cacheCounts.espn,
      costProtection: ["last fallback only", "DB cache after successful fetch"],
      note: "Public fallback. Not a contracted source of truth.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "openai",
      name: "OpenAI / Chimmy AI",
      category: "AI provider",
      status: statusFromConfig({ configured: openaiConfigured }),
      configured: openaiConfigured,
      envVars: ["OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY", "OPENAI_MODEL_* optional"],
      dataCategories: ["AI answers", "voice", "image generation", "World Cup explanations"],
      consumedBy: ["Chimmy", "World Cup AI", "draft/waiver/trade analysis"],
      storage: ["chat_history", "ai_results", "token_ledger", "api_usage_events"],
      importedRows: null,
      costProtection: ["token/pro gating", "AI result cache", "fallback/refusal when data unavailable"],
      note: startupWarnings.find((warning) => warning.code.includes("openai"))?.message ?? "No live probe made in admin dashboard.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "stripe",
      name: "Stripe",
      category: "payments/subscriptions",
      status: statusFromConfig({
        configured: hasAnyEnv(["STRIPE_SECRET_KEY"]) && hasAnyEnv(["STRIPE_WEBHOOK_SECRET"]),
        productionReady: hasAnyEnv(["STRIPE_SECRET_KEY"]) && hasAnyEnv(["STRIPE_WEBHOOK_SECRET"]),
      }),
      configured: hasAnyEnv(["STRIPE_SECRET_KEY"]) && hasAnyEnv(["STRIPE_WEBHOOK_SECRET"]),
      envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "STRIPE_CHECKOUT_LINK_*"],
      dataCategories: ["checkout", "subscriptions", "token purchases", "webhook events"],
      consumedBy: ["monetization checkout", "token grants", "admin payment health"],
      storage: ["stripe_webhook_events", "user_subscriptions", "token_ledger", "bracket_payments"],
      importedRows: null,
      costProtection: ["webhook idempotency", "no full payment details stored in admin tables"],
      note: "Admin metrics use stored Stripe/webhook rows only.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "cloudinary",
      name: "Cloudinary",
      category: "image uploads",
      status: statusFromConfig({
        configured: hasAllEnv(["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]),
      }),
      configured: hasAllEnv(["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]),
      envVars: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
      dataCategories: ["World Cup chat image uploads"],
      consumedBy: ["World Cup pool chat image upload route"],
      storage: ["world_cup_bracket_chat_events metadata"],
      importedRows: null,
      costProtection: ["server-side signature", "no key exposed client-side"],
      note: "Only used when rich image upload is invoked.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "klipy",
      name: "Klipy GIFs",
      category: "GIF/search media",
      status: statusFromConfig({ configured: hasAnyEnv(["KLIPY_API_KEY", "VITE_KLIPY_API_KEY"]) }),
      configured: hasAnyEnv(["KLIPY_API_KEY", "VITE_KLIPY_API_KEY"]),
      envVars: ["KLIPY_API_KEY", "VITE_KLIPY_API_KEY"],
      dataCategories: ["GIF search", "chat GIF catalog"],
      consumedBy: ["rich message GIF resolver", "chat catalog sync"],
      storage: ["chat_gifs", "sports_data_cache", "chat_messages metadata", "api_call_log_records"],
      importedRows: null,
      costProtection: ["server-side resolver preferred", "30 minute GIF search cache", "per-user search burst limit", "clean fallback when missing"],
      note: hasAnyEnv(["VITE_KLIPY_API_KEY"]) ? "Legacy VITE_ key is present; prefer KLIPY_API_KEY server-side." : "World Cup chat GIF searches are proxied server-side.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "twilio",
      name: "Twilio",
      category: "SMS / phone verification",
      status: statusFromConfig({
        configured:
          hasAnyEnv(["TWILIO_VERIFY_SERVICE_SID"]) &&
          hasAnyEnv(["TWILIO_ACCOUNT_SID"]) &&
          (hasAnyEnv(["TWILIO_AUTH_TOKEN"]) || hasAllEnv(["TWILIO_API_KEY", "TWILIO_API_SECRET"])),
      }),
      configured:
        hasAnyEnv(["TWILIO_VERIFY_SERVICE_SID"]) &&
        hasAnyEnv(["TWILIO_ACCOUNT_SID"]) &&
        (hasAnyEnv(["TWILIO_AUTH_TOKEN"]) || hasAllEnv(["TWILIO_API_KEY", "TWILIO_API_SECRET"])),
      envVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN or TWILIO_API_KEY/SECRET", "TWILIO_PHONE_NUMBER", "TWILIO_VERIFY_SERVICE_SID"],
      dataCategories: ["phone signup verification", "SMS notifications"],
      consumedBy: ["signup", "password reset SMS", "World Cup notifications"],
      storage: ["verification/password reset records", "notifications"],
      importedRows: null,
      costProtection: ["Twilio errors sanitized for users", "SMS skipped/fails cleanly when not configured"],
      note: "Admin dashboard checks configuration only.",
      calls,
      rates,
      sync,
    }),
    providerRow({
      id: "analytics",
      name: "Analytics / traffic",
      category: "product analytics",
      status: statusFromConfig({
        configured: hasAnyEnv(["NEXT_PUBLIC_GA_MEASUREMENT_ID", "META_PIXEL_ID", "NEXT_PUBLIC_META_PIXEL_ID"]),
      }),
      configured: hasAnyEnv(["NEXT_PUBLIC_GA_MEASUREMENT_ID", "META_PIXEL_ID", "NEXT_PUBLIC_META_PIXEL_ID"]),
      envVars: ["NEXT_PUBLIC_ANALYTICS_ENABLED", "NEXT_PUBLIC_GA_MEASUREMENT_ID", "META_PIXEL_ID", "NEXT_PUBLIC_META_PIXEL_ID"],
      dataCategories: ["traffic", "page views", "product events"],
      consumedBy: ["analytics client/server", "admin metrics when tracked"],
      storage: ["analytics_events", "api_usage_events", "api_usage_rollups"],
      importedRows: null,
      costProtection: ["privacy-safe event storage where used"],
      note: "Traffic/referrer attribution is partial; admin should show Not tracked yet where no rows exist.",
      calls,
      rates,
      sync,
    }),
  ]
}
