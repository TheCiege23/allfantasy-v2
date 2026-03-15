/**
 * Tool Hub — discovery, filtering, and cross-tool linking.
 */

export {
  getAllTools,
  getAllSports,
  getToolsInCategory,
  getToolsForSport,
} from './ToolHubService'
export type { ToolHubTool, ToolHubSport } from './ToolHubService'

export { getToolCardDisplay, getToolCardsForSlugs } from './ToolCardResolver'

export { getRelatedTools, getRelatedToolCards } from './RelatedToolResolver'
export type { RelatedToolLink } from './RelatedToolResolver'

export {
  getSportFilterOptions,
  getToolSlugsForSport,
} from './SportToolFilterResolver'
export type { SportFilterOption } from './SportToolFilterResolver'

export {
  getFeaturedToolSlugs,
  getToolsByCategory,
  getCategoryForTool,
  getCategoryLabel,
  CATEGORY_ORDER,
} from './FeaturedToolResolver'

export {
  ROUTES,
  getOpenToolHref,
  getToolsHubPath,
  getToolLandingPath,
} from './ToolDiscoveryNavigationService'

export type { ToolCardDisplay, ToolCategoryId, FeaturedToolEntry } from './types'
