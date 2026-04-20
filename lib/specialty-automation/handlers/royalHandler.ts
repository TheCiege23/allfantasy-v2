import { loadSpecialtyMetadataSnapshot } from '@/lib/specialty-automation/syncMetadata'
import { planLeagueEvent } from '@/lib/specialty-automation/actionPlans'
import { getConceptExtensions, notApplicableTrigger } from '@/lib/specialty-automation/conceptHandlerUtils'
import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'

const ALLOWED = new Set([
  'onManualRun',
  'onScheduledPass',
  'onWeekFinalized',
  'onStandingsUpdated',
  'onPhaseTransition',
])

/** Royal — multisport combined championship checkpoints (rules in extensions). */
export async function runRoyalHandler(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ALLOWED.has(ctx.trigger)) {
    return notApplicableTrigger(ctx, 'Royal')
  }

  const meta = await loadSpecialtyMetadataSnapshot('royal', ctx)
  const ext = getConceptExtensions(ctx)
  const events = []

  if (ctx.trigger === 'onStandingsUpdated' || ctx.trigger === 'onWeekFinalized') {
    events.push(
      planLeagueEvent(
        'royal_multisport_checkpoint',
        'Royal — multisport standings checkpoint',
        'Combined progression evaluated per conceptRules.',
        { week: ctx.week, season: ctx.season },
      ),
    )
  }

  if (ctx.trigger === 'onManualRun' || ctx.trigger === 'onScheduledPass') {
    events.push(planLeagueEvent('royal_sync', 'Royal — state sync', undefined, ext))
  }

  return {
    summary: 'Royal format checkpoint recorded.',
    actions: [{ actionType: 'royal_multisport_eval', metadata: { extensions: ext } }],
    events,
    phaseState: {
      currentPhase: 'royal',
      currentWeekContext: ctx.week ?? undefined,
      metadata: { ...meta, extensions: ext },
    },
  }
}
