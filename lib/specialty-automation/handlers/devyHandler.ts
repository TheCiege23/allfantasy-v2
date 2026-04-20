import { loadSpecialtyMetadataSnapshot } from '@/lib/specialty-automation/syncMetadata'
import { planLeagueEvent } from '@/lib/specialty-automation/actionPlans'
import { getConceptExtensions, notApplicableTrigger } from '@/lib/specialty-automation/conceptHandlerUtils'
import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'

const ALLOWED = new Set([
  'onManualRun',
  'onScheduledPass',
  'onWeekFinalized',
  'onDraftCompleted',
  'onWaiverProcessed',
])

export async function runDevyHandler(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ALLOWED.has(ctx.trigger)) {
    return notApplicableTrigger(ctx, 'Devy')
  }

  const meta = await loadSpecialtyMetadataSnapshot('devy', ctx)
  const ext = getConceptExtensions(ctx)
  const promotionWeek =
    typeof ext.devyPromotionWeek === 'number'
      ? ext.devyPromotionWeek
      : typeof ext.promotionWeek === 'number'
        ? ext.promotionWeek
        : null

  const events = []
  if (
    promotionWeek != null &&
    ctx.week != null &&
    ctx.week === promotionWeek &&
    (ctx.trigger === 'onWeekFinalized' || ctx.trigger === 'onManualRun')
  ) {
    events.push(
      planLeagueEvent(
        'devy_promotion_window',
        'Devy promotion checkpoint',
        'Review promotion eligibility per devy rules.',
        { week: ctx.week, promotionWeek },
      ),
    )
  }

  if (ctx.trigger === 'onManualRun' || ctx.trigger === 'onScheduledPass') {
    events.push(planLeagueEvent('devy_state_sync', 'Devy — state sync', undefined, meta))
  }

  return {
    summary: 'Devy specialty metadata synchronized.',
    actions: [{ actionType: 'specialty_metadata_sync', metadata: { ...meta, promotionWeek } }],
    events,
    phaseState: {
      currentPhase: 'devy',
      currentWeekContext: ctx.week ?? undefined,
      metadata: meta,
    },
  }
}
