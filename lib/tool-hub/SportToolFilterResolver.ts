/**
 * SportToolFilterResolver — sport-aware tool filtering for the hub.
 */

import { SPORT_CONFIG, SPORT_SLUGS, type SportSlug, type ToolSlug } from '@/lib/seo-landing/config'
import { getAllTools } from './ToolHubService'

export type SportFilterOption = {
  slug: SportSlug
  label: string
  leagueSport: string
}

/**
 * All sport filter options (for hub dropdown).
 */
export function getSportFilterOptions(): SportFilterOption[] {
  return SPORT_SLUGS.map((slug) => ({
    slug,
    label: SPORT_CONFIG[slug].headline,
    leagueSport: SPORT_CONFIG[slug].leagueSport,
  }))
}

/**
 * Tool slugs that are linked from a sport's landing page (toolHrefs).
 * Used to filter "tools for this sport" when a sport is selected.
 */
function getToolHrefsSet(sportSlug: SportSlug): Set<string> {
  const config = SPORT_CONFIG[sportSlug]
  if (!config?.toolHrefs?.length) return new Set()
  return new Set(config.toolHrefs.map((h) => h.href))
}

/**
 * For a given sport, return tool slugs that are relevant (appear in that sport's toolHrefs).
 * If no tool has matching openToolHref, return all tool slugs so we never show empty.
 */
export function getToolSlugsForSport(sportSlug: SportSlug | null): ToolSlug[] {
  if (!sportSlug) return getAllTools().map((t) => t.slug)
  const hrefSet = getToolHrefsSet(sportSlug)
  const all = getAllTools()
  const filtered = all.filter((t) => hrefSet.has(t.openToolHref))
  return filtered.length > 0 ? filtered.map((t) => t.slug) : all.map((t) => t.slug)
}
