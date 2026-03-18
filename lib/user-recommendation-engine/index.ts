/**
 * User Recommendation Engine (PROMPT 301).
 * Recommends leagues, players, and strategies from user behavior and preferences.
 */

export * from "./types"
export {
  getUserRecommendationProfile,
  getLeagueRecommendations,
  getPlayerRecommendations,
  getStrategyRecommendations,
  getRecommendations,
} from "./UserRecommendationEngine"
export type { GetRecommendationsOptions } from "./UserRecommendationEngine"
