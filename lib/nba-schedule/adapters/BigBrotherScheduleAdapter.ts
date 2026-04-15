/**
 * [NEW] Big Brother schedule adapter.
 * Maps BB phase windows (HOH, nomination, veto, voting, eviction) to NBA game volume.
 * BB already has explicit day-of-week config — this adapter provides "recommended" days
 * based on game volume, which commissioners can adopt or ignore.
 */

import type { LeagueScheduleAdapter, FantasyWeekPlan, WeekVolumeProfile, NbaScheduleConfig, FantasyDayEvent } from '../types'

export class BigBrotherScheduleAdapter implements LeagueScheduleAdapter {
  resolveFantasyWeek(
    volumeProfile: WeekVolumeProfile,
    config: NbaScheduleConfig,
    context?: Record<string, unknown>
  ): FantasyWeekPlan {
    const gameDays = volumeProfile.days.filter((d) => d.gameCount > 0)
    const scoringDays = gameDays.map((d) => d.date)
    const events: FantasyDayEvent[] = []

    // Sort days by volume ascending for event assignment
    const sortedByVolume = [...volumeProfile.days].filter((d) => d.gameCount >= 0).sort((a, b) => a.gameCount - b.gameCount)

    // Assign BB phases to days based on volume:
    // Least busy day(s) → ceremony events (nomination, veto, eviction)
    // Busiest days → HOH scoring window
    const lightDays = sortedByVolume.filter((d) => d.classification === 'light' || d.classification === 'off')
    const heavyDays = sortedByVolume.filter((d) => d.classification === 'heavy' || d.classification === 'moderate')

    // HOH scoring window: heaviest game days
    const hohDays = heavyDays.slice(0, 2)
    for (const d of hohDays) {
      events.push({
        date: d.date,
        role: 'scoring',
        label: 'HOH scoring window',
        description: 'Fantasy points from these days determine Head of Household.',
      })
    }

    // Ceremony events on light/off days
    if (lightDays.length >= 3) {
      events.push({
        date: lightDays[0]!.date,
        role: 'ceremony',
        label: 'Nomination ceremony',
        description: 'HOH nominates two houseguests.',
        automationAction: 'bb_nomination',
      })
      events.push({
        date: lightDays[1]!.date,
        role: 'ceremony',
        label: 'Veto ceremony',
        description: 'Veto winner decides whether to save a nominee.',
        automationAction: 'bb_veto',
      })
      events.push({
        date: lightDays[2]!.date,
        role: 'ceremony',
        label: 'Eviction',
        description: 'House votes. One houseguest is evicted.',
        automationAction: 'bb_eviction',
      })
    } else if (lightDays.length > 0) {
      // Fewer light days: compress ceremonies
      events.push({
        date: lightDays[0]!.date,
        role: 'ceremony',
        label: 'BB ceremony day',
        description: 'Nomination, veto, and eviction ceremonies.',
        automationAction: 'bb_ceremony_compressed',
      })
    }

    // Remaining game days are general scoring
    for (const d of gameDays) {
      if (!events.some((e) => e.date === d.date)) {
        events.push({ date: d.date, role: 'scoring', label: 'Scoring' })
      }
    }

    const ceremonyDay = lightDays[0]?.date ?? null

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
      nonScoringDays: volumeProfile.days.filter((d) => d.gameCount === 0).map((d) => d.date),
      volumeProfile,
    }
  }
}
