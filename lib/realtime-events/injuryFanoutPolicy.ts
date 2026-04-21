/**
 * Pure helpers for deciding which synced injury rows are worth league fan-out (no I/O).
 */

export type InjurySyncFanoutRow = {
  playerName: string
  team: string | null
  status: string
  type?: string | null
  description?: string | null
}

/** Lower = higher priority when selecting which rows to fan out under a global cap. */
export function injuryFanoutSortPriority(status: string): number {
  const s = status.toLowerCase()
  if (s === 'out' || s.includes('injured reserve') || /\bir\b/.test(s)) return 0
  if (s.includes('doubtful')) return 1
  if (s.includes('questionable') || s.includes('game time')) return 2
  if (s.includes('probable') || s === 'active' || s === 'healthy') return 99
  return 3
}

export function shouldIncludeInjuryInFanoutBatch(status: string | null | undefined): boolean {
  if (!status || !String(status).trim()) return false
  return injuryFanoutSortPriority(status) < 99
}
