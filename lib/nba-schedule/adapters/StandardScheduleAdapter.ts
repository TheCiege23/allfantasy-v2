/**
 * [NEW] Standard schedule adapter for redraft, dynasty, keeper, best ball, salary cap.
 * All game days are scoring days. No ceremony/admin/transition days.
 */

import type { LeagueScheduleAdapter, FantasyWeekPlan, WeekVolumeProfile, NbaScheduleConfig } from '../types'

export class StandardScheduleAdapter implements LeagueScheduleAdapter {
  resolveFantasyWeek(
    volumeProfile: WeekVolumeProfile,
    config: NbaScheduleConfig
  ): FantasyWeekPlan {
    const scoringDays = volumeProfile.days
      .filter((d) => d.gameCount > 0)
      .map((d) => d.date)

    return {
      season: volumeProfile.season,
      week: volumeProfile.week,
      scoringDays,
      ceremonyDay: null,
      adminDay: null,
      transitionDay: null,
      eliminationDay: null,
      statusUpdateDay: null,
      events: scoringDays.map((date) => ({
        date,
        role: 'scoring' as const,
        label: 'Scoring',
      })),
      nonScoringDays: volumeProfile.days
        .filter((d) => d.gameCount === 0)
        .map((d) => d.date),
      volumeProfile,
    }
  }
}
