export type ParsedStats = Record<string, number>

export interface SportAdapter {
  parseRawStats(raw: Record<string, number>): ParsedStats
  getLineupLockTime(sport: string, gameTimeIso: string): Date
}
