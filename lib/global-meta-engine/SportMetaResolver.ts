/**
 * SportMetaResolver – resolves sport context for meta aggregation.
 * Ensures football/basketball/soccer/NCAA data are not mixed; supports cross-sport rollups when requested.
 */
import type { GlobalMetaSport } from './types'
import { GLOBAL_META_SPORTS } from './types'
import {
  DEFAULT_SPORT,
  isSupportedSport as isSupportedSportInScope,
  normalizeToSupportedSport,
} from '@/lib/sport-scope'

export const SUPPORTED_META_SPORTS: GlobalMetaSport[] = [...GLOBAL_META_SPORTS]

export function isSupportedSport(sport: string): sport is GlobalMetaSport {
  return isSupportedSportInScope(sport)
}

export function normalizeSportForMeta(sport: string | null | undefined): string {
  if (!sport) return DEFAULT_SPORT
  return normalizeToSupportedSport(sport)
}

/** Sport grouping for cross-sport dashboards: pro football, pro basketball, etc. */
export const SPORT_GROUP_LABELS: Record<string, string> = {
  NFL: 'Pro Football',
  NBA: 'Pro Basketball',
  NHL: 'Pro Hockey',
  MLB: 'Baseball',
  NCAAF: 'College Football',
  NCAAB: 'College Basketball',
  SOCCER: 'Soccer',
}

export function getSportGroupLabel(sport: string): string {
  return SPORT_GROUP_LABELS[sport] ?? sport
}

/** Whether to isolate this sport in meta (no cross-sport mixing). */
export function shouldIsolateSport(sport: string): boolean {
  return true // always isolate by sport for correct meta
}
