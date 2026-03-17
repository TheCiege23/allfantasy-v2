/**
 * StoryToMediaBridge — maps StoryOutput to media/article widget shape for reuse in news feed or cards.
 */

import type { StoryOutput } from "./types"

export interface MediaStoryShape {
  id: string
  headline: string
  body: string
  excerpt: string
  type: "league_story"
  leagueId: string
  sport: string
  storyType: string
  createdAt: string
}

/**
 * Turn StoryOutput into a shape suitable for media list or article card (e.g. NewsTab, MediaArticle).
 */
export function storyToMediaShape(
  output: StoryOutput,
  options: { leagueId: string; sport: string; storyType: string; id?: string }
): MediaStoryShape {
  const body = [
    output.whatHappened,
    output.whyItMatters,
    output.whoItAffects,
    output.keyEvidence?.length ? output.keyEvidence.map((e) => `• ${e}`).join("\n") : "",
    output.nextStorylineToWatch,
  ]
    .filter(Boolean)
    .join("\n\n")
  const excerpt = output.shortVersion ?? output.headline + ". " + output.whatHappened.slice(0, 120)
  return {
    id: options.id ?? `story_${Date.now()}`,
    headline: output.headline,
    body,
    excerpt: excerpt.slice(0, 300),
    type: "league_story",
    leagueId: options.leagueId,
    sport: options.sport,
    storyType: options.storyType,
    createdAt: new Date().toISOString(),
  }
}
