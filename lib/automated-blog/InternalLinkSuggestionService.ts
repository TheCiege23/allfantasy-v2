/**
 * InternalLinkSuggestionService — suggests internal links to tools and sport landing pages.
 * Uses seo-landing config for tool/sport slugs; blog body and category inform suggestions.
 */

import {
  SPORT_SLUGS,
  TOOL_SLUGS,
  SPORT_CONFIG,
  TOOL_CONFIG,
  type SportSlug,
  type ToolSlug,
} from "@/lib/seo-landing/config"
import type { InternalLinkSuggestion } from "./types"

const SPORT_SLUG_MAP: Record<string, SportSlug> = {
  NFL: "fantasy-football",
  NHL: "fantasy-hockey",
  NBA: "fantasy-basketball",
  MLB: "fantasy-baseball",
  NCAAF: "ncaa-football-fantasy",
  NCAAB: "ncaa-basketball-fantasy",
  SOCCER: "fantasy-soccer",
}

/**
 * Suggest internal links based on article sport, category, and body text.
 */
export function suggestInternalLinks(options: {
  sport: string
  category: string
  body: string
  maxSuggestions?: number
}): InternalLinkSuggestion[] {
  const { sport, category, body, maxSuggestions = 8 } = options
  const suggestions: InternalLinkSuggestion[] = []
  const bodyLower = body.toLowerCase()

  const sportSlug = SPORT_SLUG_MAP[sport]
  if (sportSlug && SPORT_CONFIG[sportSlug]) {
    const config = SPORT_CONFIG[sportSlug]
    suggestions.push({
      anchor: config.headline || config.title.split("|")[0].trim(),
      href: `/sports/${sportSlug}`,
      reason: "Sport landing",
    })
  }

  const toolRelevance: Array<{ slug: ToolSlug; anchor: string; reason: string }> = []
  if (/trade|swap|deal/.test(bodyLower) || category === "trade_value") {
    toolRelevance.push({ slug: "trade-analyzer", anchor: "Trade Analyzer", reason: "Trade content" })
  }
  if (/waiver|pickup|add|drop/.test(bodyLower) || category === "waiver_wire") {
    toolRelevance.push({ slug: "waiver-wire-advisor", anchor: "Waiver Wire Advisor", reason: "Waiver content" })
  }
  if (/draft|adp|mock/.test(bodyLower) || category === "draft_prep") {
    toolRelevance.push({ slug: "mock-draft-simulator", anchor: "Mock Draft Simulator", reason: "Draft content" })
  }
  if (/bracket|march|ncaa/.test(bodyLower) || category === "bracket_strategy") {
    toolRelevance.push({ slug: "bracket-challenge", anchor: "Bracket Challenge", reason: "Bracket content" })
  }
  if (/rank|power/.test(bodyLower) || category === "ranking_updates") {
    toolRelevance.push({ slug: "power-rankings", anchor: "Power Rankings", reason: "Rankings content" })
  }
  if (/creator|community|recap/.test(bodyLower) || category === "creator_recap") {
    toolRelevance.push({ slug: "bracket-challenge", anchor: "Bracket Challenge", reason: "Creator/community" })
  }
  if (/trend|breakout|usage|player/.test(bodyLower) || category === "player_trend_feature") {
    toolRelevance.push({ slug: "waiver-wire-advisor", anchor: "Waiver Wire Advisor", reason: "Player trends" })
  }

  for (const { slug, anchor } of toolRelevance) {
    if (TOOL_SLUGS.includes(slug) && TOOL_CONFIG[slug]) {
      suggestions.push({ anchor, href: `/tools/${slug}`, reason: "Tool" })
    }
  }

  suggestions.push({ anchor: "Blog", href: "/blog", reason: "Blog index" })

  const uniq = new Map<string, InternalLinkSuggestion>()
  for (const s of suggestions) {
    if (!uniq.has(s.href)) uniq.set(s.href, s)
  }
  return Array.from(uniq.values()).slice(0, maxSuggestions)
}

/**
 * Get all tool and sport links for "related resources" section (e.g. in CMS).
 */
export function getToolAndSportLinks(): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = []
  for (const slug of TOOL_SLUGS) {
    const c = TOOL_CONFIG[slug]
    if (c) out.push({ label: c.title.split("|")[0].trim(), href: `/tools/${slug}` })
  }
  for (const slug of SPORT_SLUGS) {
    const c = SPORT_CONFIG[slug]
    if (c) out.push({ label: c.headline, href: `/sports/${slug}` })
  }
  return out
}
