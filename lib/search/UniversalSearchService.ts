/**
 * UniversalSearchService — orchestrates search: quick actions + static results + optional API (leagues/players).
 */

import { filterQuickActionsByQuery } from "./QuickActionsService"
import { resolveStaticResults, groupResultsByCategory, type SearchResultItem } from "./SearchResultResolver"

export type SearchResultGroup = "quick_actions" | "pages" | "tools" | "leagues" | "players"

export interface UniversalSearchPayload {
  query: string
  quickActions: ReturnType<typeof filterQuickActionsByQuery>
  staticResults: SearchResultItem[]
  /** When true, client can call league/player APIs for live results. */
  suggestLiveSearch: boolean
}

/** Build search payload from query. Quick actions when empty/short; static results when query length >= 2. */
export function getUniversalSearchPayload(query: string): UniversalSearchPayload {
  const q = query.trim()
  const quickActions = filterQuickActionsByQuery(q)
  const staticResults = q.length >= 2 ? resolveStaticResults(q) : []
  const suggestLiveSearch = q.length >= 2
  return {
    query: q,
    quickActions,
    staticResults,
    suggestLiveSearch,
  }
}

/** Group static results for UI (pages vs tools). */
export function getGroupedStaticResults(staticResults: SearchResultItem[]) {
  return groupResultsByCategory(staticResults)
}
