/**
 * Standard default sport configuration layer.
 * Resolves for each league/sport: default_scoring_profile, default_roster_template,
 * default_schedule_template, default_season_calendar. Used by league creation and settings resolution.
 */
import type { LeagueSport } from '@prisma/client'
import { loadLeagueCreationDefaults } from './LeagueCreationDefaultsLoader'

export interface StandardSportDefaults {
  sport: LeagueSport
  default_scoring_profile: {
    templateId: string
    name: string
    formatType: string
  }
  default_roster_template: {
    templateId: string
    name: string
    formatType: string
  }
  default_schedule_template: {
    templateId: string
    name: string
    formatType: string
  }
  default_season_calendar: {
    calendarId: string
    name: string
    formatType: string
  }
}

/**
 * Resolve standard default scoring profile, roster template, schedule template, and season calendar for a sport.
 * Uses the sport's default format (e.g. NFL standard, NBA points). Pass variant for IDP/devy etc.
 */
export async function getStandardSportDefaults(
  sport: LeagueSport | string,
  variant?: string | null
): Promise<StandardSportDefaults> {
  const leagueSport = (typeof sport === 'string' ? sport : sport) as LeagueSport
  const payload = await loadLeagueCreationDefaults(leagueSport, variant ?? undefined)
  return {
    sport: payload.sport,
    default_scoring_profile: {
      templateId: payload.scoringTemplate.templateId,
      name: payload.scoringTemplate.name,
      formatType: payload.scoringTemplate.formatType,
    },
    default_roster_template: {
      templateId: payload.rosterTemplate.templateId,
      name: payload.rosterTemplate.name,
      formatType: payload.rosterTemplate.formatType,
    },
    default_schedule_template: {
      templateId: payload.scheduleTemplate!.templateId,
      name: payload.scheduleTemplate!.name,
      formatType: payload.scheduleTemplate!.formatType,
    },
    default_season_calendar: {
      calendarId: payload.seasonCalendar!.calendarId,
      name: payload.seasonCalendar!.name,
      formatType: payload.seasonCalendar!.formatType,
    },
  }
}
