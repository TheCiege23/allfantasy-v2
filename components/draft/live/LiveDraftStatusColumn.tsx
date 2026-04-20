'use client'

import type { DraftSessionSnapshot, QueueEntry } from '@/lib/live-draft-engine/types'
import { CommissionerDraftControls } from './CommissionerDraftControls'
import { DraftQueue } from './DraftQueue'
import { DraftTeamSidebar } from './DraftTeamSidebar'
import { DraftTimer } from './DraftTimer'
import { OnTheClockPanel } from './OnTheClockPanel'
import { PickHistory } from './PickHistory'
import { AvailablePlayerPool } from './AvailablePlayerPool'
import type { NormalizedDraftEntry } from '@/lib/draft-sports-models/types'

export type LiveDraftStatusColumnProps = {
  session: DraftSessionSnapshot
  queueEntries: QueueEntry[]
  leagueId: string
  isCommissioner: boolean
  onSessionUpdated?: () => void
  /** First rows from the normalized pool for quick-add (optional). */
  poolPreview?: NormalizedDraftEntry[] | null
  onPoolPreviewSelect?: (playerId: string) => void
  poolSelectDisabled?: boolean
  /** Hide duplicate timer when parent already shows auction spotlight, etc. */
  showTimer?: boolean
}

export function LiveDraftStatusColumn({
  session,
  queueEntries,
  leagueId,
  isCommissioner,
  onSessionUpdated,
  poolPreview,
  onPoolPreviewSelect,
  poolSelectDisabled,
  showTimer = true,
}: LiveDraftStatusColumnProps) {
  const onClockId = session.currentPick?.rosterId ?? null
  const poolRows =
    poolPreview?.slice(0, 40).map((e) => ({
      id: e.display?.playerId ?? e.playerId ?? e.name,
      name: e.name,
      position: e.position,
      team: e.team,
    })) ?? []

  return (
    <div
      className="flex flex-col gap-2 lg:min-w-[260px] lg:max-w-[min(340px,32vw)]"
      data-testid="draft-live-status-column"
    >
      <OnTheClockPanel status={session.status} currentPick={session.currentPick} />
      {showTimer ? <DraftTimer timer={session.timer} /> : null}
      <DraftTeamSidebar slotOrder={session.slotOrder} onClockRosterId={onClockId} />
      <PickHistory picks={session.picks ?? []} max={20} />
      <DraftQueue entries={queueEntries} />
      {poolRows.length > 0 ? (
        <AvailablePlayerPool
          players={poolRows}
          onSelect={onPoolPreviewSelect}
          disabled={poolSelectDisabled}
        />
      ) : null}
      {isCommissioner ? (
        <CommissionerDraftControls
          leagueId={leagueId}
          disabled={session.status === 'completed'}
          onSessionUpdated={onSessionUpdated}
        />
      ) : null}
    </div>
  )
}
