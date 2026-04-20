import type { HandlerContext, HandlerResult } from '@/lib/specialty-automation/types'

/** No-op for standard redraft/keeper/dynasty without specialty concept. */
export async function runStandardHandler(ctx: HandlerContext): Promise<HandlerResult> {
  return {
    summary: 'No specialty concept — nothing to automate.',
    actions: [],
    events: [],
    skipped: true,
    skipReason: 'standard_league',
  }
}
