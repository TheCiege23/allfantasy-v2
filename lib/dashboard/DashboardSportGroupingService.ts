/**
 * DashboardSportGroupingService — groups leagues by sport for dashboard display.
 * Returns ordered groups with label and emoji for section headers.
 */
import {
  getSportLabel,
  getSportEmoji,
  getDashboardSportOrder,
} from '@/lib/multi-sport/SportSelectorUIService'
import { toSportType } from '@/lib/multi-sport/sport-types'

export interface LeagueForGrouping {
  id: string
  name?: string | null
  sport?: string | null
  platform?: string
  platformLeagueId?: string
  leagueSize?: number | null
  scoring?: string | null
  isDynasty?: boolean | null
  syncStatus?: string | null
  syncError?: string | null
  lastSyncedAt?: string | null
}

export interface SportGroup {
  sport: string
  label: string
  emoji: string
  leagues: LeagueForGrouping[]
}

/**
 * Group leagues by sport and return sections in display order.
 * Leagues without sport default to NFL.
 */
export function groupLeaguesBySport(leagues: LeagueForGrouping[]): SportGroup[] {
  const bySport = new Map<string, LeagueForGrouping[]>()
  for (const lg of leagues) {
    const sport = lg.sport ? toSportType(String(lg.sport)) : 'NFL'
    if (!bySport.has(sport)) bySport.set(sport, [])
    bySport.get(sport)!.push(lg)
  }
  const order = getDashboardSportOrder()
  const result: SportGroup[] = []
  for (const sport of order) {
    const list = bySport.get(sport)
    if (list?.length) {
      result.push({
        sport,
        label: getSportLabel(sport),
        emoji: getSportEmoji(sport),
        leagues: list,
      })
    }
  }
  // Any sport not in order (e.g. future sports) append at end
  for (const [sport, list] of bySport) {
    if (!order.includes(sport as any)) {
      result.push({
        sport,
        label: getSportLabel(sport),
        emoji: getSportEmoji(sport),
        leagues: list,
      })
    }
  }
  return result
}
