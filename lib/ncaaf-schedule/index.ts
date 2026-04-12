/**
 * [NEW] lib/ncaaf-schedule/index.ts
 * NCAAF-specific schedule utilities. Thin wrapper over the sport-agnostic fantasy-schedule module.
 *
 * NCAAF has unique scheduling characteristics:
 * - Week 0 (late August, limited games)
 * - Saturday-heavy slates (40-60+ games)
 * - Thursday/Friday midweek games (MACtion, etc.)
 * - Rivalry week (final regular season week)
 * - Conference championship week
 * - Bowl season (mid-December through early January)
 * - College Football Playoff (December/January)
 * - Bye weeks less structured than NFL
 * - Conference-specific scheduling patterns
 * - Short season (12-15 regular season games per team)
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

const SPORT = 'NCAAF' as const

/** NCAAF-specific calendar metadata. */
export const NCAAF_CALENDAR = {
  weekZero: { typical: 'Late August (limited games, 4-8 typically)' },
  regularSeasonStart: { month: 8 },    // Late August (Week 0-1)
  regularSeasonEnd: { month: 11 },     // Late November (Rivalry Week)
  conferenceChampionships: { typical: 'First weekend of December' },
  bowlSeason: { start: { month: 12 }, end: { month: 1 } },
  cfpStart: { typical: 'Late December / early January' },
  cfpChampionship: { typical: 'Mid-January' },
  specialPeriods: {
    weekZero: { week: 0, description: 'Limited games, late August' },
    rivalryWeek: { typical: 'Week 13-14, Thanksgiving weekend rivalries' },
    conferenceChampionshipWeek: { typical: 'Week 14-15, first Saturday of December' },
    armyNavy: { typical: 'Second Saturday of December' },
    bowlSeason: { typical: 'Mid-December through early January, 40+ bowl games' },
    cfpFirstRound: { typical: 'First round expanded playoff (12-team)' },
    cfpQuarterfinals: { typical: 'New Year\'s Six bowls as CFP quarterfinals' },
    cfpSemifinals: { typical: 'Early January' },
    cfpChampionship: { typical: 'Mid-January' },
    thanksgivingGames: { typical: 'Thursday/Friday/Saturday of Thanksgiving week' },
    mactionNights: { typical: 'Tuesday/Wednesday MAC conference midweek games' },
  },
  fantasyRegularSeasonWeeks: 15,       // Weeks 0-14 (configurable; some leagues start Week 1)
  fantasyPlayoffWeeks: 2,              // Typically conference championship + one more
  /** NCAAF game distribution: Saturday-heavy with midweek games. */
  gameDistribution: {
    saturday: '80-90% of weekly games',
    thursday: '2-6 games (midweek MACtion, etc.)',
    friday: '1-3 games',
    sunday: 'Rare (0-1 games)',
    monday: 'Rare (0-1 games)',
  },
  /** Commissioner toggles for postseason inclusion. */
  postseasonInclusion: {
    conferenceChampionships: { default: false, description: 'Include conference championship games in fantasy scoring' },
    bowlGames: { default: false, description: 'Include bowl games in fantasy scoring' },
    cfpGames: { default: false, description: 'Include College Football Playoff games' },
    weekZero: { default: true, description: 'Include Week 0 games' },
  },
}

// NCAAF-typed convenience functions
export const getNcaafWeekVolumeProfile = (season: number, week: number, options?: { thresholdHeavy?: number; thresholdModerate?: number }) =>
  _getWeekVolumeProfile(SPORT, season, week, options)

export const getNcaafLeastBusyDay = (season: number, week: number) =>
  _getLeastBusyDay(SPORT, season, week)

export const getNcaafMostBusyDay = (season: number, week: number) =>
  _getMostBusyDay(SPORT, season, week)

export const getNcaafBalancedScoringDays = (season: number, week: number, count: number) =>
  _getBalancedScoringDays(SPORT, season, week, count)

export const getNcaafWeekGameCounts = (season: number, week: number) =>
  _getWeekGameCounts(SPORT, season, week)

export const getNcaafSeasonVolumeProfiles = (season: number, startWeek: number, endWeek: number) =>
  _getSeasonVolumeProfiles(SPORT, season, startWeek, endWeek)

export async function resolveNcaafFantasyWeek(options: {
  leagueId: string
  leagueFormatId: LeagueFormatId
  leagueVariant?: string | null
  season: number
  week: number
  context?: Record<string, unknown>
}): Promise<FantasyWeekPlan> {
  return _resolveFantasyWeek({ ...options, sport: SPORT })
}
