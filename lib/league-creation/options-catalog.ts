import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  LEAGUE_CREATE_OPTIONS_CATALOG_V1,
  type LeagueCreateOptionsCatalog,
} from '@/lib/league-creation/options-catalog-seed-data'

const TABLE_NAME = 'league_create_options_catalog'
const DEFAULT_KEY = 'default'

type CatalogRow = {
  key: string
  payload: Prisma.JsonValue
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCatalogPayload(value: unknown): value is LeagueCreateOptionsCatalog {
  if (!isObject(value)) return false
  if (typeof value.version !== 'number') return false
  if (typeof value.defaultTimezone !== 'string' || value.defaultTimezone.length < 1) return false
  return true
}

export function getFallbackLeagueCreateOptionsCatalog(): LeagueCreateOptionsCatalog {
  return LEAGUE_CREATE_OPTIONS_CATALOG_V1
}

export async function getLeagueCreateOptionsCatalog(): Promise<LeagueCreateOptionsCatalog> {
  try {
    const rows = await prisma.$queryRawUnsafe<CatalogRow[]>(
      `SELECT key, payload FROM "${TABLE_NAME}" WHERE key = $1 LIMIT 1`,
      DEFAULT_KEY,
    )
    const payload = rows[0]?.payload
    if (isCatalogPayload(payload)) {
      return payload
    }
  } catch {
    // Table missing or seed not applied yet; fallback keeps create flow available.
  }

  return getFallbackLeagueCreateOptionsCatalog()
}

export function getAllowedSportsFromCatalog(catalog: LeagueCreateOptionsCatalog, concept: string): string[] {
  return catalog.allowedSportsByConcept[concept] ?? []
}

export function getAllowedDraftTypesFromCatalog(catalog: LeagueCreateOptionsCatalog, concept: string): string[] {
  return catalog.allowedDraftTypesByConcept[concept] ?? []
}

export function getAllowedScoringPresetsFromCatalog(
  catalog: LeagueCreateOptionsCatalog,
  concept: string,
  sport: string,
): string[] {
  const bySport = catalog.allowedScoringPresetsByConceptSport[concept]
  if (!bySport) return []
  return bySport[sport as keyof typeof bySport] ?? []
}

export function getAllowedTeamCountsFromCatalog(
  catalog: LeagueCreateOptionsCatalog,
  concept: string,
  sport: string,
): number[] {
  const bySport = catalog.teamCountOptionsByConceptSport[concept]
  if (!bySport) return []
  return bySport[sport as keyof typeof bySport] ?? []
}
