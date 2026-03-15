/**
 * ToolDiscoveryNavigationService — canonical routes for tool hub and tool discovery.
 */

import { TOOL_CONFIG, type ToolSlug, type SportSlug } from '@/lib/seo-landing/config'

export const ROUTES = {
  toolsHub: () => '/tools-hub',
  toolLanding: (slug: ToolSlug) => `/tools/${slug}`,
  sportLanding: (slug: SportSlug) => `/sports/${slug}`,
  home: () => '/',
  app: () => '/app',
  bracket: () => '/bracket',
  afLegacy: () => '/af-legacy',
  chimmy: () => '/chimmy',
} as const

/**
 * Open-tool href from config (e.g. /trade-evaluator, /mock-draft).
 */
export function getOpenToolHref(slug: ToolSlug): string {
  return TOOL_CONFIG[slug]?.openToolHref ?? '/app'
}

export function getToolsHubPath(): string {
  return ROUTES.toolsHub()
}

export function getToolLandingPath(slug: ToolSlug): string {
  return ROUTES.toolLanding(slug)
}
