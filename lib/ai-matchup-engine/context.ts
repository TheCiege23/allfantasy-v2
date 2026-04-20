import type { MatchupCenterPayload, MatchupPlayerSlot } from '@/lib/matchup-center/types'

/** Compact, prompt-safe snapshot — avoids huge payloads. */
export function compactMatchupForAi(payload: MatchupCenterPayload): Record<string, unknown> {
  const trimSlot = (s: MatchupPlayerSlot) => ({
    playerId: s.playerId,
    name: s.name,
    position: s.position,
    team: s.team,
    opponent: s.opponent,
    currentPoints: s.currentPoints,
    projectedPoints: s.projectedPoints,
    injuryStatus: s.injuryStatus,
    newsBlurb: s.newsBlurb ? String(s.newsBlurb).slice(0, 200) : null,
    weatherSummary: s.weatherSummary,
    gameStatus: s.gameStatus,
    gameLabel: s.gameLabel,
  })

  const side = (label: string, m: MatchupCenterPayload['left']) => ({
    label,
    teamName: m.teamName,
    record: m.record,
    winPct: m.winPct,
    totalPoints: m.totalPoints,
    projectedTotal: m.projectedTotal,
    remainingStarters: m.remainingStarters,
    starters: m.starters.map(trimSlot),
  })

  return {
    leagueId: payload.leagueId,
    sport: payload.sport,
    season: payload.season,
    week: payload.week,
    matchupStatus: payload.matchupStatus,
    conceptOverlay: payload.conceptOverlay,
    winProbabilityLeft: payload.winProbabilityLeft,
    partialData: payload.partialData,
    left: side('viewer', payload.left),
    right: side('opponent', payload.right),
  }
}

export function compactPlayerSlotForAi(s: MatchupPlayerSlot): Record<string, unknown> {
  return {
    playerId: s.playerId,
    name: s.name,
    position: s.position,
    team: s.team,
    opponent: s.opponent,
    currentPoints: s.currentPoints,
    projectedPoints: s.projectedPoints,
    injuryStatus: s.injuryStatus,
    newsBlurb: s.newsBlurb ? String(s.newsBlurb).slice(0, 220) : null,
    weatherSummary: s.weatherSummary,
    gameStatus: s.gameStatus,
    gameLabel: s.gameLabel,
  }
}
