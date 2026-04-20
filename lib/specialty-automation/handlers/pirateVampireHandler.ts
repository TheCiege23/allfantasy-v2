import { loadSpecialtyMetadataSnapshot } from '@/lib/specialty-automation/syncMetadata'
import { planLeagueEvent } from '@/lib/specialty-automation/actionPlans'
import { getConceptExtensions, notApplicableTrigger } from '@/lib/specialty-automation/conceptHandlerUtils'
import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'

const ALLOWED = new Set([
  'onManualRun',
  'onScheduledPass',
  'onWeekFinalized',
  'onWaiverProcessed',
  'onPhaseTransition',
])

/**
 * Pirate / Vampire — conversion & theft rules live in domain services; automation records checkpoints from conceptRules.extensions.
 */
export async function runPirateVampireHandler(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ALLOWED.has(ctx.trigger)) {
    return notApplicableTrigger(ctx, 'Pirate/Vampire')
  }

  const meta = await loadSpecialtyMetadataSnapshot('pirate_vampire', ctx)
  const ext = getConceptExtensions(ctx)
  const theftOnWaivers = ext.theftOnWaiversProcessed === true

  const events = []
  if (theftOnWaivers && ctx.trigger === 'onWaiverProcessed') {
    events.push(
      planLeagueEvent(
        'pirate_vampire_checkpoint',
        'Pirate/Vampire — waiver checkpoint',
        'Evaluate conversion rules after waiver processing.',
        { week: ctx.week },
      ),
    )
  }

  if (ctx.trigger === 'onManualRun' || ctx.trigger === 'onScheduledPass') {
    events.push(planLeagueEvent('pirate_vampire_sync', 'Pirate/Vampire — rules sync', undefined, ext))
  }

  return {
    summary: 'Pirate/Vampire automation checkpoint recorded.',
    actions: [
      {
        actionType: 'pirate_vampire_rule_eval',
        metadata: { extensions: ext, week: ctx.week },
      },
    ],
    events,
    phaseState: {
      currentPhase: 'roleplay',
      currentWeekContext: ctx.week ?? undefined,
      metadata: meta,
    },
  }
}
