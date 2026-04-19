import type { SupportedSport } from '@/lib/sport-scope'

/**
 * Coarse signal for AI: whether "live" fantasy window (scores/injuries) is typically active.
 * Does not replace sport-specific schedules — hint only.
 */
export function describeSportWindowStatus(args: {
  sport: SupportedSport | string
  userLocalHour: number
  userLocalDayOfWeek: number
}): { likelyActive: boolean; note: string } {
  const sport = String(args.sport).toUpperCase()
  const h = args.userLocalHour
  const d = args.userLocalDayOfWeek

  if (sport === 'NFL') {
    const weekendish = d === 0 || d === 4 || d === 5 || d === 6
    const primetime = h >= 18 || h <= 3
    const likely = weekendish && primetime
    return {
      likelyActive: likely,
      note: likely
        ? 'NFL: prime live window likely (Thu/Sun/Mon night — verify kickoff list).'
        : 'NFL: outside typical prime scoring window — injury/news still relevant.',
    }
  }

  if (sport === 'NBA' || sport === 'NHL' || sport === 'MLB') {
    const evening = h >= 16 || h <= 1
    return {
      likelyActive: evening,
      note: `${sport}: evening slate often active — confirm game schedule in user timezone.`,
    }
  }

  return {
    likelyActive: true,
    note: `${sport}: treat data freshness timestamps as authoritative for recency.`,
  }
}
