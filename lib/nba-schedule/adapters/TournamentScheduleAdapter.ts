/**
 * [NEW] Tournament schedule adapter.
 * Supports non-scoring transition days between rounds for redraft/bracket reset.
 * Off days and light days used for transitions.
 */

import type { LeagueScheduleAdapter, FantasyWeekPlan, WeekVolumeProfile, NbaScheduleConfig, FantasyDayEvent } from '../types'

export class TournamentScheduleAdapter implements LeagueScheduleAdapter {
  resolveFantasyWeek(
    volumeProfile: WeekVolumeProfile,
    config: NbaScheduleConfig,
    context?: Record<string, unknown>
  ): FantasyWeekPlan {
    const gameDays = volumeProfile.days.filter((d) => d.gameCount > 0)
    const events: FantasyDayEvent[] = []

    // Check if this week is a transition week (between rounds)
    const isTransitionWeek = context?.isTransitionWeek === true
    const transitionDayCount = config.transitionDayCount || 1

    let transitionDay: string | null = null
    const scoringDays: string[] = []
    const nonScoringDays: string[] = []

    if (isTransitionWeek) {
      // Use lightest day(s) for transition; remaining game days still score
      const lightDays = [...volumeProfile.days]
        .filter((d) => d.classification === 'light' || d.classification === 'off')
        .slice(0, transitionDayCount)

      for (const d of lightDays) {
        nonScoringDays.push(d.date)
        events.push({
          date: d.date,
          role: 'transition',
          label: 'Round transition',
          description: 'Redraft/bracket reset window. NBA games do not count for fantasy.',
          automationAction: 'tournament_transition',
        })
      }
      transitionDay = lightDays[0]?.date ?? null

      // Remaining game days are scoring
      for (const d of gameDays) {
        if (!nonScoringDays.includes(d.date)) {
          scoringDays.push(d.date)
          events.push({ date: d.date, role: 'scoring', label: 'Scoring' })
        }
      }
    } else {
      // Normal scoring week — all game days count
      for (const d of gameDays) {
        scoringDays.push(d.date)
        events.push({ date: d.date, role: 'scoring', label: 'Scoring' })
      }
    }

    // Off days always non-scoring
    for (const d of volumeProfile.days) {
      if (d.gameCount === 0 && !nonScoringDays.includes(d.date)) {
        nonScoringDays.push(d.date)
      }
    }

    return {
      season: volumeProfile.season,
      week: volumeProfile.week,
      scoringDays,
      ceremonyDay: null,
      adminDay: null,
      transitionDay,
      eliminationDay: null,
      statusUpdateDay: null,
      events: events.sort((a, b) => a.date.localeCompare(b.date)),
      nonScoringDays,
      volumeProfile,
    }
  }
}
