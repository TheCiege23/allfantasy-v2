/**
 * Client-side fallback for Chimmy intel `picksUntilUser` when SSE / idle intel has not hydrated yet.
 * Mirrors `DraftLookaheadService` math using the live session snapshot.
 */

import type { DraftSessionSnapshot } from '@/lib/live-draft-engine/types'
import { resolveEffectiveCurrentPick } from '@/lib/live-draft-engine/draftRoomCoreState'
import { getSlotInRoundForOverall } from '@/lib/live-draft-engine/DraftOrderService'
import { resolvePickOwner } from '@/lib/live-draft-engine/PickOwnershipResolver'

export function computePicksUntilViewerTurn(
  session: DraftSessionSnapshot,
  viewerRosterId: string | null | undefined,
): number | null {
  const rid = typeof viewerRosterId === 'string' ? viewerRosterId.trim() : ''
  if (!rid) return null

  const cp = resolveEffectiveCurrentPick(session)
  const currentOverall = cp?.overall ?? null
  if (currentOverall == null) return null

  const total = session.teamCount * session.rounds
  const traded = Array.isArray(session.tradedPicks) ? session.tradedPicks : []

  let userNextOverall: number | null = null
  for (let overall = currentOverall; overall <= total; overall += 1) {
    const round = Math.ceil(overall / session.teamCount)
    const slot = getSlotInRoundForOverall({
      overall,
      teamCount: session.teamCount,
      draftType: session.draftType,
      thirdRoundReversal: session.thirdRoundReversal,
    })
    const owner = resolvePickOwner(round, slot, session.slotOrder, traded)
    if (owner?.rosterId === rid) {
      userNextOverall = overall
      break
    }
  }

  if (userNextOverall == null) return null
  return Math.max(0, userNextOverall - currentOverall)
}
