/**
 * BEST BALL RISK ENGINE — pure, deterministic. No AI, no fabrication.
 *
 * Aggregates roster RISK for a draft-only auto-lineup build: fragile positions (no buffer),
 * injury concentration, bye-week clustering (when data exists), and over-concentration on a
 * single real team (correlation cuts both ways — a stack's bye/bye-week or a team's bad year
 * sinks several roster spots at once). Never fabricates bye or team data.
 */

import { evaluateDepth } from './bestBallDepthEngine'
import { evaluateStacks } from './bestBallStackCorrelationEngine'
import type { BestBallWarRoomContext } from './types'

export interface BestBallRiskResult {
  rosterId: string
  /** 0-100; higher = more roster-construction risk. */
  riskScore: number
  fragilePositions: string[]
  byeClusters: Array<{ week: number; count: number }>
  overConcentratedTeams: Array<{ team: string; count: number }>
  riskFlags: string[]
  missingDataFlags: string[]
}

export function evaluateRisk(context: BestBallWarRoomContext, rosterId: string): BestBallRiskResult {
  const team = context.teams.find((t) => t.rosterId === rosterId)
  const missingDataFlags = [...context.missingDataFlags]
  if (!team) {
    return { rosterId, riskScore: 0, fragilePositions: [], byeClusters: [], overConcentratedTeams: [], riskFlags: ['Roster not found in this league.'], missingDataFlags }
  }

  const depth = evaluateDepth(context, rosterId)
  const stacks = evaluateStacks(context, rosterId)
  const riskFlags: string[] = []

  // Injury concentration.
  const injured = team.players.filter((p) => p.injuryStatus && !/^(healthy|active|ok)$/i.test(p.injuryStatus))
  if (injured.length >= 3) riskFlags.push(`${injured.length} players carry a non-healthy injury status.`)

  // Over-concentration: 3+ players on one real team (a single team's down year hits hard).
  const overConcentratedTeams: Array<{ team: string; count: number }> = []
  if (context.availability.teamData === 'available') {
    const byTeam = new Map<string, number>()
    for (const p of team.players) if (p.team) byTeam.set(p.team, (byTeam.get(p.team) ?? 0) + 1)
    for (const [tm, count] of byTeam) if (count >= 3) overConcentratedTeams.push({ team: tm, count })
    overConcentratedTeams.sort((a, b) => b.count - a.count)
    for (const oc of overConcentratedTeams) riskFlags.push(`${oc.count} players on ${oc.team} — high single-team concentration risk (offsets stack upside).`)
  }

  for (const f of depth.riskFlags) riskFlags.push(f)
  for (const c of stacks.byeClusters) riskFlags.push(`Week ${c.week} bye cluster (${c.count} players).`)

  let risk = 0
  risk += depth.fragilePositions.length * 16
  risk += injured.length * 6
  risk += overConcentratedTeams.reduce((s, oc) => s + (oc.count - 2) * 8, 0)
  risk += stacks.byeClusters.reduce((s, c) => s + Math.max(0, c.count - 3) * 6, 0)
  const riskScore = Math.max(0, Math.min(100, Math.round(risk)))

  return {
    rosterId,
    riskScore,
    fragilePositions: depth.fragilePositions,
    byeClusters: stacks.byeClusters.map((c) => ({ week: c.week, count: c.count })),
    overConcentratedTeams,
    riskFlags: [...new Set(riskFlags)],
    missingDataFlags: [...new Set([...missingDataFlags, ...depth.missingDataFlags])],
  }
}
