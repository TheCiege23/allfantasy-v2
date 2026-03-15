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

/**
 * Filter players by position. Use 'All' for no filter; 'FLEX' for RB/WR/TE.
 */
export function filterByPosition(
  players: DraftPlayer[],
  positionFilter: string
): DraftPlayer[] {
  if (!positionFilter || positionFilter === 'All') return players
  if (positionFilter === 'FLEX') {
    return players.filter((p) =>
      ['RB', 'WR', 'TE'].includes(p.position)
    )
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
