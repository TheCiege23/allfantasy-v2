/**
 * Multi-sport schedule resolver: sport-aware schedule and week/round semantics.
 * Placeholder for future GameSchedule ingestion; NFL week logic remains in existing engines.
 */
import type { LeagueSport } from '@prisma/client'
import { leagueSportToSportType } from './SportConfigResolver'
import type { SportType } from './sport-types'

export interface ScheduleContext {
  sportType: SportType
  season: number
  currentWeekOrRound: number
  totalWeeksOrRounds: number
  label: 'week' | 'round'
}

const DEFAULT_WEEKS: Record<SportType, number> = {
  NFL: 18,
  NCAAF: 15,
  NBA: 24,
  NCAAB: 18,
  MLB: 26,
  NHL: 25,
  SOCCER: 38,
}

/**
 * Resolve schedule context for a league (current week/round, total, label).
 * NFL/NCAAF use "week"; others use "round" or matchup period.
 */
export function resolveScheduleContext(
  leagueSport: LeagueSport,
  season: number,
  currentWeekOrRound: number
): ScheduleContext {
  const sportType = leagueSportToSportType(leagueSport)
  const total = DEFAULT_WEEKS[sportType] ?? 17
  const label = sportType === 'NFL' || sportType === 'NCAAF' ? 'week' : 'round'
  return {
    sportType,
    season,
    currentWeekOrRound,
    totalWeeksOrRounds: total,
    label,
  }
}
