/**
 * Multi-sport facade for league variant registry.
 * Keeps variant/preset APIs accessible from the multi-sport module root.
 */
export {
  NFL_VARIANTS,
  NFL_VARIANT_LABELS,
  NFL_IDP_ROSTER_OVERLAY,
  getFormatTypeForVariant,
  getRosterOverlayForVariant,
  isIdpVariant,
  isDevyDynastyVariant,
  getVariantsForSport,
} from '@/lib/sport-defaults/LeagueVariantRegistry'
