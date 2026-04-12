/**
 * [NEW] lib/nfl-schedule/index.ts
 * NFL-specific schedule utilities. Thin wrapper over the sport-agnostic fantasy-schedule module.
 *
 * NFL has a unique weekly structure:
 * - Thursday Night Football (1 game)
 * - Sunday early slate (6-8 games, 1pm ET)
 * - Sunday late slate (2-3 games, 4:05/4:25pm ET)
 * - Sunday Night Football (1 game, 8:20pm ET)
 * - Monday Night Football (1-2 games, 8:15pm ET)
 * - Occasional Saturday games (Weeks 15-18)
 * - Bye weeks (Weeks 5-14 typically)
 * - Thanksgiving (3 games)
 * - Black Friday (1 game, newer addition)
 * - International games (London, Munich, Mexico City)
 *
 * Admin/processing windows: Tuesday-Wednesday (post-MNF, pre-waivers)
 * Waiver processing: typically Wednesday morning
 * Lineup lock: first kickoff of the week (Thursday) or rolling per-game locks
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

const SPORT = 'NFL' as const

/** NFL-specific calendar metadata. */
export const NFL_CALENDAR = {
  preseasonStart: { month: 8 },         // August
  regularSeasonStart: { month: 9 },     // Early September
  regularSeasonEnd: { month: 1 },       // January (Week 18)
  playoffsStart: { month: 1 },          // January (Wild Card)
  superBowl: { month: 2 },             // February
  specialPeriods: {
    byeWeekWindow: { startWeek: 5, endWeek: 14 },
    thanksgiving: { typical: 'Week 13, Thursday — 3 games' },
    blackFriday: { typical: 'Week 13, Friday — 1 game (since 2023)' },
    saturdayGames: { typical: 'Weeks 15-18 — Saturday afternoon/evening' },
    internationalGames: { typical: 'London (Weeks 1-8), Munich, Mexico City' },
    fantasyPlayoffDefault: { startWeek: 15, endWeek: 17 },
    week18Avoidance: 'Most fantasy leagues end Week 17 to avoid rest/benching',
  },
  fantasyRegularSeasonWeeks: 14,        // Weeks 1-14 (default)
  fantasyPlayoffWeeks: 3,               // Weeks 15-17
  totalNflWeeks: 18,
  /** NFL kickoff windows. */
  kickoffWindows: {
    thursdayNight: '8:20pm ET',
    sundayEarly: '1:00pm ET',
    sundayLate: '4:05pm / 4:25pm ET',
    sundayNight: '8:20pm ET',
    mondayNight: '8:15pm ET',
    saturdayGames: '1:00pm / 4:30pm / 8:00pm ET',
  },
  /** NFL admin windows (post-game processing). */
  adminWindows: {
    postMondayNight: 'Tuesday (scoring finalization, stat corrections)',
    waiverProcessing: 'Wednesday (standard FAAB/waiver runs)',
    lineupPrep: 'Wednesday-Saturday (lineup decisions)',
  },
}

// NFL-typed convenience functions
export const getNflWeekVolumeProfile = (season: number, week: number, options?: { thresholdHeavy?: number; thresholdModerate?: number }) =>
  _getWeekVolumeProfile(SPORT, season, week, options)

export const getNflLeastBusyDay = (season: number, week: number) =>
  _getLeastBusyDay(SPORT, season, week)

export const getNflMostBusyDay = (season: number, week: number) =>
  _getMostBusyDay(SPORT, season, week)

export const getNflBalancedScoringDays = (season: number, week: number, count: number) =>
  _getBalancedScoringDays(SPORT, season, week, count)

export const getNflWeekGameCounts = (season: number, week: number) =>
  _getWeekGameCounts(SPORT, season, week)

export const getNflSeasonVolumeProfiles = (season: number, startWeek: number, endWeek: number) =>
  _getSeasonVolumeProfiles(SPORT, season, startWeek, endWeek)

export async function resolveNflFantasyWeek(options: {
  leagueId: string
  leagueFormatId: LeagueFormatId
  leagueVariant?: string | null
  season: number
  week: number
  context?: Record<string, unknown>
}): Promise<FantasyWeekPlan> {
  return _resolveFantasyWeek({ ...options, sport: SPORT })
}
