/**
 * RelatedToolResolver — related tools for a given tool (cross-linking).
 */

import { TOOL_CONFIG, type ToolSlug } from '@/lib/seo-landing/config'
import { getToolCardsForSlugs } from './ToolCardResolver'

export type RelatedToolLink = {
  slug: ToolSlug
  headline: string
  href: string
  openToolHref: string
}

/**
 * Get related tool links for a tool slug (from config relatedToolSlugs).
 */
export function getRelatedTools(forSlug: ToolSlug): RelatedToolLink[] {
  const c = TOOL_CONFIG[forSlug]
  const related = c?.relatedToolSlugs ?? []
  return related
    .map((slug) => {
      const config = TOOL_CONFIG[slug]
      if (!config) return null
      return {
        slug,
        headline: config.headline,
        href: `/tools/${slug}`,
        openToolHref: config.openToolHref,
      }
    })
    .filter((r): r is RelatedToolLink => r != null)
}

/**
 * Get related tool cards (full display) for a slug.
 */
export function getRelatedToolCards(forSlug: ToolSlug) {
  const c = TOOL_CONFIG[forSlug]
  const related = c?.relatedToolSlugs ?? []
  return getToolCardsForSlugs(related)
}
