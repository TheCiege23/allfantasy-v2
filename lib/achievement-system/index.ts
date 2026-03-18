/**
 * Achievement System (PROMPT 307).
 * Progression only — first win, best draft, highest score. No money rewards.
 */

export * from "./types"
export { ACHIEVEMENT_TYPES, ACHIEVEMENT_DEFINITIONS } from "./definitions"
export {
  awardAchievement,
  getAchievementsForUser,
  hasAchievement,
} from "./AchievementService"
