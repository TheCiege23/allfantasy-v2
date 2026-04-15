/**
 * [NEW] lib/mlb-schedule/index.ts
 * MLB-specific schedule utilities. Thin wrapper over the sport-agnostic fantasy-schedule module.
 * Provides MLB-typed convenience functions and MLB-specific calendar metadata.
 *
 * MLB has unique scheduling characteristics:
 * - Near-daily games (162 game season)
 * - Series-based scheduling (3-4 game series)
 * - Doubleheaders
 * - All-Star break (mid-July)
 * - Trade deadline (late July/early August)
 * - September roster expansion
 * - Very high game volume compared to other sports
 */

import {
  getWeekVolumeProfile as _getWeekVolumeProfile,
  getLeastBusyDay as _getLeastBusyDay,
  getMostBusyDay as _getMostBusyDay,
  getBalancedScoringDays as _getBalancedScoringDays,
  getWeekGameCounts as _getWeekGameCounts,
  getSeasonVolumeProfiles as _getSeasonVolumeProfiles,
  resolveFantasyWeek as _resolveFantasyWeek,
  getScheduleConfigForLeague,
  updateScheduleConfigForLeague,
} from '@/lib/fantasy-schedule'
import type { WeekVolumeProfile, DayVolume, FantasyWeekPlan } from '@/lib/fantasy-schedule'
import type { LeagueFormatId } from '@/lib/league/format-engine'

export type { WeekVolumeProfile, DayVolume, FantasyWeekPlan } from '@/lib/fantasy-schedule'
export { getScheduleConfigForLeague, updateScheduleConfigForLeague } from '@/lib/fantasy-schedule'

const SPORT = 'MLB' as const

/** MLB-specific calendar metadata. */
export const MLB_CALENDAR = {
  springTrainingStart: { month: 2 },   // Late February / March
  springTrainingEnd: { month: 3 },
  regularSeasonStart: { month: 3 },    // Late March / early April
  regularSeasonEnd: { month: 9 },      // Late September
  playoffsStart: { month: 10 },        // October
  worldSeriesEnd: { month: 10 },       // Late October
  specialPeriods: {
    allStarBreak: { typical: 'mid-July', duration: '3-4 days' },
    tradeDeadline: { typical: 'late July / early August' },
    septemberExpansion: { typical: 'September 1 roster expansion' },
    regularSeasonGames: 162,
  },
  fantasyRegularSeasonWeeks: 26,
  fantasyPlayoffWeeks: 3,
  /** MLB-specific: series typically 3-4 games, with travel/off days between series. */
  seriesStructure: {
    typicalLength: [3, 4],
    offDaysBetween: [0, 1],  // Often no off day between home series; 1 between road trips
  },
}

// MLB-typed convenience functions
export const getMlbWeekVolumeProfile = (season: number, week: number, options?: { thresholdHeavy?: number; thresholdModerate?: number }) =>
  _getWeekVolumeProfile(SPORT, season, week, options)

export const getMlbLeastBusyDay = (season: number, week: number) =>
  _getLeastBusyDay(SPORT, season, week)

export const getMlbMostBusyDay = (season: number, week: number) =>
  _getMostBusyDay(SPORT, season, week)

export const getMlbBalancedScoringDays = (season: number, week: number, count: number) =>
  _getBalancedScoringDays(SPORT, season, week, count)

export const getMlbWeekGameCounts = (season: number, week: number) =>
  _getWeekGameCounts(SPORT, season, week)

export const getMlbSeasonVolumeProfiles = (season: number, startWeek: number, endWeek: number) =>
  _getSeasonVolumeProfiles(SPORT, season, startWeek, endWeek)

export async function resolveMlbFantasyWeek(options: {
  leagueId: string
  leagueFormatId: LeagueFormatId
  leagueVariant?: string | null
  season: number
  week: number
  context?: Record<string, unknown>
}): Promise<FantasyWeekPlan> {
  return _resolveFantasyWeek({ ...options, sport: SPORT })
}
