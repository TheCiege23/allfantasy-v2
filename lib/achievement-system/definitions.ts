/**
 * Achievement definitions (PROMPT 307).
 * First win, best draft, highest score — progression only, no money rewards.
 */

import type { AchievementDefinition, AchievementType } from "./types"

export const ACHIEVEMENT_TYPES: AchievementType[] = [
  "first_win",
  "draft_completed",
  "highest_score",
  "best_draft",
  "ten_wins",
]

export const ACHIEVEMENT_DEFINITIONS: Record<AchievementType, AchievementDefinition> = {
  first_win: {
    id: "first_win",
    name: "First Win",
    description: "Won your first matchup",
    icon: "🏆",
    tier: "bronze",
    xpReward: 25,
  },
  best_draft: {
    id: "best_draft",
    name: "Best Draft",
    description: "Had the best draft in your league (by grade or result)",
    icon: "📋",
    tier: "gold",
    xpReward: 150,
  },
  highest_score: {
    id: "highest_score",
    name: "Highest Score",
    description: "Scored the most points in a single week in your league",
    icon: "🔥",
    tier: "silver",
    xpReward: 75,
  },
  draft_completed: {
    id: "draft_completed",
    name: "Draft Complete",
    description: "Completed your first league draft",
    icon: "✅",
    tier: "bronze",
    xpReward: 50,
  },
  ten_wins: {
    id: "ten_wins",
    name: "Ten Wins",
    description: "Reached 10 wins across your leagues",
    icon: "🌟",
    tier: "silver",
    xpReward: 100,
  },
}
