/**
 * StrategyReportGenerator – generates platform-wide strategy meta reports.
 * Wraps StrategyReportService.generateStrategyMetaReports for AI, War Room, dashboards.
 */
import {
  generateStrategyMetaReports,
  getStrategyMetaReports,
} from './StrategyReportService'
import type { StrategySport, LeagueFormat } from './types'

export interface GenerateOptions {
  sport?: StrategySport
  leagueFormat?: LeagueFormat
  leagueIds?: string[]
}

/**
 * Generate and persist StrategyMetaReport for the given sport/format/leagues.
 * Uses draft picks + roster + SeasonResult; runs StrategyPatternAnalyzer and MetaSuccessEvaluator.
 */
export async function generateReports(opts: GenerateOptions): Promise<{ reports: number; errors: string[] }> {
  return generateStrategyMetaReports({
    sport: opts.sport,
    leagueFormat: opts.leagueFormat,
    leagueIds: opts.leagueIds,
  })
}

/**
 * Get existing strategy meta reports (for dashboards, War Room, AI context).
 */
export async function getReports(opts: { sport?: string; leagueFormat?: string }) {
  return getStrategyMetaReports(opts)
}
