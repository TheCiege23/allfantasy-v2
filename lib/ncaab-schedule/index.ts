/**
 * [NEW] lib/ncaab-schedule/index.ts
 * NCAAB-specific schedule utilities. Thin wrapper over the sport-agnostic fantasy-schedule module.
 *
 * NCAAB has unique scheduling characteristics:
 * - Very high game volume (350+ D1 teams)
 * - Non-conference season (Nov-Dec): holiday tournaments, invitationals
 * - Conference play (Jan-Mar): structured round-robin within conferences
 * - Conference tournaments (early March): one per conference
 * - Selection Sunday (mid-March)
 * - NCAA Tournament / March Madness (mid-March through early April)
 * - Final Four + Championship (first weekend of April)
 * - Games spread across all days but heaviest Tue/Wed/Sat
 * - Bracket mode support for March Madness-style fantasy
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

const SPORT = 'NCAAB' as const

/** NCAAB-specific calendar metadata. */
export const NCAAB_CALENDAR = {
  seasonStart: { month: 11 },           // Early November
  nonConferenceEnd: { month: 12 },      // Late December
  conferencePlayStart: { month: 1 },    // Early January
  conferencePlayEnd: { month: 3 },      // Early March
  conferenceTournaments: { typical: 'First two weeks of March' },
  selectionSunday: { typical: 'Second Sunday of March' },
  ncaaTournamentStart: { typical: 'Tuesday/Wednesday after Selection Sunday (First Four)' },
  ncaaTournamentEnd: { typical: 'First Monday of April (Championship)' },
  specialPeriods: {
    nonConferenceSeason: { months: '11-12', description: 'Holiday tournaments, invitationals, non-conference matchups' },
    holidayTournaments: { typical: 'Thanksgiving week (Maui, Battle 4 Atlantis, etc.)', description: '8-16 team tournaments over 3 days' },
    conferenceSeason: { months: '1-3', description: 'Conference round-robin play' },
    rivalryGames: { typical: 'Various — Duke-UNC, UK-Louisville, etc.' },
    conferenceTournaments: { typical: 'Early March, one per conference (32 conferences)' },
    selectionSunday: { typical: 'Mid-March — bracket reveal' },
    firstFour: { typical: 'Tuesday/Wednesday after Selection Sunday' },
    firstRound: { typical: 'Thursday/Friday — 32 games over 2 days' },
    secondRound: { typical: 'Saturday/Sunday — 16 games over 2 days' },
    sweetSixteen: { typical: 'Thursday/Friday of following week' },
    eliteEight: { typical: 'Saturday/Sunday' },
    finalFour: { typical: 'First Saturday of April' },
    championship: { typical: 'First Monday of April' },
  },
  fantasyRegularSeasonWeeks: 18,
  fantasyPlayoffWeeks: 4,
  /** NCAAB game distribution. */
  gameDistribution: {
    tuesday: 'Heavy conference play (20-40 games)',
    wednesday: 'Heavy conference play (20-40 games)',
    thursday: 'Moderate (10-20 games)',
    friday: 'Light (5-15 games)',
    saturday: 'Heavy (30-60+ games)',
    sunday: 'Light-moderate (5-15 games)',
    monday: 'Light (5-10 games)',
  },
  /** Commissioner toggles for postseason inclusion. */
  postseasonInclusion: {
    conferenceTournaments: { default: false, description: 'Include conference tournament games' },
    ncaaTournament: { default: false, description: 'Include NCAA Tournament (March Madness) games' },
    postseasonAll: { default: false, description: 'Include all postseason (NIT, CBI, etc.)' },
  },
  /** Bracket mode for March Madness fantasy. */
  bracketMode: {
    supported: true,
    description: 'Special bracket-based scoring during NCAA Tournament',
  },
}

// NCAAB-typed convenience functions
export const getNcaabWeekVolumeProfile = (season: number, week: number, options?: { thresholdHeavy?: number; thresholdModerate?: number }) =>
  _getWeekVolumeProfile(SPORT, season, week, options)

export const getNcaabLeastBusyDay = (season: number, week: number) =>
  _getLeastBusyDay(SPORT, season, week)

export const getNcaabMostBusyDay = (season: number, week: number) =>
  _getMostBusyDay(SPORT, season, week)

export const getNcaabBalancedScoringDays = (season: number, week: number, count: number) =>
  _getBalancedScoringDays(SPORT, season, week, count)

export const getNcaabWeekGameCounts = (season: number, week: number) =>
  _getWeekGameCounts(SPORT, season, week)

export const getNcaabSeasonVolumeProfiles = (season: number, startWeek: number, endWeek: number) =>
  _getSeasonVolumeProfiles(SPORT, season, startWeek, endWeek)

export async function resolveNcaabFantasyWeek(options: {
  leagueId: string
  leagueFormatId: LeagueFormatId
  leagueVariant?: string | null
  season: number
  week: number
  context?: Record<string, unknown>
}): Promise<FantasyWeekPlan> {
  return _resolveFantasyWeek({ ...options, sport: SPORT })
}
