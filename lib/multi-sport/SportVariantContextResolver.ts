/**
 * Multi-sport facade for sport + variant context resolution.
 * Resolves canonical sport, format type, and NFL IDP/Soccer context flags.
 */
export {
  SUPPORTED_SPORTS,
  resolveSportVariantContext,
} from '@/lib/league-defaults-orchestrator/SportVariantContextResolver'

export type {
  SportVariantContext,
} from '@/lib/league-defaults-orchestrator/SportVariantContextResolver'
