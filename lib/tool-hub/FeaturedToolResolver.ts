/**
 * FeaturedToolResolver — featured/trending tools and category grouping for the hub.
 */

import type { ToolSlug } from '@/lib/seo-landing/config'
import type { ToolCategoryId } from './types'

const CATEGORY_LABELS: Record<ToolCategoryId, string> = {
  trade: 'Trade',
  waiver: 'Waiver & Lineup',
  draft: 'Draft',
  simulate: 'Simulate',
  bracket: 'Bracket',
  rankings: 'Rankings',
  legacy: 'Legacy & Dynasty',
  ai: 'AI & Assistant',
}

/** Slug → category for hub grouping. */
const TOOL_CATEGORY: Record<ToolSlug, ToolCategoryId> = {
  'trade-analyzer': 'trade',
  'mock-draft-simulator': 'draft',
  'waiver-wire-advisor': 'waiver',
  'ai-draft-assistant': 'ai',
  'matchup-simulator': 'simulate',
  'bracket-challenge': 'bracket',
  'power-rankings': 'rankings',
  'legacy-dynasty': 'legacy',
}

/** Featured tool slugs (shown first on hub). */
const FEATURED_SLUGS: ToolSlug[] = [
  'trade-analyzer',
  'mock-draft-simulator',
  'waiver-wire-advisor',
  'ai-draft-assistant',
]

/** Trending tool slugs (shown in separate momentum rail). */
const TRENDING_SLUGS: ToolSlug[] = [
  'matchup-simulator',
  'bracket-challenge',
  'power-rankings',
  'legacy-dynasty',
]

/** Category order for tabs/sections. */
export const CATEGORY_ORDER: ToolCategoryId[] = [
  'trade',
  'waiver',
  'draft',
  'simulate',
  'bracket',
  'rankings',
  'legacy',
  'ai',
]

export function getCategoryLabel(id: ToolCategoryId): string {
  return CATEGORY_LABELS[id] ?? id
}

export function getCategoryForTool(slug: ToolSlug): ToolCategoryId {
  return TOOL_CATEGORY[slug] ?? 'legacy'
}

export function getFeaturedToolSlugs(): ToolSlug[] {
  return FEATURED_SLUGS
}

export function getTrendingToolSlugs(): ToolSlug[] {
  return TRENDING_SLUGS
}

/**
 * Tools grouped by category (for hub tabs/sections).
 */
export function getToolsByCategory(): Record<ToolCategoryId, ToolSlug[]> {
  const map: Record<ToolCategoryId, ToolSlug[]> = {
    trade: [],
    waiver: [],
    draft: [],
    simulate: [],
    bracket: [],
    rankings: [],
    legacy: [],
    ai: [],
  }
  for (const slug of Object.keys(TOOL_CATEGORY) as ToolSlug[]) {
    const cat = TOOL_CATEGORY[slug]
    if (!map[cat].includes(slug)) map[cat].push(slug)
  }
  return map
}
