/**
 * Viral Loop Engine (PROMPT 291) — growth attribution and shareable URLs.
 */

export type { GrowthAttributionSource, ViralShareParams, ShareableUrlOptions } from './types'
export {
  recordAttribution,
  getAttribution,
  getAttributionCountsBySource,
} from './GrowthAttributionService'
export {
  buildLeagueInviteUrl,
  buildReferralShareUrl,
  buildDraftShareUrl,
  buildAIShareUrl,
  buildShareUrl,
} from './ShareableUrlBuilder'
