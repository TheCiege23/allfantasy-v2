import { runBigBrotherAutomationTick } from '@/lib/big-brother/automation/tick'
import { getCurrentCycleForLeague } from '@/lib/big-brother/BigBrotherPhaseStateMachine'
import { isBigBrotherLeague } from '@/lib/big-brother/BigBrotherLeagueConfig'
import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'

/** BB deadlines are usually driven by the dedicated cron; manual/scheduled runs invoke the same tick. */
const ALLOWED: Set<string> = new Set(['onManualRun', 'onScheduledPass', 'onDraftCompleted'])

export async function runBigBrotherHandler(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ALLOWED.has(ctx.trigger)) {
    return {
      summary: 'Big Brother automation uses dedicated cron for deadline-driven phases; skipped for this trigger.',
      actions: [],
      events: [],
      skipped: true,
      skipReason: 'use_bb_cron_or_manual',
    }
  }

  const isBb = await isBigBrotherLeague(ctx.leagueId)
  if (!isBb) {
    return {
      summary: 'Not a Big Brother league.',
      actions: [],
      events: [],
      skipped: true,
      skipReason: 'not_bb',
    }
  }

  const tick = await runBigBrotherAutomationTick({ forceLeagueId: ctx.leagueId })
  const cycle = await getCurrentCycleForLeague(ctx.leagueId)

  const events = []
  if (tick.processed > 0) {
    events.push({
      eventType: 'big_brother_automation',
      title: 'Big Brother automation tick',
      description: tick.message,
      payload: { processed: tick.processed, skipped: tick.skipped, errors: tick.errors },
    })
  }

  return {
    summary: tick.message,
    actions: [
      {
        actionType: 'bb_automation_tick',
        metadata: { processed: tick.processed, skipped: tick.skipped, ok: tick.ok },
      },
    ],
    events,
    phaseState: {
      currentPhase: cycle?.phase ?? undefined,
      currentWeekContext: cycle?.week ?? ctx.week ?? undefined,
    },
    warnings: tick.errors?.length ? tick.errors : undefined,
  }
}
