import type { ParsedStats, SportAdapter } from './types'
import { NCAAF_CONFIG } from '@/lib/sportConfig/configs/ncaaf'

export const NCAAF_SCORING_CATEGORY_KEYS = NCAAF_CONFIG.scoringCategories.map((c) => c.key)

export const ncaafAdapter: SportAdapter = {
  parseRawStats(raw: Record<string, number>): ParsedStats {
    return {
      pass_yds: raw.pass_yds ?? 0,
      pass_td: raw.pass_td ?? 0,
      pass_int: raw.pass_int ?? 0,
      rush_yds: raw.rush_yds ?? 0,
      rush_td: raw.rush_td ?? 0,
      rec: raw.rec ?? 0,
      rec_yds: raw.rec_yds ?? 0,
      rec_td: raw.rec_td ?? 0,
      fum_lost: raw.fum_lost ?? 0,
    }
  },
  getLineupLockTime(_sport: string, gameTimeIso: string): Date {
    return new Date(gameTimeIso)
  },
}
