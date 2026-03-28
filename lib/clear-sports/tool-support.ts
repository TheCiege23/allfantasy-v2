/**
 * PROMPT 153 — ClearSports tool capability matrix.
 * Frontend-safe booleans for feature gating and click-audit friendly state handling.
 */

export type ClearSportsConsumerTool =
  | 'playerCards'
  | 'rankings'
  | 'projections'
  | 'matchupInsights'
  | 'trendDetection'
  | 'newsAlerts'
  | 'draftHelper'
  | 'waiverWire'

export interface ClearSportsToolState {
  enabled: boolean
  loadingState: boolean
  errorState: boolean
  staleState: boolean
  refreshAction: boolean
  emptyStateMessage: string
}

export type ClearSportsToolStateMap = Record<ClearSportsConsumerTool, ClearSportsToolState>

function envFlag(name: string, fallback: boolean = false): boolean {
  const raw = process.env[name]
  if (raw == null || raw.trim() === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
}

/**
 * These tools are always supported from normalized teams/players/games.
 * Optional capabilities are toggled by env flags.
 */
export function getClearSportsToolStates(clearsportsAvailable: boolean): ClearSportsToolStateMap {
  const projectionsEnabled = clearsportsAvailable && envFlag('CLEARSPORTS_PROJECTIONS_ENABLED', false)
  const newsAlertsEnabled = clearsportsAvailable && envFlag('CLEARSPORTS_NEWS_ALERTS_ENABLED', false)

  const base = (enabled: boolean, emptyStateMessage: string): ClearSportsToolState => ({
    enabled,
    loadingState: true,
    errorState: true,
    staleState: true,
    refreshAction: true,
    emptyStateMessage,
  })

  return {
    playerCards: base(clearsportsAvailable, 'Player card data is temporarily unavailable. Try refreshing.'),
    rankings: base(clearsportsAvailable, 'Rankings data is temporarily unavailable. Try refreshing.'),
    projections: base(projectionsEnabled, projectionsEnabled
      ? 'Projections are temporarily unavailable. Try refreshing.'
      : 'Projections are not configured for ClearSports in this environment.'),
    matchupInsights: base(clearsportsAvailable, 'Matchup insights are temporarily unavailable. Try refreshing.'),
    trendDetection: base(clearsportsAvailable, 'Trend data is temporarily unavailable. Try refreshing.'),
    newsAlerts: base(newsAlertsEnabled, newsAlertsEnabled
      ? 'News and alerts are temporarily unavailable. Try refreshing.'
      : 'News and alerts are not configured for ClearSports in this environment.'),
    draftHelper: base(clearsportsAvailable, 'Draft helper data is temporarily unavailable. Try refreshing.'),
    waiverWire: base(clearsportsAvailable, 'Waiver wire data is temporarily unavailable. Try refreshing.'),
  }
}
