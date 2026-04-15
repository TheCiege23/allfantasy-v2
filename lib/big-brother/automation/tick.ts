/**
 * [UPDATED] lib/big-brother/automation/tick.ts
 * Main BB automation orchestrator: iterates all active BB leagues, checks deadlines,
 * triggers phase transitions via BigBrotherAutomationService.
 * Called by cron route (app/api/big-brother/cron/automation/route.ts).
 */

import { prisma } from '@/lib/prisma'
import { runAutomation } from '../BigBrotherAutomationService'
import { getCurrentCycleForLeague } from '../BigBrotherPhaseStateMachine'
import type { BigBrotherWeekPhase } from '../types'
import type { BbAutomationTickInput, BbAutomationTickResult } from './types'

/** Map phase to the config deadline field that closes it. */
const PHASE_DEADLINE_MAP: Partial<Record<BigBrotherWeekPhase, {
  dayField: string
  timeField: string
  action: string
}>> = {
  HOH_OPEN: {
    dayField: 'hohChallengeDayOfWeek',
    timeField: 'hohChallengeTimeUtc',
    action: 'auto_hoh',
  },
  NOMINATION_OPEN: {
    dayField: 'nominationDeadlineDayOfWeek',
    timeField: 'nominationDeadlineTimeUtc',
    action: 'auto_nominate',
  },
  VETO_DRAW: {
    dayField: 'vetoDrawDayOfWeek',
    timeField: 'vetoDrawTimeUtc',
    action: 'veto_draw',
  },
  VETO_DECISION_OPEN: {
    dayField: 'vetoDecisionDeadlineDayOfWeek',
    timeField: 'vetoDecisionDeadlineTimeUtc',
    action: 'veto_decision_timeout',
  },
  REPLACEMENT_NOMINATION_OPEN: {
    dayField: 'replacementNomineeDeadlineDayOfWeek',
    timeField: 'replacementNomineeDeadlineTimeUtc',
    action: 'auto_replacement',
  },
  VOTING_OPEN: {
    dayField: 'evictionVoteCloseDayOfWeek',
    timeField: 'evictionVoteCloseTimeUtc',
    action: 'close_eviction',
  },
}

/**
 * Check if the deadline for the current phase has passed.
 * Deadlines are stored as dayOfWeek (0=Sun..6=Sat) + timeUtc ("HH:MM").
 * We compare against the current UTC time.
 */
function isDeadlinePast(
  config: Record<string, unknown>,
  dayField: string,
  timeField: string,
  now: Date
): boolean {
  const deadlineDay = config[dayField] as number | null
  const deadlineTime = config[timeField] as string | null
  if (deadlineDay == null || !deadlineTime) return false

  const currentDay = now.getUTCDay()
  const [hStr, mStr] = deadlineTime.split(':')
  const deadlineHour = parseInt(hStr ?? '0', 10)
  const deadlineMinute = parseInt(mStr ?? '0', 10)
  const currentHour = now.getUTCHours()
  const currentMinute = now.getUTCMinutes()

  // Calculate how many days until the deadline, handling week wraparound.
  // dayDiff=0 means today is the deadline day, dayDiff>0 means deadline is in the future.
  const dayDiff = (deadlineDay - currentDay + 7) % 7

  if (dayDiff > 0) return false // deadline is in a future day this week
  // dayDiff === 0: same day — check time
  if (currentHour > deadlineHour) return true
  if (currentHour === deadlineHour && currentMinute >= deadlineMinute) return true
  return false
}

export async function runBigBrotherAutomationTick(
  input: BbAutomationTickInput = {},
): Promise<BbAutomationTickResult> {
  const dryRun = input.dryRun === true
  const now = input.now ?? new Date()
  const errors: string[] = []
  let processed = 0
  let skipped = 0

  // Find all active Big Brother leagues
  const configFilter = input.forceLeagueId
    ? { leagueId: input.forceLeagueId }
    : { weekProgressionPaused: false }

  const configs = await prisma.bigBrotherLeagueConfig.findMany({
    where: configFilter,
    select: {
      leagueId: true,
      hohChallengeDayOfWeek: true,
      hohChallengeTimeUtc: true,
      nominationDeadlineDayOfWeek: true,
      nominationDeadlineTimeUtc: true,
      vetoDrawDayOfWeek: true,
      vetoDrawTimeUtc: true,
      vetoDecisionDeadlineDayOfWeek: true,
      vetoDecisionDeadlineTimeUtc: true,
      replacementNomineeDeadlineDayOfWeek: true,
      replacementNomineeDeadlineTimeUtc: true,
      evictionVoteOpenDayOfWeek: true,
      evictionVoteOpenTimeUtc: true,
      evictionVoteCloseDayOfWeek: true,
      evictionVoteCloseTimeUtc: true,
      weekProgressionPaused: true,
    },
  })

  for (const config of configs) {
    if (config.weekProgressionPaused && !input.forceLeagueId) {
      skipped++
      continue
    }

    const cycle = await getCurrentCycleForLeague(config.leagueId)
    if (!cycle) {
      skipped++
      continue
    }

    const phase = cycle.phase as BigBrotherWeekPhase
    const deadlineInfo = PHASE_DEADLINE_MAP[phase]

    if (!deadlineInfo) {
      // Phase doesn't have an auto-deadline (e.g., HOH_OPEN, HOH_LOCKED, EVICTION_RESOLVED)
      skipped++
      continue
    }

    const configRecord = config as unknown as Record<string, unknown>
    const past = isDeadlinePast(configRecord, deadlineInfo.dayField, deadlineInfo.timeField, now)

    if (!past) {
      skipped++
      continue
    }

    if (dryRun) {
      processed++
      continue
    }

    try {
      const result = await runAutomation({
        leagueId: config.leagueId,
        action: deadlineInfo.action as any,
      })
      if (result.ok) {
        processed++
      } else {
        errors.push(`${config.leagueId}: ${result.error ?? 'unknown error'}`)
      }
    } catch (e) {
      errors.push(`${config.leagueId}: ${e instanceof Error ? e.message : 'exception'}`)
    }
  }

  return {
    ok: errors.length === 0,
    processed,
    skipped,
    errors,
    dryRun,
    message: dryRun
      ? `[dryRun] BB automation tick: ${processed} would process, ${skipped} skipped.`
      : `BB automation tick: ${processed} processed, ${skipped} skipped, ${errors.length} errors.`,
  }
}
