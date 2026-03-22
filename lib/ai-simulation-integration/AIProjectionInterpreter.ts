/**
 * AIProjectionInterpreter — format simulation/warehouse outputs for AI narrative.
 * Turns numbers into short, sport-aware phrases for prompts and responses.
 */

import { normalizeSportForAI } from './SportAIContextResolver'

export function formatWinProbability(pct: number, sport: string): string {
  const s = normalizeSportForAI(sport)
  return `In ${s}, your team has a ${Math.round(pct)}% chance to win this week.`
}

export function formatPlayoffOdds(pct: number, sport: string): string {
  const s = normalizeSportForAI(sport)
  return `In ${s}, you currently have a ${Math.round(pct)}% chance to make the playoffs.`
}

export function formatRosterStrength(strength3yr: number, strength5yr: number, sport: string): string {
  const s = normalizeSportForAI(sport)
  return `In ${s}, your roster projects ${Math.round(strength3yr)} (3-year) and ${Math.round(strength5yr)} (5-year) strength on a 0-100 scale.`
}

export function formatTradeChampionshipImpact(deltaPct: number, sport: string): string {
  const s = normalizeSportForAI(sport)
  const sign = deltaPct >= 0 ? '+' : ''
  return `In ${s}, this trade ${deltaPct >= 0 ? 'improves' : 'reduces'} your championship probability by ${sign}${Math.round(Math.abs(deltaPct))} percentage points.`
}

export function formatWaiverImpact(winProbChange: number, sport: string): string {
  const s = normalizeSportForAI(sport)
  return winProbChange >= 0
    ? `In ${s}, this waiver add improves your short-term win probability this week by about ${Math.round(winProbChange)}%.`
    : `In ${s}, this add has limited short-term impact (${Math.round(winProbChange)}% win-probability change).`
}

export function formatDraftInsight(strengthDelta: number, positionLeverage: string, sport: string): string {
  const s = normalizeSportForAI(sport)
  return `In ${s}, this pick ${strengthDelta >= 0 ? 'increases' : 'slightly reduces'} long-term roster strength${positionLeverage ? ` and ${positionLeverage}` : ''}.`
}
