/**
 * Shared injury + news contract for AI tools. All fields must originate from
 * real provider/DB rows — never fabricated player events.
 */

export type CanonicalInjuryStatus =
  | 'active'
  | 'probable'
  | 'questionable'
  | 'doubtful'
  | 'out'
  | 'ir'
  | 'suspended'
  | 'personal'
  | 'unknown'

export type InjuryNewsSourceKind =
  | 'injury_report_record'
  | 'sports_injury'
  | 'player_news'
  | 'player_status_event'
  | 'rolling_insights'
  | 'sports_players_row'
  | 'news_context'
  | 'other'

export type InjuryNewsSourceRow = {
  kind: InjuryNewsSourceKind
  /** Human-readable label, e.g. ESPN, Rolling Insights */
  label: string
  statusRaw: string
  atIso: string
  detail?: string | null
  practice?: string | null
  gameStatus?: string | null
  /** 0–1; default by source kind when unknown */
  confidence: number
}

export type NormalizedPlayerInjuryNewsLayer = {
  schemaVersion: 1
  sport: string
  playerName: string
  playerId: string | null
  teamAbbrev: string | null
  canonicalStatus: CanonicalInjuryStatus
  practiceReport: string | null
  gameDesignation: string | null
  suspensionOrUnavailable: boolean
  returnTimelineHint: string | null
  playerNewsSummary: string | null
  primarySource: string | null
  primarySourceAt: string | null
  freshnessHours: number | null
  confidence: number | null
  conflict: boolean
  conflictDetail: string | null
  materialProjectionImpact: boolean
  projectionMultiplier: number
  sources: InjuryNewsSourceRow[]
}

export type InjuryNewsBatchPlayerInput = {
  playerName: string
  playerId?: string | null
  teamAbbrev?: string | null
}
