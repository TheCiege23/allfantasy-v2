'use client'

import type { DraftPickSnapshot, DraftSessionSnapshot, QueueEntry } from '@/lib/live-draft-engine/types'
import { getUpcomingPickOwners } from '@/lib/live-draft-engine/DraftOrderService'
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
  /**
   * When true (live snake), hide the full scrollable draft-order list — the board + top bar
   * already show order. Linear and auction keep the list for orientation.
   */
  hideFullDraftOrderList?: boolean
  /** Logged-in user’s roster id — enables “My roster” summary when set. */
  viewerRosterId?: string | null
  /** Picks for the viewer’s roster (pre-filtered). */
  viewerRosterPicks?: DraftPickSnapshot[]
}

function pickIndexInRound(overall: number, teamCount: number): number {
  if (teamCount < 1) return 1
  return ((overall - 1) % teamCount) + 1
}

function CurrentPickMeta({ session }: { session: DraftSessionSnapshot }) {
  const cp = session.currentPick
  if (!cp || session.status === 'completed') return null
  const pir = pickIndexInRound(cp.overall, session.teamCount)
  return (
    <div
      className="rounded-xl border border-white/[0.08] bg-[#0a1228]/80 px-2.5 py-1.5 text-center"
      data-testid="draft-live-current-pick-meta"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Round and pick</p>
      <p className="mt-1 text-[12px] leading-snug text-white/80">
        Round <span className="font-semibold text-cyan-100/90">{cp.round}</span>
        <span className="text-white/35"> · </span>
        Pick <span className="font-semibold text-cyan-100/90">{pir}</span>
        <span className="text-white/45"> / {session.teamCount}</span>
      </p>
      <p className="mt-1 font-mono text-[11px] text-white/45">Overall #{cp.overall}</p>
    </div>
  )
}

function UpcomingOnDeck({ session }: { session: DraftSessionSnapshot }) {
  const cp = session.currentPick
  if (!cp || session.status === 'completed' || session.status === 'pre_draft') return null
  const totalPicks = session.rounds * session.teamCount
  const nextOverall = cp.overall + 1
  if (nextOverall > totalPicks) {
    return (
      <div
        className="rounded-2xl border border-white/[0.08] bg-[#070d18]/90 px-2.5 py-2 text-center text-[12px] text-white/45"
        data-testid="draft-upcoming-on-deck"
      >
        Final pick approaching
      </div>
    )
  }
  const upcoming = getUpcomingPickOwners(
    nextOverall,
    4,
    session.teamCount,
    session.draftType,
    session.thirdRoundReversal,
    session.slotOrder,
    totalPicks,
  )
  if (upcoming.length === 0) return null
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#070d18]/90" data-testid="draft-upcoming-on-deck">
      <div className="border-b border-white/[0.06] px-2.5 py-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">Next up</p>
      </div>
      <ol className="space-y-1 px-2.5 py-1.5">
        {upcoming.map((u, i) => (
          <li
            key={`${u.rosterId}-${i}`}
            className="flex items-center justify-between gap-2 text-[12px] text-white/88"
          >
            <span className="shrink-0 font-medium text-cyan-100/90">Team {u.slot}</span>
            <span className="min-w-0 flex-1 truncate text-right text-white/75">{u.displayName}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function MyRosterSidebarSummary({
  picks,
  rounds,
  hasRoster,
}: {
  picks: DraftPickSnapshot[]
  rounds: number
  hasRoster: boolean
}) {
  if (!hasRoster) return null
  const recent = picks.slice(-4).reverse()
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#070d18]/90" data-testid="draft-sidebar-my-roster">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">My roster</p>
        <p className="text-[12px] text-cyan-100/90">
          {picks.length} / {rounds} picks
        </p>
      </div>
      {recent.length === 0 ? (
        <p className="px-3 py-3 text-center text-[12px] text-white/38">No picks yet</p>
      ) : (
        <ul className="max-h-[200px] divide-y divide-white/[0.05] overflow-y-auto">
          {recent.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2 px-3 py-2 text-[11px]">
              <span className="shrink-0 font-mono text-cyan-300/70">{p.pickLabel}</span>
              <span className="min-w-0 flex-1 text-right">
                <span className="font-medium text-white/90">{p.playerName}</span>
                <span className="text-white/45">
                  {' '}
                  {p.position}
                  {p.team ? ` · ${p.team}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
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
  hideFullDraftOrderList = false,
  viewerRosterId = null,
  viewerRosterPicks = [],
}: LiveDraftStatusColumnProps) {
  const onClockId = session.currentPick?.rosterId ?? null
  const poolRows =
    poolPreview?.slice(0, 40).map((e) => ({
      id: e.display?.playerId ?? e.playerId ?? e.name,
      name: e.name,
      position: e.position,
      team: e.team,
    })) ?? []

  const showSnakeCompact = hideFullDraftOrderList && session.draftType === 'snake'

  return (
    <div
      className="flex flex-col gap-1.5 lg:min-w-[260px] lg:max-w-[min(340px,32vw)]"
      data-testid="draft-live-status-column"
    >
      {showSnakeCompact ? <CurrentPickMeta session={session} /> : null}
      <OnTheClockPanel status={session.status} currentPick={session.currentPick} />
      {showTimer ? <DraftTimer timer={session.timer} /> : null}

      {showSnakeCompact ? <UpcomingOnDeck session={session} /> : null}

      {!showSnakeCompact ? (
        <DraftTeamSidebar slotOrder={session.slotOrder} onClockRosterId={onClockId} />
      ) : null}

      <PickHistory picks={session.picks ?? []} max={20} />

      {showSnakeCompact ? (
        <MyRosterSidebarSummary
          picks={viewerRosterPicks}
          rounds={session.rounds}
          hasRoster={Boolean(viewerRosterId)}
        />
      ) : null}

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
