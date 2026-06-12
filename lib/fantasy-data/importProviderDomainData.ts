import "server-only"

import { recordProviderSync } from "@/lib/provider-sync-logger"
import { apiChain } from "@/lib/workers/api-chain"
import type { FantasyDataDomain, FantasyProviderSport } from "./providerHealth"

type ImportableDomain =
  | "teams"
  | "schedules"
  | "scores"
  | "standings"
  | "news"
  | "player_headshots"
  | "team_logos"
  | "projections"
  | "fantasy_values"

const DOMAIN_TO_API_TYPE: Record<ImportableDomain, string> = {
  teams: "teams",
  schedules: "schedule",
  scores: "scores",
  standings: "standings",
  news: "news",
  player_headshots: "player_headshots",
  team_logos: "team_logos",
  projections: "projections",
  fantasy_values: "rankings",
}

export type ProviderDomainImportResult = {
  domain: ImportableDomain
  source: string | null
  imported: number
  cached: boolean
  error: string | null
}

export type ProviderDomainImportSummary = {
  imported: number
  results: ProviderDomainImportResult[]
  warnings: string[]
  errors: string[]
}

function countRows(data: unknown): number {
  if (Array.isArray(data)) return data.length
  if (!data || typeof data !== "object") return 0
  const obj = data as Record<string, unknown>
  for (const key of ["data", "items", "results", "players", "teams", "games", "standings", "rankings"]) {
    if (Array.isArray(obj[key])) return obj[key].length
  }
  return Object.keys(obj).length > 0 ? 1 : 0
}

function apiSport(sport: FantasyProviderSport): string {
  return sport === "NCAAF" ? "ncaaf" : "nfl"
}

export async function importProviderDomainData(options: {
  sport: FantasyProviderSport
  season: number
  week?: number
  domains?: ImportableDomain[]
  forceRefresh?: boolean
}): Promise<ProviderDomainImportSummary> {
  const domains = options.domains ?? [
    "teams",
    "schedules",
    "scores",
    "standings",
    "news",
    "player_headshots",
    "team_logos",
    "projections",
    "fantasy_values",
  ]
  const results: ProviderDomainImportResult[] = []
  const warnings: string[] = []
  const errors: string[] = []

  for (const domain of domains) {
    const dataType = DOMAIN_TO_API_TYPE[domain]
    const query: Record<string, unknown> = {
      season: options.season,
      limit: domain === "news" ? 60 : 500,
    }
    if (options.week != null) query.week = options.week

    try {
      const result = await apiChain.fetch({
        sport: apiSport(options.sport),
        dataType,
        query,
        forceRefresh: options.forceRefresh ?? true,
      })
      const imported = countRows(result.data)
      const source = result.source ?? null
      const error = imported === 0 ? result.error ?? null : null
      if (error) warnings.push(`${domain} returned no rows: ${error}`)
      await recordProviderSync(
        {
          provider: source ?? "api_chain",
          entityType: domain,
          sport: options.sport,
          key: String(options.season),
        },
        {
          recordsImported: imported,
          error,
        },
      )
      results.push({
        domain,
        source,
        imported,
        cached: Boolean(result.cached),
        error,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${domain} import failed: ${msg.slice(0, 200)}`)
      await recordProviderSync(
        {
          provider: "api_chain",
          entityType: domain,
          sport: options.sport,
          key: String(options.season),
        },
        {
          error: msg.slice(0, 500),
        },
      )
      results.push({
        domain,
        source: null,
        imported: 0,
        cached: false,
        error: msg.slice(0, 200),
      })
    }
  }

  return {
    imported: results.reduce((sum, result) => sum + result.imported, 0),
    results,
    warnings,
    errors,
  }
}

export function isImportableFantasyDomain(domain: FantasyDataDomain): domain is ImportableDomain {
  return domain in DOMAIN_TO_API_TYPE
}
