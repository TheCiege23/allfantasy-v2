/**
 * ToolCardResolver — build card display props from tool slug for hub and tool landing.
 */

import { TOOL_CONFIG, type ToolSlug } from '@/lib/seo-landing/config'
import type { ToolCardDisplay } from './types'
import { getCategoryForTool } from './FeaturedToolResolver'

export function getToolCardDisplay(slug: ToolSlug): ToolCardDisplay | null {
  const c = TOOL_CONFIG[slug]
  if (!c) return null
  const category = getCategoryForTool(slug)
  return {
    slug,
    headline: c.headline,
    description: c.description,
    openToolHref: c.openToolHref,
    toolLandingHref: `/tools/${slug}`,
    category,
  }
}

export function getToolCardsForSlugs(slugs: ToolSlug[]): ToolCardDisplay[] {
  return slugs
    .map((s) => getToolCardDisplay(s))
    .filter((c): c is ToolCardDisplay => c != null)
}
