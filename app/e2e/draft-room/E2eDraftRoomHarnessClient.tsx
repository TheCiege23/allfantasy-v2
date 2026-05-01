'use client'

import { DraftBoard } from '@/components/draft/DraftBoard'

/**
 * Playwright / local QA harness: mounts the same live draft stack as production snake routes
 * (`DraftBoard` → `DraftRoomPageClient` → shell, top bar, queue, chat, War Room).
 *
 * Uses `data-testid="e2e-draft-room-harness"` so Playwright health checks can assert
 * the harness mounted before opening the room.
 */
export function E2eDraftRoomHarnessClient({
  draftId,
  leagueId,
  leagueName,
  sport,
  isDynasty,
  isCommissioner,
  presentationVariant,
  harnessStatus,
}: {
  draftId: string
  leagueId: string
  leagueName: string
  sport: string
  isDynasty: boolean
  isCommissioner: boolean
  presentationVariant?: 'default' | 'redraft_snake'
  harnessStatus?: string
}) {
  return (
    <div
      className={
        presentationVariant === 'redraft_snake'
          ? 'min-h-screen bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,rgba(34,211,238,0.08),transparent_50%)]'
          : 'min-h-screen'
      }
      data-testid="e2e-draft-room-harness"
      data-harness-status={harnessStatus ?? ''}
      data-harness-commissioner={isCommissioner ? '1' : '0'}
    >
      <DraftBoard
        kind="live"
        draftId={draftId}
        leagueId={leagueId}
        leagueName={leagueName}
        sport={sport}
        isDynasty={isDynasty}
        isCommissioner={isCommissioner}
        presentationVariant={presentationVariant}
      />
    </div>
  )
}
