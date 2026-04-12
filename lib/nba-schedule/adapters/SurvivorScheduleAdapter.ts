/**
 * [NEW] Survivor schedule adapter.
 * Ceremony/tribal on least-busy day. Scoring on balanced game days.
 * Immunity challenge day before tribal.
 */

import type { LeagueScheduleAdapter, FantasyWeekPlan, WeekVolumeProfile, NbaScheduleConfig, FantasyDayEvent } from '../types'

export class SurvivorScheduleAdapter implements LeagueScheduleAdapter {
  resolveFantasyWeek(
    volumeProfile: WeekVolumeProfile,
    config: NbaScheduleConfig
  ): FantasyWeekPlan {
    const gameDays = volumeProfile.days.filter((d) => d.gameCount > 0)
    const events: FantasyDayEvent[] = []

    // Ceremony day: least-busy day (tribal council / elimination voting)
    let ceremonyDay: string | null = null
    if (config.ceremonyDayOverride != null) {
      const overrideDay = volumeProfile.days.find((d) => d.dayOfWeek === config.ceremonyDayOverride)
      ceremonyDay = overrideDay?.date ?? null
    }
    if (!ceremonyDay && config.useDynamicLowVolumeDays && volumeProfile.leastBusyDay) {
      ceremonyDay = volumeProfile.leastBusyDay.date
    }

    if (ceremonyDay) {
      events.push({
        date: ceremonyDay,
        role: 'ceremony',
        label: 'Tribal council',
        description: 'Immunity results, voting, and elimination.',
        automationAction: 'survivor_tribal',
      })

      // Immunity challenge: day before tribal (if exists in the week)
      const ceremonyIdx = volumeProfile.days.findIndex((d) => d.date === ceremonyDay)
      if (ceremonyIdx > 0) {
        const immunityDay = volumeProfile.days[ceremonyIdx - 1]!
        events.push({
          date: immunityDay.date,
          role: 'scoring',
          label: 'Immunity challenge',
          description: 'Fantasy scoring determines immunity winner.',
        })
      }
    }

    // Scoring days: balanced selection or all game days
    let scoringDays: string[]
    if (config.balancedScoringDayCount > 0 && config.balancedScoringDayCount < gameDays.length) {
      // Select balanced days, excluding ceremony day
      const avg = volumeProfile.averageGamesPerDay
      const candidates = gameDays.filter((d) => d.date !== ceremonyDay)
      candidates.sort((a, b) => Math.abs(a.gameCount - avg) - Math.abs(b.gameCount - avg))
      scoringDays = candidates
        .slice(0, config.balancedScoringDayCount)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => d.date)
    } else {
      scoringDays = gameDays.map((d) => d.date)
    }

    // Add scoring events
    for (const date of scoringDays) {
      if (!events.some((e) => e.date === date)) {
        events.push({ date, role: 'scoring', label: 'Scoring' })
      }
    }

    // Non-scoring: off days + ceremony day if not in scoring
    const nonScoringDays = volumeProfile.days
      .filter((d) => d.gameCount === 0 || (d.date === ceremonyDay && !scoringDays.includes(d.date)))
      .map((d) => d.date)

    return {
      season: volumeProfile.season,
      week: volumeProfile.week,
      scoringDays,
      ceremonyDay,
      adminDay: null,
      transitionDay: null,
      eliminationDay: null,
      statusUpdateDay: null,
      events: events.sort((a, b) => a.date.localeCompare(b.date)),
      nonScoringDays,
      volumeProfile,
    }
  }
}
