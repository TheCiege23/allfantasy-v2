/**
 * Chimmy / client helpers for Start A vs B (player comparison).
 * Server comparison runs via POST /api/leagues/[leagueId]/player-comparison/start-vs
 */

export const CHIMMY_START_VS_TOOL_KEY = 'start_vs_comparison' as const

export function buildStartVsChimmyPrompt(playerA: string, playerB: string, weekOrPeriod?: string | null): string {
  const w = weekOrPeriod?.trim()
  return `Who should I start: ${playerA} or ${playerB}?${w ? ` For ${w}.` : ''} Use my league scoring and deterministic comparison — explain floor vs upside.`
}

export function buildStartVsApiPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/player-comparison/start-vs`
}
