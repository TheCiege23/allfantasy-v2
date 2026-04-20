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

/** King of the Hill — champion/challenger cadence from conceptRules.extensions. */
export async function runKingOfTheHillHandler(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ALLOWED.has(ctx.trigger)) {
    return notApplicableTrigger(ctx, 'King of the Hill')
  }

  const meta = await loadSpecialtyMetadataSnapshot('king_of_the_hill', ctx)
  const ext = getConceptExtensions(ctx)
  const defenseCadenceWeeks =
    typeof ext.defenseCadenceWeeks === 'number' ? ext.defenseCadenceWeeks : null

  const events = []
  if (ctx.week != null && defenseCadenceWeeks != null && ctx.week % defenseCadenceWeeks === 0) {
    events.push(
      planLeagueEvent(
        'koth_title_defense',
        'King of the Hill — title defense week',
        'Challenger cycle per conceptRules.',
        { week: ctx.week },
      ),
    )
  }

  if (ctx.trigger === 'onManualRun' || ctx.trigger === 'onScheduledPass') {
    events.push(planLeagueEvent('koth_sync', 'King of the Hill — state sync', undefined, ext))
  }

  return {
    summary: 'King of the Hill checkpoint recorded.',
    actions: [{ actionType: 'koth_cycle_eval', metadata: { extensions: ext, week: ctx.week } }],
    events,
    phaseState: {
      currentPhase: 'koth',
      currentWeekContext: ctx.week ?? undefined,
      metadata: { ...meta, extensions: ext },
    },
  }
}
