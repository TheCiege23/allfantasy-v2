import type { ParsedStats, SportAdapter } from './types'

export const mlbAdapter: SportAdapter = {
  parseRawStats(raw: Record<string, number>): ParsedStats {
    return {
      r: raw.r ?? 0,
      hr: raw.hr ?? 0,
      rbi: raw.rbi ?? 0,
      sb: raw.sb ?? 0,
      ip: raw.ip ?? 0,
      so: raw.so ?? 0,
      w: raw.w ?? 0,
      sv: raw.sv ?? 0,
      er: raw.er ?? 0,
    }
  },
  getLineupLockTime(_sport: string, gameTimeIso: string): Date {
    return new Date(gameTimeIso)
  },
}

export function getStartingPitchers(_week: number): string[] {
  void _week
  return []
}

export function getPlatoonSplit(_playerId: string, _oppHand: string): number {
  void _playerId
  void _oppHand
  return 0
}
