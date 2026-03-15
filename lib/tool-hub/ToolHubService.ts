/**
 * ToolHubService — all tools, by category, for sport. Single entry for hub data.
 */

import {
  TOOL_SLUGS,
  TOOL_CONFIG,
  SPORT_SLUGS,
  SPORT_CONFIG,
  type ToolSlug,
  type SportSlug,
} from '@/lib/seo-landing/config'
import type { ToolCategoryId } from './types'
import { getToolsByCategory } from './FeaturedToolResolver'

export type ToolHubTool = {
  slug: ToolSlug
  headline: string
  description: string
  benefitSummary: string
  openToolHref: string
  relatedToolSlugs: ToolSlug[]
}

export type ToolHubSport = {
  slug: SportSlug
  headline: string
  leagueSport: string
}

/**
 * All tools for the hub (with config).
 */
export function getAllTools(): ToolHubTool[] {
  return TOOL_SLUGS.map((slug) => {
    const c = TOOL_CONFIG[slug]
    return {
      slug,
      headline: c.headline,
      description: c.description,
      benefitSummary: c.benefitSummary,
      openToolHref: c.openToolHref,
      relatedToolSlugs: c.relatedToolSlugs ?? [],
    }
  })
}

/**
 * All sports for the hub.
 */
export function getAllSports(): ToolHubSport[] {
  return SPORT_SLUGS.map((slug) => ({
    slug,
    headline: SPORT_CONFIG[slug].headline,
    leagueSport: SPORT_CONFIG[slug].leagueSport,
  }))
}

/**
 * Tools in a given category.
 */
export function getToolsInCategory(categoryId: ToolCategoryId): ToolHubTool[] {
  const slugs = getToolsByCategory()[categoryId] ?? []
  return slugs
    .map((slug) => {
      const c = TOOL_CONFIG[slug]
      if (!c) return null
      return {
        slug,
        headline: c.headline,
        description: c.description,
        benefitSummary: c.benefitSummary,
        openToolHref: c.openToolHref,
        relatedToolSlugs: c.relatedToolSlugs ?? [],
      }
    })
    .filter((t): t is ToolHubTool => t != null)
}

/**
 * Tools relevant to a sport (tools that appear in that sport's toolHrefs or all if not specified).
 */
export function getToolsForSport(sportSlug: SportSlug | null): ToolHubTool[] {
  if (!sportSlug) return getAllTools()
  const sportConfig = SPORT_CONFIG[sportSlug]
  if (!sportConfig?.toolHrefs?.length) return getAllTools()
  const hrefSet = new Set(sportConfig.toolHrefs.map((h) => h.href))
  return getAllTools().filter((t) => hrefSet.has(t.openToolHref))
}
