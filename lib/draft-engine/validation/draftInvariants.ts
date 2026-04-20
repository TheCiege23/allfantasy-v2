/**
 * Lightweight client/server checks — authoritative validation remains in PickSubmissionService + DraftWorker.
 */

export function assertLeagueSize(teamCount: number): boolean {
  return Number.isFinite(teamCount) && teamCount >= 2 && teamCount <= 64
}

export function assertOverallInDraft(overall: number, rounds: number, teamCount: number): boolean {
  const max = rounds * teamCount
  return overall >= 1 && overall <= max
}
