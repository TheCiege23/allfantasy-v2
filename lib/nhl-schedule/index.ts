/**
 * [NEW] lib/nhl-schedule/index.ts
 * NHL-specific schedule utilities. Thin wrapper over the sport-agnostic fantasy-schedule module.
 * Provides NHL-typed convenience functions and NHL-specific calendar metadata.
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

// Re-export generalized types
export type { WeekVolumeProfile, DayVolume, FantasyWeekPlan } from '@/lib/fantasy-schedule'
export { getScheduleConfigForLeague, updateScheduleConfigForLeague } from '@/lib/fantasy-schedule'

const SPORT = 'NHL' as const

/** NHL-specific calendar metadata. */
export const NHL_CALENDAR = {
  regularSeasonStart: { month: 10 },  // October
  regularSeasonEnd: { month: 4 },     // April
  playoffsStart: { month: 4 },        // April
  playoffsEnd: { month: 6 },          // June
  specialPeriods: {
    allStarBreak: { typical: 'late January / early February' },
    tradeDeadline: { typical: 'early March' },
    holidayBreak: { typical: 'December 24-25' },
  },
  fantasyRegularSeasonWeeks: 25,
  fantasyPlayoffWeeks: 4,
}

// NHL-typed convenience functions
export const getNhlWeekVolumeProfile = (season: number, week: number, options?: { thresholdHeavy?: number; thresholdModerate?: number }) =>
  _getWeekVolumeProfile(SPORT, season, week, options)

export const getNhlLeastBusyDay = (season: number, week: number) =>
  _getLeastBusyDay(SPORT, season, week)

export const getNhlMostBusyDay = (season: number, week: number) =>
  _getMostBusyDay(SPORT, season, week)

export const getNhlBalancedScoringDays = (season: number, week: number, count: number) =>
  _getBalancedScoringDays(SPORT, season, week, count)

export const getNhlWeekGameCounts = (season: number, week: number) =>
  _getWeekGameCounts(SPORT, season, week)

export const getNhlSeasonVolumeProfiles = (season: number, startWeek: number, endWeek: number) =>
  _getSeasonVolumeProfiles(SPORT, season, startWeek, endWeek)

export async function resolveNhlFantasyWeek(options: {
  leagueId: string
  leagueFormatId: LeagueFormatId
  leagueVariant?: string | null
  season: number
  week: number
  context?: Record<string, unknown>
}): Promise<FantasyWeekPlan> {
  return _resolveFantasyWeek({ ...options, sport: SPORT })
}
