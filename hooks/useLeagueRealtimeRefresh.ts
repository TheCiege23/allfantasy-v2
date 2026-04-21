'use client'

import { useLeagueEventStream } from '@/hooks/useLeagueEventStream'
import { dispatchStateRefreshEvent } from '@/lib/state-consistency/state-events'
import type { LeagueRealtimeEnvelope } from '@/lib/league-events/realtime-store'

/**
 * SSE league stream + global client refresh so draft/trade/waiver UIs stay in sync without full page reload.
 */
export function useLeagueRealtimeRefresh(
  leagueId: string | undefined,
  onEnvelope?: (env: LeagueRealtimeEnvelope) => void,
) {
  useLeagueEventStream(leagueId, (env) => {
    dispatchStateRefreshEvent({
      domain: 'leagues',
      leagueId,
      reason: env.eventType,
      source: 'league_sse',
    })
    const t = String(env.eventType ?? '')
    if (t.startsWith('draft_') || t.includes('draft')) {
      dispatchStateRefreshEvent({
        domain: 'drafts',
        leagueId,
        reason: env.eventType,
        source: 'league_sse',
      })
    }
    const shouldRefreshNotifications =
      t.startsWith('trade_') ||
      t.startsWith('waiver_') ||
      t.startsWith('draft_') ||
      t.startsWith('af_trade') ||
      t.includes('score') ||
      t.includes('matchup') ||
      t.includes('lineup') ||
      t.includes('injury') ||
      t.includes('playoff') ||
      t.includes('standings')
    if (shouldRefreshNotifications) {
      dispatchStateRefreshEvent({
        domain: 'notifications',
        leagueId,
        reason: env.eventType,
        source: 'league_sse',
      })
    }
    onEnvelope?.(env)
  })
}
