/**
 * Achievement Service (PROMPT 307).
 * Award and list progression achievements. No money rewards.
 */

import { checkAndAwardBadge, getUserBadges } from "@/lib/badge-engine"
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_TYPES } from "./definitions"
import type { AchievementType, AchievementWithEarned, EarnedAchievement } from "./types"

/**
 * Award an achievement to a user if not already earned.
 * Returns the earned achievement or null if already had it or invalid type.
 */
export async function awardAchievement(
  userId: string,
  achievementType: AchievementType,
  meta?: Record<string, unknown>
): Promise<EarnedAchievement | null> {
  const definition = ACHIEVEMENT_DEFINITIONS[achievementType]
  if (!definition) return null

  const badge = await checkAndAwardBadge(userId, undefined, achievementType)
  if (!badge) return null

  return {
    id: badge.id!,
    achievementType,
    name: badge.badgeName,
    description: badge.description,
    icon: badge.icon,
    tier: badge.tier,
    xpReward: badge.xpReward,
    earnedAt: new Date().toISOString(),
    meta,
  }
}

/**
 * Get all achievement definitions with earned status for a user.
 */
export async function getAchievementsForUser(userId: string): Promise<AchievementWithEarned[]> {
  const earned = await getUserBadges(userId)
  const earnedByType = new Map(
    earned
      .filter((b) => ACHIEVEMENT_TYPES.includes(b.badgeType as AchievementType))
      .map((b) => [
        b.badgeType,
        {
          earnedAt: b.earnedAt instanceof Date ? b.earnedAt.toISOString() : String(b.earnedAt),
          meta: (b.data as Record<string, unknown>) ?? undefined,
        },
      ])
  )

  return ACHIEVEMENT_TYPES.map((type) => {
    const def = ACHIEVEMENT_DEFINITIONS[type]
    const e = earnedByType.get(type)
    return {
      ...def,
      earned: !!e,
      earnedAt: e?.earnedAt,
      meta: e?.meta,
    }
  })
}

/**
 * Check if user has already earned an achievement type.
 */
export async function hasAchievement(userId: string, achievementType: AchievementType): Promise<boolean> {
  const earned = await getUserBadges(userId)
  return earned.some((b) => b.badgeType === achievementType)
}
