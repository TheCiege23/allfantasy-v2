import 'server-only'

import { recordAfLearningEvent } from '@/lib/ai-learning-system/recordEvent'
import { resolveLeagueSport } from '@/lib/ai-learning-system/resolveLeagueSport'

export type TradeOutcomeEventType = 'trade_accepted' | 'trade_rejected' | 'trade_vetoed'

/**
 * Records the same trade outcome once per manager so user-level aggregates stay attributable.
 */
export async function recordTradeOutcomeForBothManagers(args: {
  leagueId: string
  eventType: TradeOutcomeEventType
  proposerUserId: string | null | undefined
  receiverUserId: string | null | undefined
  payload: Record<string, unknown>
}): Promise<void> {
  const proposer = args.proposerUserId?.trim()
  const receiver = args.receiverUserId?.trim()
  if (!proposer || !receiver) return

  const sport = await resolveLeagueSport(args.leagueId)
  const base = { ...args.payload, leagueId: args.leagueId }

  await Promise.all([
    recordAfLearningEvent({
      eventType: args.eventType,
      sport,
      leagueId: args.leagueId,
      userId: proposer,
      source: 'trade_flow',
      payload: { ...base, role: 'proposer' },
    }),
    recordAfLearningEvent({
      eventType: args.eventType,
      sport,
      leagueId: args.leagueId,
      userId: receiver,
      source: 'trade_flow',
      payload: { ...base, role: 'receiver' },
    }),
  ])
}
