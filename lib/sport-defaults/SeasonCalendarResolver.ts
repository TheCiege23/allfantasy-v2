/**
 * Resolves real-world season calendar by sport (preseason, regular season, playoffs).
 * PROMPT 3/4: separate from fantasy schedule structure.
 */
import { prisma } from '@/lib/prisma'
import type { SportType } from './types'
import { toSportType } from './sport-type-utils'

export interface SeasonCalendarPeriod {
  monthStart?: number
  monthEnd?: number
  label?: string
}

export interface SeasonCalendarDto {
  calendarId: string
  sportType: SportType
  name: string
  formatType: string
  preseasonPeriod: SeasonCalendarPeriod | null
  regularSeasonPeriod: SeasonCalendarPeriod
  playoffsPeriod: SeasonCalendarPeriod | null
  championshipPeriod: SeasonCalendarPeriod | null
  internationalBreaksSupported: boolean
}

const IN_MEMORY_CALENDARS: Record<SportType, Omit<SeasonCalendarDto, 'calendarId'>> = {
  NFL: {
    sportType: 'NFL',
    name: 'NFL_SEASON',
    formatType: 'DEFAULT',
    preseasonPeriod: { monthStart: 8, monthEnd: 8, label: 'August' },
    regularSeasonPeriod: { monthStart: 9, monthEnd: 1, label: 'September – January' },
    playoffsPeriod: null,
    championshipPeriod: { monthStart: 2, monthEnd: 2, label: 'Super Bowl (February)' },
    internationalBreaksSupported: false,
  },
  MLB: {
    sportType: 'MLB',
    name: 'MLB_SEASON',
    formatType: 'DEFAULT',
    preseasonPeriod: { monthStart: 3, monthEnd: 3, label: 'Spring training (March)' },
    regularSeasonPeriod: { monthStart: 4, monthEnd: 10, label: 'April – October' },
    playoffsPeriod: { monthStart: 10, monthEnd: 10, label: 'October' },
    championshipPeriod: { monthStart: 10, monthEnd: 10, label: 'World Series (late October)' },
    internationalBreaksSupported: false,
  },
  NHL: {
    sportType: 'NHL',
    name: 'NHL_SEASON',
    formatType: 'DEFAULT',
    preseasonPeriod: null,
    regularSeasonPeriod: { monthStart: 10, monthEnd: 4, label: 'October – April' },
    playoffsPeriod: { monthStart: 4, monthEnd: 6, label: 'April – June' },
    championshipPeriod: null,
    internationalBreaksSupported: false,
  },
  NBA: {
    sportType: 'NBA',
    name: 'NBA_SEASON',
    formatType: 'DEFAULT',
    preseasonPeriod: null,
    regularSeasonPeriod: { monthStart: 10, monthEnd: 4, label: 'October – April' },
    playoffsPeriod: { monthStart: 4, monthEnd: 6, label: 'April – June' },
    championshipPeriod: null,
    internationalBreaksSupported: false,
  },
  SOCCER: {
    sportType: 'SOCCER',
    name: 'SOCCER_SEASON',
    formatType: 'DEFAULT',
    preseasonPeriod: null,
    regularSeasonPeriod: { monthStart: 8, monthEnd: 5, label: 'August – May' },
    playoffsPeriod: null,
    championshipPeriod: null,
    internationalBreaksSupported: true,
  },
  NCAAB: {
    sportType: 'NCAAB',
    name: 'NCAAB_SEASON',
    formatType: 'DEFAULT',
    preseasonPeriod: null,
    regularSeasonPeriod: { monthStart: 11, monthEnd: 3, label: 'November – March' },
    playoffsPeriod: { monthStart: 3, monthEnd: 4, label: 'March Madness (March – April)' },
    championshipPeriod: null,
    internationalBreaksSupported: false,
  },
  NCAAF: {
    sportType: 'NCAAF',
    name: 'NCAAF_SEASON',
    formatType: 'DEFAULT',
    preseasonPeriod: null,
    regularSeasonPeriod: { monthStart: 8, monthEnd: 1, label: 'August/September – January' },
    playoffsPeriod: { monthStart: 12, monthEnd: 1, label: 'Bowl season (December – January)' },
    championshipPeriod: null,
    internationalBreaksSupported: false,
  },
}

export async function getSeasonCalendar(
  sportType: SportType | string,
  formatType: string = 'DEFAULT'
): Promise<SeasonCalendarDto> {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType) as SportType
  const row = await prisma.seasonCalendar.findUnique({
    where: { uniq_season_calendar_sport_format: { sportType: sport, formatType } },
  })
  if (row) {
    return {
      calendarId: row.id,
      sportType: sport,
      name: row.name,
      formatType: row.formatType,
      preseasonPeriod: row.preseasonPeriod as SeasonCalendarPeriod | null,
      regularSeasonPeriod: row.regularSeasonPeriod as SeasonCalendarPeriod,
      playoffsPeriod: row.playoffsPeriod as SeasonCalendarPeriod | null,
      championshipPeriod: row.championshipPeriod as SeasonCalendarPeriod | null,
      internationalBreaksSupported: row.internationalBreaksSupported,
    }
  }
  const fallback = IN_MEMORY_CALENDARS[sport] ?? IN_MEMORY_CALENDARS.NFL
  return {
    calendarId: `in-memory-${sport}-${formatType}`,
    ...fallback,
    formatType,
  }
}
