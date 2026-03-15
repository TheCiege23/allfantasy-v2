/**
 * MetaInsightsDashboardService – orchestrates loading and serving Meta Insights dashboard.
 * Powers dashboard open, sport/format/timeframe filters, and data reload.
 */

import { resolveMetaUIData } from './MetaUIDataResolver'
import { resolveAIMetaContext } from './AIMetaContextResolver'
import { resolveSportForMetaUI } from './SportMetaUIResolver'

export interface DashboardLoadOptions {
  sport: string
  leagueFormat?: string
  timeframe?: string
}

/**
 * Load full dashboard data (for server component or GET /api/meta-insights/dashboard).
 */
export async function loadMetaInsightsDashboard(opts: DashboardLoadOptions) {
  const sport = resolveSportForMetaUI(opts.sport)
  return resolveMetaUIData({
    sport,
    leagueFormat: opts.leagueFormat,
    timeframe: opts.timeframe,
  })
}

/**
 * Load AI explain payload (summary + top trends) for the given sport/timeframe.
 */
export async function loadAIMetaExplain(sport: string, timeframe?: string) {
  const payload = await resolveAIMetaContext(resolveSportForMetaUI(sport))
  return {
    summary: payload.summary ?? 'Meta summary unavailable.',
    topTrends: payload.topTrends ?? [],
    sportContext: payload.sport,
  }
}
