/**
 * [NEW] lib/soccer-schedule/index.ts
 * Soccer-specific schedule utilities. Thin wrapper over the sport-agnostic fantasy-schedule module.
 *
 * Soccer has unique scheduling characteristics:
 * - Matchday-based (not weekly like US sports)
 * - 38 matchdays in a typical league season (Aug-May)
 * - International breaks (5-6 per season, ~2 weeks each)
 * - Double gameweeks (DGW) — teams play twice in one fantasy week
 * - Blank gameweeks (BGW) — some teams don't play due to cup rescheduling
 * - Domestic cups (FA Cup, League Cup, etc.) running concurrently
 * - Continental competitions (Champions League, Europa League) midweek
 * - Winter break (varies by league — Bundesliga yes, Premier League partial)
 * - Holiday fixture congestion (Boxing Day, New Year's)
 * - Transfer windows (January, Summer)
 * - No playoffs in most leagues (table position determines champion)
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

const SPORT = 'SOCCER' as const

/** Soccer-specific calendar metadata. */
export const SOCCER_CALENDAR = {
  seasonStart: { month: 8 },            // August
  seasonEnd: { month: 5 },              // May
  specialPeriods: {
    internationalBreaks: {
      typical: '5-6 per season (~September, October, November, March, June)',
      duration: '10-14 days each',
      impact: 'No domestic league fixtures; some cup matches may proceed',
    },
    doubleGameweeks: {
      description: 'Fantasy weeks where some teams play twice due to rescheduled fixtures',
      impact: 'Higher scoring potential for managers with DGW players',
    },
    blankGameweeks: {
      description: 'Fantasy weeks where some teams do not play (cup fixtures take priority)',
      impact: 'Reduced scoring; managers must plan around missing players',
    },
    winterBreak: {
      typical: 'Late December / early January (varies by league)',
      premierLeague: 'Minimal — plays through holidays (Boxing Day, New Year\'s)',
      bundesliga: '2-3 week break in December/January',
    },
    holidayCongestion: {
      typical: 'December 26 (Boxing Day) through January 3',
      description: '3-4 matches in ~10 days for English clubs',
    },
    transferWindows: {
      summer: { start: 'June', end: 'August/September (varies)' },
      winter: { start: 'January 1', end: 'January 31' },
    },
    domesticCups: {
      typical: 'FA Cup (Aug-May), League Cup (Aug-Feb), etc.',
      scheduling: 'Midweek or weekend replacement fixtures',
    },
    continentalCompetitions: {
      typical: 'Champions League, Europa League, Conference League',
      scheduling: 'Tuesday/Wednesday group/knockout stages',
    },
    endOfSeason: {
      finalMatchday: 'All matches simultaneous on final day',
      relegationBattle: 'May affect player effort/rest',
    },
  },
  fantasyRegularSeasonWeeks: 38,
  fantasyPlayoffWeeks: 0,               // No playoffs in most soccer leagues
  /** Soccer match distribution. */
  matchDistribution: {
    saturday: 'Primary matchday (3pm kickoffs, evening games)',
    sunday: 'Secondary matchday (early, afternoon, evening)',
    midweek: 'Tuesday/Wednesday for cup and continental fixtures',
    friday: 'Occasional opening match',
    monday: 'Occasional closing match',
  },
  /** Commissioner toggles for competition inclusion. */
  competitionInclusion: {
    domesticLeague: { default: true, description: 'Include domestic league matches' },
    domesticCups: { default: false, description: 'Include FA Cup, League Cup, etc.' },
    continentalCompetitions: { default: false, description: 'Include Champions League, Europa League, etc.' },
    internationalWindows: { default: false, description: 'Include international break friendlies/qualifiers' },
  },
  /** Double/blank gameweek handling options. */
  gameweekHandling: {
    doubleGameweek: {
      options: ['count_all', 'cap_at_one', 'average'],
      default: 'count_all',
      description: 'How to handle teams playing twice in one fantasy week',
    },
    blankGameweek: {
      options: ['zero_if_no_match', 'carry_previous', 'average_season'],
      default: 'zero_if_no_match',
      description: 'How to handle teams not playing in a fantasy week',
    },
  },
}

// Soccer-typed convenience functions
export const getSoccerWeekVolumeProfile = (season: number, week: number, options?: { thresholdHeavy?: number; thresholdModerate?: number }) =>
  _getWeekVolumeProfile(SPORT, season, week, options)

export const getSoccerLeastBusyDay = (season: number, week: number) =>
  _getLeastBusyDay(SPORT, season, week)

export const getSoccerMostBusyDay = (season: number, week: number) =>
  _getMostBusyDay(SPORT, season, week)

export const getSoccerBalancedScoringDays = (season: number, week: number, count: number) =>
  _getBalancedScoringDays(SPORT, season, week, count)

export const getSoccerWeekGameCounts = (season: number, week: number) =>
  _getWeekGameCounts(SPORT, season, week)

export const getSoccerSeasonVolumeProfiles = (season: number, startWeek: number, endWeek: number) =>
  _getSeasonVolumeProfiles(SPORT, season, startWeek, endWeek)

export async function resolveSoccerFantasyWeek(options: {
  leagueId: string
  leagueFormatId: LeagueFormatId
  leagueVariant?: string | null
  season: number
  week: number
  context?: Record<string, unknown>
}): Promise<FantasyWeekPlan> {
  return _resolveFantasyWeek({ ...options, sport: SPORT })
}
