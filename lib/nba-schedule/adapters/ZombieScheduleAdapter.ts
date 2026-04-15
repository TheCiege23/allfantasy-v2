/**
 * [NEW] Zombie schedule adapter.
 * CRITICAL: Zombie is infection-based, NOT elimination-based.
 * Status processing (infection, serum, weapon, ambush) on least-busy day.
 * All game days are scoring days. League size never shrinks.
 */

import type { LeagueScheduleAdapter, FantasyWeekPlan, WeekVolumeProfile, NbaScheduleConfig, FantasyDayEvent } from '../types'

export class ZombieScheduleAdapter implements LeagueScheduleAdapter {
  resolveFantasyWeek(
    volumeProfile: WeekVolumeProfile,
    config: NbaScheduleConfig,
    context?: Record<string, unknown>
  ): FantasyWeekPlan {
    const gameDays = volumeProfile.days.filter((d) => d.gameCount > 0)
    const scoringDays = gameDays.map((d) => d.date)
    const events: FantasyDayEvent[] = scoringDays.map((date) => ({
      date,
      role: 'scoring' as const,
      label: 'Scoring',
    }))

    // Status update day: least-busy day for infection/serum/weapon/ambush processing
    let statusUpdateDay: string | null = null
    if (config.adminDayOverride != null) {
      const overrideDay = volumeProfile.days.find((d) => d.dayOfWeek === config.adminDayOverride)
      statusUpdateDay = overrideDay?.date ?? null
    }
    if (!statusUpdateDay && config.useDynamicLowVolumeDays && volumeProfile.leastBusyDay) {
      statusUpdateDay = volumeProfile.leastBusyDay.date
    }

    if (statusUpdateDay) {
      events.push({
        date: statusUpdateDay,
        role: 'status_update',
        label: 'Status update',
        description: 'Infection spread, serum usage, weapon effects, ambush resolution, and team status changes processed.',
        automationAction: 'zombie_weekly_resolution',
      })
    }

    // Admin day: second-least-busy for universe updates / commissioner review
    let adminDay: string | null = null
    if (config.adminOnSecondLeastBusy && volumeProfile.secondLeastBusyDay) {
      adminDay = volumeProfile.secondLeastBusyDay.date
      if (adminDay !== statusUpdateDay) {
        events.push({
          date: adminDay,
          role: 'admin',
          label: 'Universe update',
          description: 'Zombie league status board refreshed. Whisperer actions posted.',
        })
      } else {
        adminDay = null // don't double-assign
      }
    }

    return {
      season: volumeProfile.season,
      week: volumeProfile.week,
      scoringDays,
      ceremonyDay: null,
      adminDay,
      transitionDay: null,
      eliminationDay: null,
      statusUpdateDay,
      events: events.sort((a, b) => a.date.localeCompare(b.date)),
      nonScoringDays: volumeProfile.days.filter((d) => d.gameCount === 0).map((d) => d.date),
      volumeProfile,
    }
  }
}
