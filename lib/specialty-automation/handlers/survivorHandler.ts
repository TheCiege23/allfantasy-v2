import { tryAutomaticPhaseAdvance } from '@/lib/survivor/gameStateMachine'
import { prisma } from '@/lib/prisma'
import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'

const ALLOWED: Set<string> = new Set([
  'onWeekFinalized',
  'onStandingsUpdated',
  'onManualRun',
  'onScheduledPass',
  'onPhaseTransition',
])

export async function runSurvivorHandler(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ALLOWED.has(ctx.trigger)) {
    return {
      summary: 'Survivor automation skipped for this trigger.',
      actions: [],
      events: [],
      skipped: true,
      skipReason: 'trigger_not_applicable',
    }
  }

  const league = await prisma.league.findUnique({
    where: { id: ctx.leagueId },
    select: { survivorMode: true },
  })
  if (!league?.survivorMode) {
    return {
      summary: 'Not a survivor-mode league row.',
      actions: [],
      events: [],
      skipped: true,
      skipReason: 'survivor_mode_off',
    }
  }

  const before = await prisma.survivorGameState.findUnique({
    where: { leagueId: ctx.leagueId },
    select: { phase: true, currentWeek: true },
  })

  const adv = await tryAutomaticPhaseAdvance(ctx.leagueId)

  const actions = []
  if (adv.advanced) {
    actions.push({
      actionType: 'survivor_phase_advance',
      metadata: { toPhase: adv.toPhase, reason: adv.reason },
    })
  }

  const events = []
  if (adv.advanced && adv.toPhase) {
    events.push({
      eventType: 'survivor_phase',
      title: `Survivor phase → ${adv.toPhase}`,
      description: adv.reason,
      payload: { from: before?.phase, to: adv.toPhase },
    })
  }

  return {
    summary: adv.advanced
      ? `Survivor: advanced to ${adv.toPhase} (${adv.reason})`
      : 'Survivor: no automatic phase change.',
    actions,
    events,
    phaseState: {
      currentPhase: adv.toPhase ?? before?.phase ?? undefined,
      currentWeekContext: before?.currentWeek ?? ctx.week ?? undefined,
    },
  }
}
