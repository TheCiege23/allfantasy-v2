/**
 * Viral Loop Engine (PROMPT 291) — types for growth attribution and shareable URLs.
 */

export type GrowthAttributionSource =
  | 'referral'
  | 'league_invite'
  | 'draft_share'
  | 'ai_share'
  | 'competition_invite'
  | 'organic'

export interface ViralShareParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  ref?: string
}

export interface ShareableUrlOptions {
  baseUrl?: string
  params?: ViralShareParams
  /** Optional path (e.g. /share/[id]) */
  path?: string
}
