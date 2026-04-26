/**
 * DraftPlayerSearchResolver — filter players by search query and position for draft room.
 */

export type DraftPlayer = {
  name: string
  position: string
  team?: string | null
  adp?: number
}

/**
 * Filter players by search query (name, team, position).
 */
export function filterBySearch(
  players: DraftPlayer[],
  searchQuery: string
): DraftPlayer[] {
  const q = searchQuery.trim().toLowerCase()
  if (!q) return players
  return players.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.team && p.team.toLowerCase().includes(q)) ||
      p.position.toLowerCase().includes(q)
  )
}

/** Offensive positions (NFL). */
const OFFENSE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K'])
/** DL family: DE, DT. */
const DL_POSITIONS = new Set(['DE', 'DT'])
/** DB family: CB, S (and SS, FS). */
const DB_POSITIONS = new Set(['CB', 'S', 'SS', 'FS'])
/** IDP FLEX: any IDP position. */
const IDP_FLEX_POSITIONS = new Set(['DE', 'DT', 'LB', 'CB', 'S', 'SS', 'FS'])
/** Defense alias group — Sleeper / pool data emits 'DEF' for team defenses,
 * but the standard NFL roster slot uses 'DST', and some legacy/external feeds
 * use 'D/ST'. Treat all three as equivalent for the position pill so clicking
 * either DEF or DST returns the same defense rows. (The eligible-position
 * helper in lib/draft-room/draft-pool-eligible-positions.ts already collapses
 * these aliases on the eligibility side.) */
const DEFENSE_POSITIONS = new Set(['DEF', 'DST', 'D/ST'])

/**
 * Filter players by position. Use 'All' for no filter; 'FLEX' for RB/WR/TE.
 * IDP: Offense (QB,RB,WR,TE,K), DL (DE,DT), LB, DB (CB,S), DE, DT, CB, S, IDP_FLEX (any IDP).
 */
export function filterByPosition(
  players: DraftPlayer[],
  positionFilter: string
): DraftPlayer[] {
  if (!positionFilter || positionFilter === 'All') return players
  if (positionFilter === 'GK') {
    return players.filter((p) => ['GK', 'GKP'].includes((p.position ?? '').toUpperCase()))
  }
  if (positionFilter === 'FLEX') {
    return players.filter((p) => ['RB', 'WR', 'TE'].includes(p.position))
  }
  if (positionFilter === 'Offense') {
    return players.filter((p) => OFFENSE_POSITIONS.has(p.position?.toUpperCase() ?? ''))
  }
  if (positionFilter === 'DL') {
    return players.filter((p) => DL_POSITIONS.has(p.position?.toUpperCase() ?? ''))
  }
  if (positionFilter === 'DB') {
    return players.filter((p) => DB_POSITIONS.has(p.position?.toUpperCase() ?? ''))
  }
  if (positionFilter === 'IDP_FLEX') {
    return players.filter((p) => IDP_FLEX_POSITIONS.has(p.position?.toUpperCase() ?? ''))
  }
  if (positionFilter === 'IDP FLEX') {
    return players.filter((p) => IDP_FLEX_POSITIONS.has(p.position?.toUpperCase() ?? ''))
  }
  // Defense alias group: clicking 'DEF' or 'DST' (or 'D/ST') all match the
  // same defense rows. Without this, NFL leagues with a 'DST' starter slot
  // produced an empty pool because the resolver emits 'DEF' for team defenses.
  if (DEFENSE_POSITIONS.has(positionFilter.toUpperCase())) {
    return players.filter((p) => DEFENSE_POSITIONS.has((p.position ?? '').toUpperCase()))
  }
  return players.filter((p) => p.position === positionFilter)
}

/**
 * Exclude drafted players.
 */
export function excludeDrafted(
  players: DraftPlayer[],
  draftedNames: Set<string>
): DraftPlayer[] {
  return players.filter((p) => !draftedNames.has(p.name))
}

/**
 * Apply search + position + drafted filters.
 */
export function applyDraftFilters(
  players: DraftPlayer[],
  options: {
    searchQuery: string
    positionFilter: string
    draftedNames: Set<string>
    showDrafted?: boolean
  }
): DraftPlayer[] {
  let result = players
  if (!options.showDrafted) {
    result = excludeDrafted(result, options.draftedNames)
  }
  result = filterByPosition(result, options.positionFilter)
  result = filterBySearch(result, options.searchQuery)
  return result
}
