/**
 * [NEW] lib/fantasy-schedule/types.ts
 * Sport-agnostic scheduling intelligence layer — shared types for NBA, NHL, and future sports.
 */

/** Supported sports for the scheduling intelligence layer. */
export type ScheduleSport = 'NBA' | 'NHL' | 'MLB' | 'NFL' | 'NCAAF' | 'NCAAB' | 'SOCCER'

/** Day volume classification based on game count. */
export type DayClassification = 'heavy' | 'moderate' | 'light' | 'off'

/** Role a fantasy day plays in a league's weekly cycle. */
export type FantasyDayRole =
  | 'scoring'
  | 'ceremony'
  | 'admin'
  | 'transition'
  | 'rest'
  | 'elimination'
  | 'status_update'

/** Volume profile for a single day within a fantasy week. */
export interface DayVolume {
  date: string
  dayOfWeek: number
  gameCount: number
  classification: DayClassification
  teams: string[]
}

/** Aggregate volume profile for a full fantasy week. */
export interface WeekVolumeProfile {
  sport: ScheduleSport
  season: number
  week: number
  days: DayVolume[]
  totalGames: number
  gamesPerDay: Record<string, number>
  leastBusyDay: DayVolume | null
  secondLeastBusyDay: DayVolume | null
  mostBusyDay: DayVolume | null
  averageGamesPerDay: number
}

/** A single event in the fantasy week plan. */
export interface FantasyDayEvent {
  date: string
  role: FantasyDayRole
  label: string
  description?: string
  automationAction?: string
}

/** Complete fantasy week plan for a league. */
export interface FantasyWeekPlan {
  sport: ScheduleSport
  season: number
  week: number
  scoringDays: string[]
  ceremonyDay: string | null
  adminDay: string | null
  transitionDay: string | null
  eliminationDay: string | null
  statusUpdateDay: string | null
  events: FantasyDayEvent[]
  nonScoringDays: string[]
  volumeProfile: WeekVolumeProfile
}

/** Per-league schedule configuration (stored in League.settings JSON). */
export interface SportScheduleConfig {
  sport: ScheduleSport
  useDynamicLowVolumeDays: boolean
  eliminationDayOverride: number | null
  ceremonyDayOverride: number | null
  adminDayOverride: number | null
  volumeThresholdHeavy: number
  volumeThresholdModerate: number
  adminOnSecondLeastBusy: boolean
  balancedScoringDayCount: number
  finalWeekCounts: boolean
  transitionDayCount: number
  separateSubtotalDisplay: boolean
}

/** Sport-specific default thresholds. */
export const SPORT_SCHEDULE_DEFAULTS: Record<ScheduleSport, Omit<SportScheduleConfig, 'sport'>> = {
  NBA: {
    useDynamicLowVolumeDays: true,
    eliminationDayOverride: null,
    ceremonyDayOverride: null,
    adminDayOverride: null,
    volumeThresholdHeavy: 9,
    volumeThresholdModerate: 5,
    adminOnSecondLeastBusy: true,
    balancedScoringDayCount: 0,
    finalWeekCounts: true,
    transitionDayCount: 1,
    separateSubtotalDisplay: false,
  },
  NHL: {
    useDynamicLowVolumeDays: true,
    eliminationDayOverride: null,
    ceremonyDayOverride: null,
    adminDayOverride: null,
    volumeThresholdHeavy: 8,       // NHL has fewer teams (32) so max ~16 games/day
    volumeThresholdModerate: 4,
    adminOnSecondLeastBusy: true,
    balancedScoringDayCount: 0,
    finalWeekCounts: true,
    transitionDayCount: 1,
    separateSubtotalDisplay: false,
  },
  MLB: {
    useDynamicLowVolumeDays: true,
    eliminationDayOverride: null,
    ceremonyDayOverride: null,
    adminDayOverride: null,
    volumeThresholdHeavy: 12,
    volumeThresholdModerate: 8,
    adminOnSecondLeastBusy: true,
    balancedScoringDayCount: 0,
    finalWeekCounts: true,
    transitionDayCount: 1,
    separateSubtotalDisplay: false,
  },
  NFL: {
    useDynamicLowVolumeDays: false,  // NFL has fixed game days (Thu/Sun/Mon)
    eliminationDayOverride: 2,       // Tuesday default for NFL processing
    ceremonyDayOverride: 2,
    adminDayOverride: 3,
    volumeThresholdHeavy: 10,
    volumeThresholdModerate: 3,
    adminOnSecondLeastBusy: false,
    balancedScoringDayCount: 0,
    finalWeekCounts: true,
    transitionDayCount: 1,
    separateSubtotalDisplay: false,
  },
  NCAAF: {
    useDynamicLowVolumeDays: false,
    eliminationDayOverride: null,
    ceremonyDayOverride: null,
    adminDayOverride: null,
    volumeThresholdHeavy: 30,
    volumeThresholdModerate: 10,
    adminOnSecondLeastBusy: true,
    balancedScoringDayCount: 0,
    finalWeekCounts: true,
    transitionDayCount: 1,
    separateSubtotalDisplay: false,
  },
  NCAAB: {
    useDynamicLowVolumeDays: true,
    eliminationDayOverride: null,
    ceremonyDayOverride: null,
    adminDayOverride: null,
    volumeThresholdHeavy: 40,
    volumeThresholdModerate: 15,
    adminOnSecondLeastBusy: true,
    balancedScoringDayCount: 0,
    finalWeekCounts: true,
    transitionDayCount: 1,
    separateSubtotalDisplay: false,
  },
  SOCCER: {
    useDynamicLowVolumeDays: false,
    eliminationDayOverride: null,
    ceremonyDayOverride: null,
    adminDayOverride: null,
    volumeThresholdHeavy: 8,
    volumeThresholdModerate: 4,
    adminOnSecondLeastBusy: true,
    balancedScoringDayCount: 0,
    finalWeekCounts: true,
    transitionDayCount: 1,
    separateSubtotalDisplay: false,
  },
}

/** Get default config for a sport. */
export function getDefaultScheduleConfig(sport: ScheduleSport): SportScheduleConfig {
  return { sport, ...(SPORT_SCHEDULE_DEFAULTS[sport] ?? SPORT_SCHEDULE_DEFAULTS.NBA) }
}

/** Interface for league-type-specific schedule adapters. */
export interface LeagueScheduleAdapter {
  resolveFantasyWeek(
    volumeProfile: WeekVolumeProfile,
    config: SportScheduleConfig,
    context?: Record<string, unknown>
  ): FantasyWeekPlan
}
