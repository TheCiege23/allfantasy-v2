import { prisma } from '@/lib/prisma'
import { runWeeklyResolution } from '@/lib/zombie/weeklyResolutionEngine'
import { loadSpecialtyMetadataSnapshot } from '@/lib/specialty-automation/syncMetadata'
import { planLeagueEvent } from '@/lib/specialty-automation/actionPlans'
import { notApplicableTrigger } from '@/lib/specialty-automation/conceptHandlerUtils'
import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'

const ALLOWED = new Set(['onWeekFinalized', 'onManualRun', 'onScheduledPass', 'onStandingsUpdated'])

export async function runZombieHandler(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ALLOWED.has(ctx.trigger)) {
    return notApplicableTrigger(ctx, 'Zombie')
  }

  const meta = await loadSpecialtyMetadataSnapshot('zombie', ctx)
  const z = await prisma.zombieLeague.findUnique({
    where: { leagueId: ctx.leagueId },
    select: { id: true, currentWeek: true, status: true },
  })

  if (!z) {
    return {
      summary: 'Zombie: no zombie league attached to this fantasy league.',
      actions: [{ actionType: 'specialty_metadata_sync', metadata: meta }],
      events: [],
      skipped: true,
      skipReason: 'no_zombie_league',
      phaseState: { metadata: meta },
    }
  }

  const week = Math.max(1, ctx.week ?? z.currentWeek ?? 1)
  let resolutionSummary = 'Zombie: weekly resolution skipped.'
  const events: HandlerResult['events'] = []

  try {
    const res = await runWeeklyResolution(z.id, week, { force: ctx.trigger === 'onManualRun' })
    if (res.skipped) {
      resolutionSummary = `Zombie: resolution skipped (${res.reason ?? 'gated'}).`
    } else {
      resolutionSummary = 'Zombie: weekly horde resolution completed.'
      events.push(
        planLeagueEvent(
          'zombie_weekly_resolution',
          `Zombie week ${week}`,
          undefined,
          { zombieLeagueId: z.id, week, resolutionId: res.resolution?.id },
        ),
      )
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      summary: `Zombie resolution error: ${msg}`,
      actions: [{ actionType: 'zombie_weekly_resolution_error', metadata: { error: msg, week } }],
      events: [],
      warnings: [msg],
      phaseState: { currentWeekContext: week, metadata: meta },
    }
  }

  return {
    summary: resolutionSummary,
    actions: [
      {
        actionType: 'zombie_weekly_resolution',
        metadata: { zombieLeagueId: z.id, week },
      },
    ],
    events,
    phaseState: {
      currentPhase: 'horde',
      currentWeekContext: week,
      metadata: { ...meta, zombieStatus: z.status },
    },
  }
}
