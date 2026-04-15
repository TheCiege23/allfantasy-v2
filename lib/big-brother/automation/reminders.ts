/**
 * [UPDATED] lib/big-brother/automation/reminders.ts
 * Deadline reminders: posts Chimmy-style announcements to league chat when deadlines approach.
 * T-24h and T-1h reminders for nomination, veto decision, replacement, and voting deadlines.
 */

import { prisma } from '@/lib/prisma'
import { getCurrentCycleForLeague } from '../BigBrotherPhaseStateMachine'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'
import type { BigBrotherWeekPhase } from '../types'
import type { BbReminderSweepInput, BbReminderSweepResult } from './types'

const SYSTEM_USER_ID = 'system'

/** Phases that have upcoming deadlines worth reminding about. */
const REMINDER_PHASES: Partial<Record<BigBrotherWeekPhase, {
  dayField: string
  timeField: string
  label: string
  message: (hoursLeft: number) => string
}>> = {
  NOMINATION_OPEN: {
    dayField: 'nominationDeadlineDayOfWeek',
    timeField: 'nominationDeadlineTimeUtc',
    label: 'Nomination deadline',
    message: (h) => h <= 1
      ? 'HOH — nomination deadline is in less than 1 hour! Nominate 2 houseguests now or auto-nomination will kick in.'
      : `HOH — nomination deadline is approaching (~${h}h). Use \`/nominate [name1] [name2]\` to set your nominees.`,
  },
  VETO_DECISION_OPEN: {
    dayField: 'vetoDecisionDeadlineDayOfWeek',
    timeField: 'vetoDecisionDeadlineTimeUtc',
    label: 'Veto decision deadline',
    message: (h) => h <= 1
      ? 'Veto winner — decision deadline in less than 1 hour! Use `/veto use [nominee]` or `/veto pass`.'
      : `Veto winner — your decision deadline is approaching (~${h}h). Will you save a nominee?`,
  },
  REPLACEMENT_NOMINATION_OPEN: {
    dayField: 'replacementNomineeDeadlineDayOfWeek',
    timeField: 'replacementNomineeDeadlineTimeUtc',
    label: 'Replacement nominee deadline',
    message: (h) => h <= 1
      ? 'HOH — replacement nominee deadline in less than 1 hour! Use `/replacement [name]`.'
      : `HOH — name a replacement nominee before the deadline (~${h}h remaining).`,
  },
  VOTING_OPEN: {
    dayField: 'evictionVoteCloseDayOfWeek',
    timeField: 'evictionVoteCloseTimeUtc',
    label: 'Voting deadline',
    message: (h) => h <= 1
      ? 'Voting closes in less than 1 hour! Cast your eviction vote now — this is your last chance.'
      : `Eviction voting closes in ~${h}h. Cast your vote privately if you haven\'t already.`,
  },
}

function hoursUntilDeadline(
  config: Record<string, unknown>,
  dayField: string,
  timeField: string,
  now: Date
): number | null {
  const deadlineDay = config[dayField] as number | null
  const deadlineTime = config[timeField] as string | null
  if (deadlineDay == null || !deadlineTime) return null

  const [hStr, mStr] = deadlineTime.split(':')
  const deadlineHour = parseInt(hStr ?? '0', 10)
  const deadlineMinute = parseInt(mStr ?? '0', 10)

  const currentDay = now.getUTCDay()
  const currentHour = now.getUTCHours()
  const currentMinute = now.getUTCMinutes()

  let dayDiff = deadlineDay - currentDay
  if (dayDiff < 0) dayDiff += 7

  const totalMinutesUntil =
    dayDiff * 24 * 60 +
    (deadlineHour - currentHour) * 60 +
    (deadlineMinute - currentMinute)

  if (totalMinutesUntil <= 0) return null // deadline already passed
  return Math.round(totalMinutesUntil / 60)
}

export async function runBbReminderSweep(input: BbReminderSweepInput = {}): Promise<BbReminderSweepResult> {
  const dryRun = input.dryRun === true
  const now = input.now ?? new Date()
  const errors: string[] = []
  let remindersScheduled = 0

  const configs = await prisma.bigBrotherLeagueConfig.findMany({
    where: { weekProgressionPaused: false },
    select: {
      leagueId: true,
      nominationDeadlineDayOfWeek: true,
      nominationDeadlineTimeUtc: true,
      vetoDecisionDeadlineDayOfWeek: true,
      vetoDecisionDeadlineTimeUtc: true,
      replacementNomineeDeadlineDayOfWeek: true,
      replacementNomineeDeadlineTimeUtc: true,
      evictionVoteCloseDayOfWeek: true,
      evictionVoteCloseTimeUtc: true,
    },
  })

  for (const config of configs) {
    const cycle = await getCurrentCycleForLeague(config.leagueId)
    if (!cycle) continue

    const phase = cycle.phase as BigBrotherWeekPhase
    const reminderInfo = REMINDER_PHASES[phase]
    if (!reminderInfo) continue

    const configRecord = config as unknown as Record<string, unknown>
    const hours = hoursUntilDeadline(configRecord, reminderInfo.dayField, reminderInfo.timeField, now)
    if (hours == null) continue

    // Send reminder at T-24h and T-1h windows (within 30 min of each threshold)
    const shouldRemind = (hours <= 25 && hours >= 23) || (hours <= 2 && hours >= 0)
    if (!shouldRemind) continue

    if (dryRun) {
      remindersScheduled++
      continue
    }

    try {
      await createLeagueChatMessage(
        config.leagueId,
        SYSTEM_USER_ID,
        reminderInfo.message(hours),
        {
          type: 'text',
          source: 'bb_automation',
          messageSubtype: 'bb_deadline_reminder',
          metadata: { phase, hoursLeft: hours, deadline: reminderInfo.label, week: cycle.week },
        }
      )
      remindersScheduled++
    } catch (e) {
      errors.push(`${config.leagueId}: ${e instanceof Error ? e.message : 'send failed'}`)
    }
  }

  return {
    ok: errors.length === 0,
    remindersScheduled,
    errors,
    dryRun,
    message: dryRun
      ? `[dryRun] BB reminders: ${remindersScheduled} would send.`
      : `BB reminders: ${remindersScheduled} sent, ${errors.length} errors.`,
  }
}
