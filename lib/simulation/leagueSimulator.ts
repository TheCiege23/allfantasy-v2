/**
 * League Simulator Orchestrator — dispatches to format-specific simulators.
 * Called by the admin API route for the simulation button.
 */

import { prisma } from '@/lib/prisma'
import type { SimulationConfig, SimulationReport, SimTeam } from './types'
import { simulateStandard } from './simulators/standardSimulator'
import { simulateSurvivor } from './simulators/survivorSimulator'
import { simulateZombie } from './simulators/zombieSimulator'
import { simulateGuillotine } from './simulators/guillotineSimulator'
import { simulateBestBall } from './simulators/bestBallSimulator'
import { simulateTournament } from './simulators/tournamentSimulator'

/**
 * Run a full simulation of a league and return the report.
 */
export async function simulateLeague(
  leagueId: string,
  userId: string,
  commissionerMode: 'spectator' | 'participating' = 'spectator',
): Promise<SimulationReport> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: {
      id: true, name: true, sport: true, leagueType: true, leagueVariant: true,
      leagueSize: true, rosterSize: true, season: true,
      playoffStartWeek: true, playoffTeams: true,
    },
  })
  if (!league) throw new Error('League not found')

  // Get teams/rosters
  const leagueTeams = await (prisma as any).leagueTeam.findMany({
    where: { leagueId },
    select: { id: true, teamName: true, ownerName: true, pointsFor: true },
  })

  // If no league teams, try rosters
  let teams: SimTeam[]
  if (leagueTeams.length > 0) {
    teams = leagueTeams.map((t: any) => ({
      id: t.id,
      name: t.teamName || t.ownerName || `Team ${t.id.slice(0, 6)}`,
      ownerName: t.ownerName || 'Unknown',
      projectedPoints: t.pointsFor > 0 ? t.pointsFor / 14 : 100 + Math.random() * 40,
    }))
  } else {
    // Generate placeholder teams
    const count = league.leagueSize || 12
    teams = Array.from({ length: count }, (_, i) => ({
      id: `sim-team-${i}`,
      name: `Team ${i + 1}`,
      ownerName: `Owner ${i + 1}`,
      projectedPoints: 90 + Math.random() * 40,
    }))
  }

  const config: SimulationConfig = {
    leagueId,
    leagueType: league.leagueType ?? 'redraft',
    leagueVariant: league.leagueVariant ?? null,
    sport: league.sport ?? 'NFL',
    playerCount: teams.length,
    teamCount: teams.length,
    seasonWeeks: league.playoffStartWeek ? league.playoffStartWeek + 3 : 17,
  }

  // Create tracking record
  const simRun = await (prisma as any).leagueSimulationRun?.create?.({
    data: {
      leagueId, userId,
      leagueType: config.leagueType,
      leagueVariant: config.leagueVariant,
      sport: config.sport,
      playerCount: teams.length,
      status: 'running',
    },
  }).catch(() => null)

  let report: SimulationReport

  try {
    const variant = (config.leagueVariant ?? config.leagueType).toLowerCase()

    if (variant === 'survivor') {
      report = await simulateSurvivor(config, teams, commissionerMode)
    } else if (variant === 'zombie') {
      report = await simulateZombie(config, teams)
    } else if (variant === 'guillotine') {
      report = await simulateGuillotine(config, teams)
    } else if (config.leagueType === 'best_ball') {
      report = await simulateBestBall(config, teams)
    } else if (variant === 'tournament' || variant === 'tournament_mode') {
      report = await simulateTournament(config, teams)
    } else {
      // redraft, dynasty, keeper, salary_cap, devy, c2c
      report = await simulateStandard(config, teams)
    }

    // Update tracking record
    if (simRun?.id) {
      await (prisma as any).leagueSimulationRun?.update?.({
        where: { id: simRun.id },
        data: {
          status: 'completed',
          report,
          weeksSimulated: report.weeksSimulated,
          champion: report.champion,
          completedAt: new Date(),
        },
      }).catch(() => {})
    }
  } catch (err) {
    if (simRun?.id) {
      await (prisma as any).leagueSimulationRun?.update?.({
        where: { id: simRun.id },
        data: { status: 'failed', errorMessage: String(err) },
      }).catch(() => {})
    }
    throw err
  }

  return report
}
