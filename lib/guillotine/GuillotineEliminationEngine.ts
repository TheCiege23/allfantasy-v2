/**
 * Run elimination: determine lowest N, apply tiebreaker, mark chopped, trigger release and events.
 */

import { prisma } from '@/lib/prisma'
import { getGuillotineConfig } from './GuillotineLeagueConfig'
import { resolveTiebreak } from './GuillotineTiebreakResolver'
import { evaluateWeek, getDraftSlotByRoster } from './GuillotineWeekEvaluator'
import { releaseChoppedRosters } from './GuillotineRosterReleaseEngine'
import { appendEvent } from './GuillotineEventLog'
import { postChopToLeagueChat } from './guillotineChat'
import type { GuillotineChopResult, PeriodScoreRow } from './types'

export interface RunEliminationInput {
  leagueId: string
  weekOrPeriod: number
  season?: number | null
  periodEndedAt?: Date
  /** Pre-computed period scores (optional). If not provided, evaluator reads from DB. */
  periodScores?: PeriodScoreRow[]
  /** Commissioner override: exact roster IDs to chop (audit logged). */
  commissionerChoppedRosterIds?: string[]
  /** Do not run roster release (e.g. run release in a separate job). */
  skipRosterRelease?: boolean
  /** Do not post to league chat. */
  skipChat?: boolean
  /** System user ID for league chat (required if !skipChat). */
  systemUserId?: string
}

/**
 * Run elimination for the given period: evaluate, tiebreak, mark chopped, release rosters, log and notify.
 */
export async function runElimination(input: RunEliminationInput): Promise<GuillotineChopResult | null> {
  const config = await getGuillotineConfig(input.leagueId)
  if (!config) return null

  const { eliminationStartWeek, eliminationEndWeek, teamsPerChop } = config
  if (input.weekOrPeriod < eliminationStartWeek) {
    return { leagueId: input.leagueId, weekOrPeriod: input.weekOrPeriod, choppedRosterIds: [], tiebreakStepUsed: null, reason: 'before elimination start' }
  }
  if (eliminationEndWeek != null && input.weekOrPeriod > eliminationEndWeek) {
    return { leagueId: input.leagueId, weekOrPeriod: input.weekOrPeriod, choppedRosterIds: [], tiebreakStepUsed: null, reason: 'past elimination end' }
  }

  const evalResult = await evaluateWeek({
    leagueId: input.leagueId,
    weekOrPeriod: input.weekOrPeriod,
    season: input.season,
    periodScores: input.periodScores,
    periodEndedAt: input.periodEndedAt,
  })
  if (!evalResult) return null
  if (!evalResult.pastCutoff) {
    return {
      leagueId: input.leagueId,
      weekOrPeriod: input.weekOrPeriod,
      choppedRosterIds: [],
      tiebreakStepUsed: null,
      reason: 'before stat correction cutoff',
    }
  }
  if (evalResult.scores.length === 0) {
    return { leagueId: input.leagueId, weekOrPeriod: input.weekOrPeriod, choppedRosterIds: [], tiebreakStepUsed: null, reason: 'no active scores' }
  }

  const minPoints = Math.min(...evalResult.scores.map((s) => s.periodPoints))
  const tiedCandidates = evalResult.scores.filter((s) => s.periodPoints === minPoints)
  const draftSlotByRoster = await getDraftSlotByRoster(input.leagueId)

  const { choppedRosterIds, stepUsed, reason } = resolveTiebreak({
    candidates: tiedCandidates,
    tiebreakerOrder: config.tiebreakerOrder,
    teamsPerChop,
    weekOrPeriod: input.weekOrPeriod,
    draftSlotByRoster,
    commissionerChoppedRosterIds: input.commissionerChoppedRosterIds?.length
      ? input.commissionerChoppedRosterIds
      : undefined,
  })

  if (choppedRosterIds.length === 0) {
    return {
      leagueId: input.leagueId,
      weekOrPeriod: input.weekOrPeriod,
      choppedRosterIds: [],
      tiebreakStepUsed: stepUsed,
      reason,
    }
  }

  const now = new Date()
  for (const rosterId of choppedRosterIds) {
    await prisma.guillotineRosterState.upsert({
      where: { rosterId },
      create: {
        leagueId: input.leagueId,
        rosterId,
        choppedAt: now,
        choppedInPeriod: input.weekOrPeriod,
        choppedReason: reason,
      },
      update: {
        choppedAt: now,
        choppedInPeriod: input.weekOrPeriod,
        choppedReason: reason,
      },
    })
  }

  await appendEvent(input.leagueId, 'chop', {
    weekOrPeriod: input.weekOrPeriod,
    choppedRosterIds,
    tiebreakStepUsed: stepUsed,
    reason,
    commissionerOverride: Boolean(input.commissionerChoppedRosterIds?.length),
  })

  if (!input.skipRosterRelease) {
    await releaseChoppedRosters({
      leagueId: input.leagueId,
      rosterIds: choppedRosterIds,
      releaseTiming: config.rosterReleaseTiming,
    })
  }

  if (!input.skipChat && input.systemUserId) {
    await postChopToLeagueChat({
      leagueId: input.leagueId,
      weekOrPeriod: input.weekOrPeriod,
      choppedRosterIds,
      displayNames: await getDisplayNamesForRosters(input.leagueId, choppedRosterIds),
      userId: input.systemUserId,
    })
  }

  await appendEvent(input.leagueId, 'chop_animation_trigger', {
    weekOrPeriod: input.weekOrPeriod,
    choppedRosterIds,
  })

  return {
    leagueId: input.leagueId,
    weekOrPeriod: input.weekOrPeriod,
    choppedRosterIds,
    tiebreakStepUsed: stepUsed,
    reason,
  }
}

async function getDisplayNamesForRosters(leagueId: string, rosterIds: string[]): Promise<Record<string, string>> {
  const rosters = await prisma.roster.findMany({
    where: { leagueId, id: { in: rosterIds } },
    select: { id: true, platformUserId: true },
  })
  const userIds = [...new Set(rosters.map((r) => r.platformUserId).filter(Boolean))]
  const users = await prisma.appUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, email: true },
  })
  const byUserId = Object.fromEntries(users.map((u) => [u.id, u.displayName || u.email || u.id]))
  const result: Record<string, string> = {}
  for (const r of rosters) {
    result[r.id] = byUserId[r.platformUserId] ?? r.platformUserId ?? r.id
  }
  return result
}
