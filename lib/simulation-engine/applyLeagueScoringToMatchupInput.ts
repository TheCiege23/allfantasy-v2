/**
 * When lineup slots include `projectedStats`, convert stat lines → fantasy points using the same
 * league template + commissioner overrides as weekly scoring (`resolveScoringRulesForLeague`).
 */
import type { LeagueSport } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveScoringRulesForLeague } from '@/lib/multi-sport/MultiSportScoringResolver'
import type { ScoringRuleDto } from '@/lib/multi-sport/ScoringTemplateResolver'
import { computeFantasyPointsFromStats } from '@/server/services/scoringEngine'
import type { MatchupSimulationInput, MatchupSimulationTeamInput } from './types'

function hasProjectedStats(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj) && Object.keys(obj).length > 0
}

function mapTeamLineup(team: MatchupSimulationTeamInput, rules: ScoringRuleDto[]): MatchupSimulationTeamInput {
  if (!team.lineup?.length) return team
  let touched = false
  const lineup = team.lineup.map((slot) => {
    if (!hasProjectedStats(slot.projectedStats)) return slot
    touched = true
    const { points } = computeFantasyPointsFromStats(slot.projectedStats, rules)
    const rounded = Math.round(points * 100) / 100
    return {
      ...slot,
      projection: rounded,
    }
  })
  return touched ? { ...team, lineup } : team
}

export async function applyLeagueScoringToMatchupInput(
  input: MatchupSimulationInput,
): Promise<MatchupSimulationInput> {
  if (!input.leagueId) return input

  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: { sport: true },
  })
  if (!league?.sport) return input

  const rules = await resolveScoringRulesForLeague(input.leagueId, league.sport as LeagueSport)
  const teamA = mapTeamLineup(input.teamA, rules)
  const teamB = mapTeamLineup(input.teamB, rules)
  return { ...input, teamA, teamB }
}
