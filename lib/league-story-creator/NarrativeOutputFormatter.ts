/**
 * NarrativeOutputFormatter — formats StoryOutput into display sections and variants (short/social/long).
 */

import type { StoryOutput } from "./types"

export interface NarrativeSection {
  id: string
  title: string
  content: string
}

export function formatStoryToSections(output: StoryOutput): NarrativeSection[] {
  const sections: NarrativeSection[] = [
    { id: "headline", title: "Headline", content: output.headline },
    { id: "what_happened", title: "What Happened", content: output.whatHappened },
    { id: "why_it_matters", title: "Why It Matters", content: output.whyItMatters },
    { id: "who_it_affects", title: "Who It Affects", content: output.whoItAffects },
    { id: "key_evidence", title: "Key Evidence", content: (output.keyEvidence ?? []).map((e) => `• ${e}`).join("\n") },
    { id: "next_storyline", title: "Next Storyline to Watch", content: output.nextStorylineToWatch },
  ]
  return sections
}

export function getStoryVariant(output: StoryOutput, variant: "short" | "social" | "long"): string {
  if (variant === "short" && output.shortVersion) return output.shortVersion
  if (variant === "social" && output.socialVersion) return output.socialVersion
  if (variant === "long" && output.longVersion) return output.longVersion
  const defaultText = [
    output.headline,
    output.whatHappened,
    output.whyItMatters,
    output.nextStorylineToWatch,
  ].join(" ")
  if (variant === "short") return defaultText.slice(0, 280)
  if (variant === "social") return defaultText.slice(0, 280)
  return defaultText
}
