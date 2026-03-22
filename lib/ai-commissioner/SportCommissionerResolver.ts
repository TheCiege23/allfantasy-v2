import {
  DEFAULT_SPORT,
  SUPPORTED_SPORTS,
  normalizeToSupportedSport,
  isSupportedSport,
  type SupportedSport,
} from '@/lib/sport-scope'
import type { LeagueSport } from '@prisma/client'

export type CommissionerSport = SupportedSport

export const COMMISSIONER_SUPPORTED_SPORTS = [...SUPPORTED_SPORTS]

export function normalizeSportForCommissioner(sport: string | null | undefined): CommissionerSport {
  return normalizeToSupportedSport(sport)
}

export function normalizeOptionalSportForCommissioner(
  sport: string | null | undefined
): CommissionerSport | null {
  if (!sport || !String(sport).trim()) return null
  return normalizeSportForCommissioner(sport)
}

export function isSupportedCommissionerSport(
  sport: string | null | undefined
): sport is CommissionerSport {
  return isSupportedSport(sport)
}

export function toLeagueSport(sport: string | null | undefined): LeagueSport {
  return normalizeSportForCommissioner(sport) as LeagueSport
}

export function getCommissionerSportLabel(sport: string | null | undefined): string {
  const resolved = sport ? normalizeSportForCommissioner(sport) : DEFAULT_SPORT
  if (resolved === 'NCAAB') return 'NCAA Basketball'
  if (resolved === 'NCAAF') return 'NCAA Football'
  if (resolved === 'SOCCER') return 'Soccer'
  return resolved
}

export function getSportGovernanceCadence(sport: string | null | undefined): {
  lineupLockReminderHours: number
  expectedPeriodCadenceDays: number
  regularSeasonPeriods: number
  playoffStartPeriod: number
  rosterTurnoverFactor: number
} {
  const resolved = normalizeSportForCommissioner(sport)
  switch (resolved) {
    case 'NFL':
      return {
        lineupLockReminderHours: 26,
        expectedPeriodCadenceDays: 7,
        regularSeasonPeriods: 14,
        playoffStartPeriod: 15,
        rosterTurnoverFactor: 1.0,
      }
    case 'NHL':
      return {
        lineupLockReminderHours: 18,
        expectedPeriodCadenceDays: 3,
        regularSeasonPeriods: 24,
        playoffStartPeriod: 25,
        rosterTurnoverFactor: 1.2,
      }
    case 'NBA':
      return {
        lineupLockReminderHours: 18,
        expectedPeriodCadenceDays: 3,
        regularSeasonPeriods: 22,
        playoffStartPeriod: 23,
        rosterTurnoverFactor: 1.25,
      }
    case 'MLB':
      return {
        lineupLockReminderHours: 16,
        expectedPeriodCadenceDays: 2,
        regularSeasonPeriods: 24,
        playoffStartPeriod: 25,
        rosterTurnoverFactor: 1.35,
      }
    case 'NCAAB':
      return {
        lineupLockReminderHours: 24,
        expectedPeriodCadenceDays: 6,
        regularSeasonPeriods: 18,
        playoffStartPeriod: 19,
        rosterTurnoverFactor: 1.1,
      }
    case 'NCAAF':
      return {
        lineupLockReminderHours: 28,
        expectedPeriodCadenceDays: 7,
        regularSeasonPeriods: 13,
        playoffStartPeriod: 14,
        rosterTurnoverFactor: 0.95,
      }
    case 'SOCCER':
      return {
        lineupLockReminderHours: 20,
        expectedPeriodCadenceDays: 4,
        regularSeasonPeriods: 30,
        playoffStartPeriod: 31,
        rosterTurnoverFactor: 0.9,
      }
  }
}
