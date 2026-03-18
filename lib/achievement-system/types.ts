/**
 * Achievement System (PROMPT 307) — types.
 * Progression only; no money rewards.
 */

/** Achievement types used for progression (first win, best draft, highest score, etc.). */
export type AchievementType =
  | "first_win"
  | "best_draft"
  | "highest_score"
  | "draft_completed"
  | "ten_wins"

export interface AchievementDefinition {
  id: AchievementType
  name: string
  description: string
  icon: string
  tier: "bronze" | "silver" | "gold" | "diamond"
  /** XP / progression points only (no monetary value). */
  xpReward: number
}

export interface EarnedAchievement {
  id: string
  achievementType: AchievementType
  name: string
  description: string
  icon: string
  tier: string
  xpReward: number
  earnedAt: string
  /** Optional context (e.g. leagueId, week, value). */
  meta?: Record<string, unknown>
}

export interface AchievementWithEarned extends AchievementDefinition {
  earned: boolean
  earnedAt?: string
  meta?: Record<string, unknown>
}
