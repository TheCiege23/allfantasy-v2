/**
 * Zombie infection engine: apply infection after result finalization (PROMPT 353).
 * Survivor loses to Whisperer or Zombie -> Survivor becomes Zombie.
 */

import { prisma } from '@/lib/prisma'
import { getZombieLeagueConfig } from './ZombieLeagueConfig'
import { getRosterTeamMap } from './rosterTeamMap'
import { getAllStatuses, setZombie } from './ZombieOwnerStatusService'
import { appendZombieAudit } from './ZombieAuditLog'
import type { ZombieInfectionOutcome } from './types'

export interface InfectionInput {
  leagueId: string
  week: number
  season?: number
  zombieLeagueId?: string | null
}

/**
 * Get matchup results for league/week from MatchupFact. Returns in team space (teamId).
 */
async function getMatchupResults(leagueId: string, week: number, season: number | null) {
  const facts = await prisma.matchupFact.findMany({
    where: { leagueId, weekOrPeriod: week, ...(season != null ? { season } : {}) },
    select: { matchupId: true, teamA: true, teamB: true, scoreA: true, scoreB: true, winnerTeamId: true },
  })
  return facts
}

/**
 * Compute who should be infected this week (deterministic).
 */
export async function computeInfections(input: InfectionInput): Promise<ZombieInfectionOutcome> {
  const config = await getZombieLeagueConfig(input.leagueId)
  if (!config) return { leagueId: input.leagueId, week: input.week, infected: [] }

  const { leagueId, week, season = null, zombieLeagueId } = input
  const map = await getRosterTeamMap(leagueId)
  const statuses = await getAllStatuses(leagueId)
  const statusByRoster = new Map(statuses.map((s) => [s.rosterId, s.status]))
  const matchups = await getMatchupResults(leagueId, week, season ?? new Date().getFullYear())

  const infected: ZombieInfectionOutcome['infected'] = []

  const pendingSerum = await prisma.zombieTeamItem.findMany({
    where: {
      activationState: 'pending_activation',
      activatesAtWeek: week,
      team: { leagueId },
    },
    select: { team: { select: { rosterId: true } } },
  })
  const serumProtectedRosterIds = new Set(pendingSerum.map((i) => i.team.rosterId))

  for (const m of matchups) {
    const winnerTeamId = m.winnerTeamId
    if (!winnerTeamId) continue // tie
    const loserTeamId = winnerTeamId === m.teamA ? m.teamB : m.teamA
    const winnerRosterId = map.teamIdToRosterId.get(winnerTeamId)
    const loserRosterId = map.teamIdToRosterId.get(loserTeamId)
    if (!winnerRosterId || !loserRosterId) continue

    const loserStatus = statusByRoster.get(loserRosterId)
    if (loserStatus !== 'Survivor') continue

    if (serumProtectedRosterIds.has(loserRosterId)) continue

    const winnerStatus = statusByRoster.get(winnerRosterId)
    const infectByWhisperer = config.infectionLossToWhisperer && winnerStatus === 'Whisperer'
    const infectByZombie = config.infectionLossToZombie && winnerStatus === 'Zombie'
    if (!infectByWhisperer && !infectByZombie) continue

    infected.push({
      survivorRosterId: loserRosterId,
      infectedByRosterId: winnerRosterId,
      matchupId: m.matchupId ?? undefined,
    })
    statusByRoster.set(loserRosterId, 'Zombie')
  }

  return { leagueId, week, infected }
}

/**
 * Apply infections: update status, log, audit.
 */
export async function applyInfections(outcome: ZombieInfectionOutcome, zombieLeagueId?: string | null): Promise<void> {
  for (const inf of outcome.infected) {
    await setZombie(
      outcome.leagueId,
      inf.survivorRosterId,
      outcome.week,
      inf.infectedByRosterId,
      zombieLeagueId
    )
    await prisma.zombieInfectionLog.create({
      data: {
        leagueId: outcome.leagueId,
        zombieLeagueId: zombieLeagueId ?? null,
        week: outcome.week,
        survivorRosterId: inf.survivorRosterId,
        infectedByRosterId: inf.infectedByRosterId,
        matchupId: inf.matchupId ?? null,
      },
    })
    await appendZombieAudit({
      leagueId: outcome.leagueId,
      zombieLeagueId: zombieLeagueId ?? null,
      eventType: 'infection',
      metadata: {
        survivorRosterId: inf.survivorRosterId,
        infectedByRosterId: inf.infectedByRosterId,
        week: outcome.week,
        matchupId: inf.matchupId,
      },
    })
  }
}

/**
 * Run infection for a league/week (compute + apply).
 */
export async function runInfectionForWeek(input: InfectionInput): Promise<ZombieInfectionOutcome> {
  const outcome = await computeInfections(input)
  await applyInfections(outcome, input.zombieLeagueId)
  return outcome
}
