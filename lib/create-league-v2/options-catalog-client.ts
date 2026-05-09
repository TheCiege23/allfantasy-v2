import type { LeagueCreateOptionsCatalog } from '@/lib/league-creation/options-catalog-seed-data'

let cachedCatalog: LeagueCreateOptionsCatalog | null = null

export function setClientLeagueCreateOptionsCatalog(catalog: LeagueCreateOptionsCatalog | null): void {
  cachedCatalog = catalog
}

export function getClientLeagueCreateOptionsCatalog(): LeagueCreateOptionsCatalog | null {
  return cachedCatalog
}
