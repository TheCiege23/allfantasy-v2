/**
 * CommandPaletteService — command palette open/close and keyboard handling.
 * Re-exports SearchOverlayController and adds a simple contract for the overlay.
 */

export {
  getCommandPaletteShortcut,
  isCommandPaletteShortcut,
  createCommandPaletteHandler,
} from "./SearchOverlayController"

export type { UniversalSearchPayload } from "./UniversalSearchService"
export { getUniversalSearchPayload, getGroupedStaticResults } from "./UniversalSearchService"
export { getQuickActions, filterQuickActionsByQuery } from "./QuickActionsService"
export type { QuickActionItem } from "./QuickActionsService"
export { resolveStaticResults, getStaticSearchItems, groupResultsByCategory } from "./SearchResultResolver"
export type { SearchResultItem, SearchResultCategory } from "./SearchResultResolver"
export { getSupportedSportFilters, resolveSportFilter, shouldShowSportFilter } from "./SportSearchFilterResolver"
