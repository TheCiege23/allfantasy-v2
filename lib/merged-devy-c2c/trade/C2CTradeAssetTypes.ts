/**
 * PROMPT 4: C2C trade economy — asset typing and valuation context.
 * Extends trade engine with college players, college/rookie picks, future picks, promotion rights.
 */

/** C2C asset types for trade engine and UI. */
export const C2C_TRADE_ASSET_TYPE = {
  PRO_PLAYER: 'PRO_PLAYER',
  COLLEGE_PLAYER: 'COLLEGE_PLAYER',
  ROOKIE_PICK: 'ROOKIE_PICK',
  COLLEGE_PICK: 'COLLEGE_PICK',
  FUTURE_ROOKIE_PICK: 'FUTURE_ROOKIE_PICK',
  FUTURE_COLLEGE_PICK: 'FUTURE_COLLEGE_PICK',
  PROMOTION_RIGHT: 'PROMOTION_RIGHT',
  STARTUP_PICK: 'STARTUP_PICK',
} as const

export type C2CTradeAssetType = (typeof C2C_TRADE_ASSET_TYPE)[keyof typeof C2C_TRADE_ASSET_TYPE]

export interface C2CTradeValuationContext {
  /** timeline-to-pro: years until draft eligible / promotion */
  timelineToPro?: number
  /** college scoring contribution (projected or actual) */
  collegeScoringContribution?: number
  /** pro scoring contribution (projected or actual) */
  proScoringContribution?: number
  /** promotion proximity: 0-1 */
  promotionProximity?: number
  /** class strength score */
  classStrength?: number
  /** age/risk discount factor 0-1 */
  ageRiskDiscount?: number
  /** best ball impact multiplier */
  bestBallImpact?: number
  /** contender vs rebuilder weighting */
  contenderWeight?: number
  /** hybrid championship weight when enabled */
  hybridWeight?: number
}

/**
 * Resolve C2C asset type from player/pick metadata.
 */
export function resolveC2CAssetType(args: {
  isDevyOrCollege?: boolean
  isPromoted?: boolean
  isRookiePick?: boolean
  isCollegePick?: boolean
  isFuturePick?: boolean
  isStartupPick?: boolean
  hasPromotionRights?: boolean
}): C2CTradeAssetType {
  if (args.hasPromotionRights) return C2C_TRADE_ASSET_TYPE.PROMOTION_RIGHT
  if (args.isStartupPick) return C2C_TRADE_ASSET_TYPE.STARTUP_PICK
  if (args.isRookiePick) return args.isFuturePick ? C2C_TRADE_ASSET_TYPE.FUTURE_ROOKIE_PICK : C2C_TRADE_ASSET_TYPE.ROOKIE_PICK
  if (args.isCollegePick) return args.isFuturePick ? C2C_TRADE_ASSET_TYPE.FUTURE_COLLEGE_PICK : C2C_TRADE_ASSET_TYPE.COLLEGE_PICK
  if (args.isDevyOrCollege && !args.isPromoted) return C2C_TRADE_ASSET_TYPE.COLLEGE_PLAYER
  return C2C_TRADE_ASSET_TYPE.PRO_PLAYER
}

/**
 * Compute a simple valuation modifier for C2C assets (timeline, promotion proximity, hybrid).
 * Returns multiplier applied to base value.
 */
export function c2CValuationModifier(
  assetType: C2CTradeAssetType,
  context: C2CTradeValuationContext
): number {
  let mod = 1
  if (context.timelineToPro != null && context.timelineToPro > 0) {
    mod *= Math.max(0.5, 1 - context.timelineToPro * 0.1)
  }
  if (context.promotionProximity != null) {
    mod *= 0.8 + context.promotionProximity * 0.2
  }
  if (context.ageRiskDiscount != null) {
    mod *= context.ageRiskDiscount
  }
  if (context.hybridWeight != null && assetType === C2C_TRADE_ASSET_TYPE.COLLEGE_PLAYER) {
    mod *= 0.9 + context.hybridWeight * 0.2
  }
  return Math.max(0.2, Math.min(2, mod))
}
