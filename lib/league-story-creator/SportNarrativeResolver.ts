/**
 * SportNarrativeResolver — sport-aware labels for league story creator.
 * Uses lib/sport-scope (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer).
 */

import { SUPPORTED_SPORTS, normalizeToSupportedSport } from "@/lib/sport-scope"
import type { StoryType } from "./types"

const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL / Fantasy Football",
  NHL: "NHL / Fantasy Hockey",
  NBA: "NBA / Fantasy Basketball",
  MLB: "MLB / Fantasy Baseball",
  NCAAB: "NCAA Basketball",
  NCAAF: "NCAA Football",
  SOCCER: "Soccer",
}

export function getSportNarrativeLabel(sport: string | null | undefined): string {
  const s = normalizeToSupportedSport(sport)
  return SPORT_LABELS[s] ?? s
}

export function getSupportedSportsForStory(): string[] {
  return [...SUPPORTED_SPORTS]
}

const STORY_TYPE_LABELS: Record<StoryType, string> = {
  weekly_recap: "Weekly Recap",
  rivalry: "Rivalry Story",
  upset: "Upset Story",
  playoff_bubble: "Playoff Bubble Story",
  title_defense: "Title Defense Story",
  trade_fallout: "Trade Fallout Story",
  dynasty: "Dynasty Story",
  bracket_challenge: "Bracket Challenge Story",
  platform_sport: "Platform Sport Story",
}

export function getStoryTypeLabel(storyType: StoryType): string {
  return STORY_TYPE_LABELS[storyType] ?? "League Story"
}

export { normalizeToSupportedSport }
