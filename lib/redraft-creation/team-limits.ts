/**
 * Team count options for the redraft-only 4-step create flow.
 */

import { getRedraftMaxTeams, type SoccerPipeline } from '@/lib/redraft-creation/sport-config'

function evenRange(min: number, max: number): number[] {
  const out: number[] = []
  const start = min % 2 === 0 ? min : min + 1
  for (let n = start; n <= max; n += 2) out.push(n)
  return out
}

/** NFL: keep familiar presets plus even counts up to max. */
export function getRedraftTeamCountOptions(sport: string, soccerPipeline?: SoccerPipeline | null): number[] {
  const max = getRedraftMaxTeams(sport, soccerPipeline)
  const u = sport.toUpperCase()
  if (u === 'NFL') {
    const preset = [16, 20, 24].filter((n) => n <= max)
    const full = evenRange(4, max)
    const merged = [...new Set([...preset, ...full])].sort((a, b) => a - b)
    return merged
  }
  return evenRange(4, max)
}

export function clampRedraftTeamCount(
  sport: string,
  raw: number,
  soccerPipeline?: SoccerPipeline | null
): number {
  const max = getRedraftMaxTeams(sport, soccerPipeline)
  const min = 4
  const n = Number.isFinite(raw) ? Math.round(raw) : 12
  let v = Math.min(Math.max(n, min), max)
  if (v % 2 !== 0) v = Math.min(max, v + 1)
  return v
}
