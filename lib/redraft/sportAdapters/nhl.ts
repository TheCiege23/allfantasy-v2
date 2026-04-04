import type { ParsedStats, SportAdapter } from './types'
import { NHL_CONFIG } from '@/lib/sportConfig/configs/nhl'

export const NHL_SCORING_CATEGORY_KEYS = NHL_CONFIG.scoringCategories.map((c) => c.key)

export const nhlAdapter: SportAdapter = {
  parseRawStats(raw: Record<string, number>): ParsedStats {
    return {
      g: raw.g ?? 0,
      a: raw.a ?? 0,
      ppp: raw.ppp ?? 0,
      sog: raw.sog ?? 0,
      hits: raw.hits ?? 0,
      blks: raw.blks ?? 0,
    }
  },
  getLineupLockTime(_sport: string, gameTimeIso: string): Date {
    return new Date(gameTimeIso)
  },
}

export function getPowerPlayTime(_playerId: string): number {
  void _playerId
  return 0
}
