/**
 * AI ADP engine types.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

export type AiAdpLeagueType = 'redraft' | 'dynasty'
export type AiAdpFormatKey = 'default' | 'ppr' | 'half-ppr' | 'sf' | 'standard'

export interface AiAdpPlayerEntry {
  playerName: string
  position: string
  team: string | null
  adp: number
  sampleSize: number
  /** True when sampleSize < lowSampleThreshold (e.g. < 5 drafts) */
  lowSample?: boolean
}

export interface AiAdpSnapshotMeta {
  minSampleSize?: number
  lowSampleThreshold?: number
  segmentLabel?: string
}

export const LOW_SAMPLE_THRESHOLD_DEFAULT = 5
export const MIN_SAMPLE_SIZE_DEFAULT = 2
