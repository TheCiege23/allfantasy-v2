/**
 * [NEW] Guillotine schedule adapter.
 * Elimination (chop) on least-busy day. Admin (waiver processing) day after chop.
 * All game days are scoring days.
 */

import type { LeagueScheduleAdapter, FantasyWeekPlan, WeekVolumeProfile, NbaScheduleConfig, FantasyDayEvent } from '../types'

export class GuillotineScheduleAdapter implements LeagueScheduleAdapter {
  resolveFantasyWeek(
    volumeProfile: WeekVolumeProfile,
    config: NbaScheduleConfig
  ): FantasyWeekPlan {
    const gameDays = volumeProfile.days.filter((d) => d.gameCount > 0)
    const scoringDays = gameDays.map((d) => d.date)
    const events: FantasyDayEvent[] = scoringDays.map((date) => ({
      date,
      role: 'scoring' as const,
      label: 'Scoring',
    }))

    // Elimination day: least-busy game day, or commissioner override
    let eliminationDay: string | null = null
    if (config.eliminationDayOverride != null) {
      const overrideDay = volumeProfile.days.find((d) => d.dayOfWeek === config.eliminationDayOverride)
      eliminationDay = overrideDay?.date ?? null
    }
    if (!eliminationDay && config.useDynamicLowVolumeDays && volumeProfile.leastBusyDay) {
      eliminationDay = volumeProfile.leastBusyDay.date
    }

    if (eliminationDay) {
      events.push({
        date: eliminationDay,
        role: 'elimination',
        label: 'Elimination — lowest scorer chopped',
        description: 'Rosters unlock after chop. Waiver claims open.',
        automationAction: 'guillotine_chop',
      })
    }

    // Admin day: day after elimination for waiver processing
    let adminDay: string | null = null
    if (eliminationDay) {
      const elimIdx = volumeProfile.days.findIndex((d) => d.date === eliminationDay)
      if (elimIdx >= 0 && elimIdx + 1 < volumeProfile.days.length) {
        adminDay = volumeProfile.days[elimIdx + 1]!.date
        events.push({
          date: adminDay,
          role: 'admin',
          label: 'Waiver processing',
          description: 'Claims and FAAB bids processed after elimination.',
          automationAction: 'guillotine_waiver_run',
        })
      }
    }

    return {
      season: volumeProfile.season,
      week: volumeProfile.week,
      scoringDays,
      ceremonyDay: null,
      adminDay,
      transitionDay: null,
      eliminationDay,
      statusUpdateDay: null,
      events,
      nonScoringDays: volumeProfile.days.filter((d) => d.gameCount === 0).map((d) => d.date),
      volumeProfile,
    }
  }
}
