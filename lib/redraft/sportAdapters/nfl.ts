import type { ParsedStats, SportAdapter } from './types'
import { NFL_CONFIG } from '@/lib/sportConfig/configs/nfl'

/** Canonical scoring stat keys from centralized `SportConfig` (subset may be used per league). */
export const NFL_SCORING_CATEGORY_KEYS = NFL_CONFIG.scoringCategories.map((c) => c.key)

export const nflAdapter: SportAdapter = {
  parseRawStats(apiStats: Record<string, number>): ParsedStats {
    return {
      pass_yds: apiStats.pass_yds ?? 0,
      pass_td: apiStats.pass_td ?? 0,
      pass_int: apiStats.pass_int ?? 0,
      rush_yds: apiStats.rush_yds ?? 0,
      rush_td: apiStats.rush_td ?? 0,
      rec: apiStats.rec ?? 0,
      rec_yds: apiStats.rec_yds ?? 0,
      rec_td: apiStats.rec_td ?? 0,
      fum_lost: apiStats.fum_lost ?? 0,
    }
  },
  getLineupLockTime(_sport: string, gameTimeIso: string): Date {
    return new Date(gameTimeIso)
  },
}

export function getByeWeek(_playerId: string): number | null {
  return null
}

export function getInjuryStatus(_player: { injuryStatus?: string | null }): string | null {
  return _player.injuryStatus ?? null
}

export function getDefenseRank(_teamAbbr: string, _position: string): number {
  void _teamAbbr
  void _position
  return 16
}
