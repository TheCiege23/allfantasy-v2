import { loadSpecialtyMetadataSnapshot } from '@/lib/specialty-automation/syncMetadata'
import { planLeagueEvent } from '@/lib/specialty-automation/actionPlans'
import { notApplicableTrigger } from '@/lib/specialty-automation/conceptHandlerUtils'
import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'

const ALLOWED = new Set([
  'onManualRun',
  'onScheduledPass',
  'onWeekFinalized',
  'onStandingsUpdated',
  'onWaiverProcessed',
])

export async function runC2CHandler(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ALLOWED.has(ctx.trigger)) {
    return notApplicableTrigger(ctx, 'C2C')
  }

  const meta = await loadSpecialtyMetadataSnapshot('c2c', ctx)
  const events = []
  if (ctx.trigger === 'onManualRun' || ctx.trigger === 'onScheduledPass') {
    events.push(
      planLeagueEvent(
        'c2c_state_sync',
        'College ↔ Pro (C2C) — state sync',
        'Linked campus/canton structures refreshed.',
        meta,
      ),
    )
  }

  return {
    summary: meta.c2c ? 'C2C league row synchronized.' : 'C2C: no C2C league row — metadata only.',
    actions: [{ actionType: 'specialty_metadata_sync', metadata: meta }],
    events,
    phaseState: {
      currentPhase: 'c2c',
      currentWeekContext: ctx.week ?? undefined,
      metadata: meta,
    },
  }
}
