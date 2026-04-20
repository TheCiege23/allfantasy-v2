/**
 * Structured payloads for activity feed / chat (waiver results already flow through onWaiverRunComplete).
 */

import type { ProcessedClaimResult } from './types'

export type WaiverChatEventPayload = {
  type: 'waiver_result'
  leagueId: string
  claimId: string
  rosterId: string
  success: boolean
  addPlayerId: string
  dropPlayerId?: string | null
  message?: string
  faabSpent?: number | null
}

export function buildWaiverResultChatPayload(
  leagueId: string,
  r: ProcessedClaimResult
): WaiverChatEventPayload {
  return {
    type: 'waiver_result',
    leagueId,
    claimId: r.claimId,
    rosterId: r.rosterId,
    success: r.success,
    addPlayerId: r.addPlayerId,
    dropPlayerId: r.dropPlayerId ?? null,
    message: r.message,
    faabSpent: r.faabSpent ?? null,
  }
}
