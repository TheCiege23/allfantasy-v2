import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export type GuillotineSportProfile = {
  scoringPeriod: 'weekly'
  eliminationTiming: string
  correctionWindowHours: number
  minTeams: number
  maxTeams: number
  recommendedLeagueSize: number
  rosterSize: number
  notes?: string
}

const BASE: Record<LeagueSport, GuillotineSportProfile> = {
  NFL: {
    scoringPeriod: 'weekly',
    eliminationTiming: 'tuesday_7am',
    correctionWindowHours: 72,
    minTeams: 8,
    maxTeams: 20,
    recommendedLeagueSize: 12,
    rosterSize: 15,
    notes: 'byeWeekRisk: high',
  },
  NBA: {
    scoringPeriod: 'weekly',
    eliminationTiming: 'monday_8am',
    correctionWindowHours: 48,
    minTeams: 8,
    maxTeams: 16,
    recommendedLeagueSize: 10,
    rosterSize: 13,
    notes: 'loadManagementRisk: high',
  },
  MLB: {
    scoringPeriod: 'weekly',
    eliminationTiming: 'sunday_11pm',
    correctionWindowHours: 48,
    minTeams: 8,
    maxTeams: 16,
    recommendedLeagueSize: 12,
    rosterSize: 23,
    notes: 'pitcherStartVariance: high',
  },
  NHL: {
    scoringPeriod: 'weekly',
    eliminationTiming: 'monday_8am',
    correctionWindowHours: 48,
    minTeams: 8,
    maxTeams: 14,
    recommendedLeagueSize: 12,
    rosterSize: 16,
  },
  NCAAF: {
    scoringPeriod: 'weekly',
    eliminationTiming: 'tuesday_9am',
    correctionWindowHours: 72,
    minTeams: 8,
    maxTeams: 16,
    recommendedLeagueSize: 12,
    rosterSize: 14,
    notes: 'scheduleVariance: very_high',
  },
  NCAAB: {
    scoringPeriod: 'weekly',
    eliminationTiming: 'monday_8am',
    correctionWindowHours: 48,
    minTeams: 6,
    maxTeams: 14,
    recommendedLeagueSize: 10,
    rosterSize: 10,
  },
  SOCCER: {
    scoringPeriod: 'weekly',
    eliminationTiming: 'tuesday_10am',
    correctionWindowHours: 72,
    minTeams: 6,
    maxTeams: 14,
    recommendedLeagueSize: 10,
    rosterSize: 15,
    notes: 'lowScoringEnvironment, formationRequired',
  },
}

export const GUILLOTINE_SPORT_CONFIG: Record<string, GuillotineSportProfile> = Object.fromEntries(
  SUPPORTED_SPORTS.map((s) => [s, BASE[s]]),
)

export function getGuillotineSportConfig(sport: string): GuillotineSportProfile | undefined {
  return GUILLOTINE_SPORT_CONFIG[sport.toUpperCase()]
}
