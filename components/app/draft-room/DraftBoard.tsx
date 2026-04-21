'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowLeftRight, ArrowRight, ChevronLeft, ChevronRight, Gavel } from 'lucide-react'
import { DraftBoardCell, type DraftBoardCellPick, type PickHighlightTone } from './DraftBoardCell'
import type { DraftPickSnapshot, SlotOrderEntry, TradedPickRecord } from '@/lib/live-draft-engine/types'
import type { KeeperSessionSnapshot } from '@/lib/live-draft-engine/types'
import { getSlotInRoundForOverall } from '@/lib/live-draft-engine/DraftOrderService'
import { resolvePickOwner } from '@/lib/live-draft-engine/PickOwnershipResolver'
import { getRoundNavigationState } from '@/lib/draft-room/DraftBoardRenderer'
import { getManagerColorBySlot, withAlpha } from '@/lib/draft-room'

export type DraftBoardProps = {
  picks: DraftPickSnapshot[]
  slotOrder: SlotOrderEntry[]
  tradedPicks?: TradedPickRecord[]
  teamCount: number
  rounds: number
  draftType: 'snake' | 'linear' | 'auction'
  thirdRoundReversal: boolean
  tradedPickColorMode?: boolean
  showNewOwnerInRed?: boolean
  keeperLocks?: KeeperSessionSnapshot['locks']
  devyRounds?: number[]
  c2cCollegeRounds?: number[]
  currentOverallPick?: number | null
  sport?: string
  currentUserRosterId?: string | null
  aiManagedRosterIds?: string[]
  orderSourceLabel?: string | null
  /** Open pick-trade modal from a cell with rounds / receiver prefilled (logged-in user must have a roster). */
  onCellTrade?: (ctx: {
    round: number
    ownerSlot: number
    ownerRosterId: string
    overall: number
  }) => void
  /** Open the read-only pick-trade history modal. */
  onOpenTradeHistory?: () => void
  /**
   * Open the trade-history modal with a specific row pre-focused. Parent
   * routes to PickTradeHistoryModal's `focusRound` / `focusOriginalRosterId`
   * props so the matching traded-pick row highlights and scrolls into view.
   */
  onViewCellTradeHistory?: (ctx: { round: number; originalRosterId: string }) => void
}

type SequentialBoardEntry = {
  round: number
  overall: number
  pick: DraftBoardCellPick
}

type AuctionBoardColumn = {
  rosterId: string
  slot: number
  displayName: string
  tintHex: string
  picks: DraftBoardCellPick[]
}

function isSnakeRoundReversed(round: number, draftType: 'snake' | 'linear' | 'auction', thirdRoundReversal: boolean): boolean {
  if (draftType !== 'snake') return false
  if (!thirdRoundReversal) return round % 2 === 0
  return round === 2 || round === 3 || (round >= 4 && round % 2 === 1)
}

function describeBoardMode(
  draftType: 'snake' | 'linear' | 'auction',
  thirdRoundReversal: boolean,
  orderSourceLabel?: string | null,
): string {
  if (draftType === 'auction') return 'Auction purchase board'
  if (thirdRoundReversal) {
    return orderSourceLabel ? `3RR snake | ${orderSourceLabel}` : '3RR snake'
  }
  if (draftType === 'linear') {
    return orderSourceLabel ? `Linear | ${orderSourceLabel}` : 'Linear'
  }
  return orderSourceLabel ? `Snake | ${orderSourceLabel}` : 'Snake'
}

function buildAuctionCellPick(
  pick: DraftPickSnapshot,
  tintHex: string,
  sport: string | undefined,
  ownerRosterId: string,
): DraftBoardCellPick {
  return {
    overall: pick.overall,
    round: pick.round,
    slot: pick.slot,
    pickLabel: `N${pick.overall}`,
    playerName: pick.playerName,
    position: pick.position,
    team: pick.team ?? null,
    playerId: pick.playerId ?? null,
    sport: sport ?? null,
    injuryStatus: null,
    byeWeek: pick.byeWeek ?? null,
    displayName: pick.displayName ?? null,
    tradedPickMeta: pick.tradedPickMeta ?? null,
    managerTintColor: tintHex,
    amount: pick.amount ?? null,
    source: pick.source,
    ownerRosterId,
  }
}

function DraftBoardInner({
  picks,
  slotOrder,
  tradedPicks = [],
  teamCount,
  rounds,
  draftType,
  thirdRoundReversal,
  tradedPickColorMode = false,
  showNewOwnerInRed = false,
  keeperLocks = [],
  devyRounds = [],
  c2cCollegeRounds = [],
  currentOverallPick = null,
  sport,
  currentUserRosterId = null,
  aiManagedRosterIds = [],
  orderSourceLabel,
  onCellTrade,
  onOpenTradeHistory,
  onViewCellTradeHistory,
}: DraftBoardProps) {
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all')
  const [selectedRound, setSelectedRound] = useState(1)
  const lastFollowedOverallRef = useRef<number | null>(null)

  useEffect(() => {
    setSelectedRound((prev) => Math.min(Math.max(1, prev), Math.max(1, rounds)))
  }, [rounds])

  /** After each new pick, focus the board on the current round (single-round view) for readability. */
  useEffect(() => {
    if (draftType === 'auction' || currentOverallPick == null) return
    const prev = lastFollowedOverallRef.current
    lastFollowedOverallRef.current = currentOverallPick
    if (prev === null) return
    if (currentOverallPick <= prev) return
    const round = Math.ceil(currentOverallPick / teamCount)
    setSelectedRound((r) => Math.min(rounds, Math.max(1, round)))
    setViewMode('single')
  }, [currentOverallPick, teamCount, rounds, draftType])

  const slotOrderBySlot = useMemo(() => new Map(slotOrder.map((entry) => [entry.slot, entry])), [slotOrder])
  const slotOrderByRosterId = useMemo(() => new Map(slotOrder.map((entry) => [entry.rosterId, entry])), [slotOrder])

  const pickHighlight = (existing: DraftPickSnapshot | undefined): PickHighlightTone => {
    const rid = existing?.rosterId
    if (!rid) return 'none'
    if (currentUserRosterId && rid === currentUserRosterId) return 'user'
    if (aiManagedRosterIds.length && aiManagedRosterIds.includes(rid)) return 'ai'
    return 'none'
  }

  const pickByKey = useMemo(() => {
    const map: Record<string, DraftPickSnapshot> = {}
    for (const pick of picks) {
      map[`${pick.round}-${pick.slot}`] = pick
    }
    return map
  }, [picks])

  const keeperByKey = useMemo(() => {
    const map: Record<string, (typeof keeperLocks)[number]> = {}
    for (const lock of keeperLocks) {
      map[`${lock.round}-${lock.slot}`] = lock
    }
    return map
  }, [keeperLocks])

  /** Per-round map of draft slot (column) → cell data. Columns match `orderedSlots` (slot 1…N left to right). */
  const boardRowsByRoundAndSlot = useMemo(() => {
    const totalPicks = rounds * teamCount
    const byRoundSlot: Record<number, Map<number, SequentialBoardEntry>> = {}

    for (let overall = 1; overall <= totalPicks; overall += 1) {
      const round = Math.ceil(overall / teamCount)
      const pickInRound = ((overall - 1) % teamCount) + 1
      const ownerSlot = getSlotInRoundForOverall({
        overall,
        teamCount,
        draftType,
        thirdRoundReversal,
      })
      const key = `${round}-${ownerSlot}`
      const existing = pickByKey[key]
      const lock = keeperByKey[key]
      const resolved = resolvePickOwner(round, ownerSlot, slotOrder, tradedPicks)
      const defaultOwner = slotOrderBySlot.get(ownerSlot) ?? null
      const ownerRosterId = resolved?.rosterId ?? defaultOwner?.rosterId ?? null
      const currentOwner = resolved?.rosterId ? (slotOrderByRosterId.get(resolved.rosterId) ?? null) : null
      const tintSlot = currentOwner?.slot ?? defaultOwner?.slot ?? ownerSlot
      const ownerColor = getManagerColorBySlot(tintSlot)
      const resolvedTradedMeta = (existing?.tradedPickMeta ?? resolved?.tradedPickMeta)
        ? {
            ...(existing?.tradedPickMeta ?? resolved?.tradedPickMeta),
            tintColor: (existing?.tradedPickMeta ?? resolved?.tradedPickMeta)?.tintColor ?? ownerColor.tintHex,
          }
        : null
      const source = String((existing as { source?: string | null } | undefined)?.source ?? '').toLowerCase()
      const isDevyRound = devyRounds.includes(round)
      const isCollegeRound = c2cCollegeRounds.includes(round)
      const c2cEnabled = c2cCollegeRounds.length > 0
      const isCollegePick = c2cEnabled && !!existing && (source === 'college' || isCollegeRound)
      const isProPick = c2cEnabled && !!existing && !isCollegePick
      const isDevyPick =
        !c2cEnabled &&
        (source === 'devy' ||
          source === 'college' ||
          (!!existing && isDevyRound && source !== 'promoted_devy'))
      const isPromotedFromDevy = source === 'promoted_devy'
      const useLock = !existing && lock

      if (!byRoundSlot[round]) byRoundSlot[round] = new Map()
      byRoundSlot[round]!.set(ownerSlot, {
        round,
        overall,
        pick: {
          overall,
          round,
          slot: ownerSlot,
          pickLabel: `${round}.${pickInRound}`,
          playerName: existing?.playerName ?? lock?.playerName ?? null,
          position: existing?.position ?? lock?.position ?? null,
          team: existing?.team ?? lock?.team ?? null,
          playerId: existing?.playerId ?? lock?.playerId ?? null,
          sport: sport ?? null,
          injuryStatus: (existing as { injuryStatus?: string | null } | undefined)?.injuryStatus ?? null,
          byeWeek: existing?.byeWeek ?? null,
          displayName: existing?.displayName ?? lock?.displayName ?? resolved?.displayName ?? null,
          tradedPickMeta: resolvedTradedMeta,
          managerTintColor: ownerColor.tintHex,
          amount: existing?.amount ?? null,
          isKeeper: useLock ?? undefined,
          isDevyPick: isDevyPick || undefined,
          isCollegePick: isCollegePick || undefined,
          isProPick: isProPick || undefined,
          isPromotedFromDevy: isPromotedFromDevy || undefined,
          source: source || undefined,
          ownerRosterId,
        },
      })
    }

    return byRoundSlot
  }, [
    rounds,
    teamCount,
    draftType,
    thirdRoundReversal,
    pickByKey,
    keeperByKey,
    slotOrder,
    tradedPicks,
    slotOrderBySlot,
    slotOrderByRosterId,
    devyRounds,
    c2cCollegeRounds,
    sport,
  ])

  const auctionColumns = useMemo(() => {
    if (draftType !== 'auction') return [] as AuctionBoardColumn[]

    return slotOrder
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => {
        const tintHex = getManagerColorBySlot(entry.slot).tintHex
        const ownedPicks = picks
          .filter((pick) => pick.rosterId === entry.rosterId)
          .sort((a, b) => a.overall - b.overall)
          .map((pick) => buildAuctionCellPick(pick, tintHex, sport, entry.rosterId))

        return {
          rosterId: entry.rosterId,
          slot: entry.slot,
          displayName: entry.displayName,
          tintHex,
          picks: ownedPicks,
        }
      })
  }, [draftType, picks, slotOrder, sport])

  const navigation = getRoundNavigationState(selectedRound, rounds)
  const orderedSlots = useMemo(
    () => slotOrder.slice().sort((a, b) => a.slot - b.slot),
    [slotOrder],
  )
  const visibleRounds =
    viewMode === 'single'
      ? [navigation.round]
      : Array.from({ length: rounds }, (_, index) => index + 1)

  const auctionMaxRows = useMemo(
    () => Math.max(1, ...auctionColumns.map((column) => column.picks.length)),
    [auctionColumns],
  )

  const boardModeLabel = describeBoardMode(draftType, thirdRoundReversal, orderSourceLabel)
  const currentRoundDirection =
    draftType === 'auction'
      ? 'Budgets and sold players update live during bidding.'
      : isSnakeRoundReversed(navigation.round, draftType, thirdRoundReversal)
        ? 'Owner flow reverses on this round.'
        : 'Owner flow runs in the original order on this round.'

  return (
    <section
      className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#060d1e]"
      data-testid="draft-board"
    >
      <div className="border-b border-white/8 px-3 py-2 text-xs text-white/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">Draft board</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">
              {boardModeLabel}
            </span>
            {tradedPicks.length > 0 ? (
              onOpenTradeHistory ? (
                <button
                  type="button"
                  onClick={onOpenTradeHistory}
                  data-testid="draft-board-open-trade-history"
                  className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100/90 transition hover:bg-amber-500/20"
                  title="View pick trade history"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  {tradedPicks.length} traded {tradedPicks.length === 1 ? 'pick' : 'picks'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100/85">
                  <ArrowLeftRight className="h-3 w-3" />
                  {tradedPicks.length} traded {tradedPicks.length === 1 ? 'pick' : 'picks'}
                </span>
              )
            ) : null}
            {draftType === 'auction' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100/85">
                <Gavel className="h-3 w-3" />
                {picks.length} sold
              </span>
            ) : null}
          </div>

          {draftType !== 'auction' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="draft-board-prev-round"
                onClick={() => setSelectedRound((prev) => Math.max(1, prev - 1))}
                disabled={!navigation.canGoPrev}
                className="rounded border border-white/15 bg-black/20 px-2 py-1 text-[10px] text-white/70 transition hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <select
                value={navigation.round}
                data-testid="draft-board-round-selector"
                onChange={(event) => setSelectedRound(Math.max(1, Number(event.target.value) || 1))}
                className="rounded border border-white/15 bg-black/30 px-2 py-1 text-[10px] text-white"
                aria-label="Draft board round selector"
              >
                {Array.from({ length: rounds }, (_, index) => index + 1).map((round) => (
                  <option key={round} value={round}>
                    Round {round}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="draft-board-next-round"
                onClick={() => setSelectedRound((prev) => Math.min(rounds, prev + 1))}
                disabled={!navigation.canGoNext}
                className="rounded border border-white/15 bg-black/20 px-2 py-1 text-[10px] text-white/70 transition hover:bg-white/10 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-testid="draft-board-toggle-view-mode"
                onClick={() => setViewMode((prev) => (prev === 'all' ? 'single' : 'all'))}
                className="rounded border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100 transition hover:bg-cyan-500/20"
              >
                {viewMode === 'all' ? 'Focus round' : 'All rounds'}
              </button>
              {currentOverallPick != null ? (
                <button
                  type="button"
                  data-testid="draft-board-jump-current"
                  onClick={() => {
                    const round = Math.ceil(currentOverallPick / teamCount)
                    setSelectedRound(Math.min(rounds, Math.max(1, round)))
                    setViewMode('single')
                  }}
                  className="rounded border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-100 transition hover:bg-emerald-500/20"
                >
                  Current
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="border-b border-white/8 px-3 py-1.5 text-[10px] text-white/45"
        data-testid="draft-board-round-label"
      >
        {draftType === 'auction'
          ? 'Purchases are grouped by manager and update as the bidding room resolves each nomination.'
          : viewMode === 'all'
            ? `All rounds (${rounds}) • ${currentRoundDirection}`
            : `${navigation.label} • ${currentRoundDirection}`}
      </div>

      {draftType === 'auction' ? (
        <div className="overflow-auto px-2 py-2">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, auctionColumns.length)}, minmax(136px, 1fr))` }}
          >
            {auctionColumns.map((column) => (
              <section
                key={column.rosterId}
                className="overflow-hidden rounded-xl border bg-[#0a1227]"
                style={{
                  borderColor: withAlpha(column.tintHex, 0.22),
                  backgroundColor: withAlpha(column.tintHex, 0.05),
                }}
              >
                <div
                  className="border-b px-2 py-2"
                  style={{ borderColor: withAlpha(column.tintHex, 0.18) }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/38">
                      Slot {column.slot}
                    </span>
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: withAlpha(column.tintHex, 0.95) }}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{column.displayName}</p>
                </div>

                <div className="space-y-1.5 p-1.5">
                  {Array.from({ length: auctionMaxRows }, (_, index) => {
                    const pick = column.picks[index]
                    if (!pick) {
                      return (
                        <div
                          key={`${column.rosterId}-open-${index + 1}`}
                          className="flex min-h-[60px] items-end rounded-lg border border-white/8 bg-[#11192d] px-2 py-1.5 text-[10px] text-white/22"
                        >
                          Open slot {index + 1}
                        </div>
                      )
                    }

                    const existing = picks.find((entry) => entry.overall === pick.overall)
                    return (
                      <DraftBoardCell
                        key={pick.overall}
                        pick={pick}
                        isEmpty={false}
                        tradedPickColorMode={tradedPickColorMode}
                        showNewOwnerInRed={showNewOwnerInRed}
                        pickHighlight={pickHighlight(existing)}
                        onTradeFromCell={
                          currentUserRosterId && onCellTrade && pick.ownerRosterId && typeof pick.slot === 'number'
                            ? () =>
                                onCellTrade({
                                  round: pick.round,
                                  ownerSlot: pick.slot,
                                  ownerRosterId: pick.ownerRosterId ?? '',
                                  overall: pick.overall,
                                })
                            : undefined
                        }
                        onViewTradeHistory={
                          onViewCellTradeHistory && pick.tradedPickMeta?.originalRosterId
                            ? () =>
                                onViewCellTradeHistory({
                                  round: pick.round,
                                  originalRosterId: pick.tradedPickMeta!.originalRosterId!,
                                })
                            : undefined
                        }
                      />
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-auto px-2 py-2">
          <div className="min-w-max">
            <div
              className="sticky top-0 z-10 grid gap-1 border-b border-white/10 bg-[#070f24]/95 pb-1 backdrop-blur-sm sm:gap-1.5"
              style={{ gridTemplateColumns: `56px repeat(${teamCount}, minmax(104px, 1fr))` }}
              data-testid="draft-board-team-header"
            >
              <div className="flex h-8 items-center justify-center rounded-md border border-white/10 bg-[#0a1228] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Rd
              </div>
              {orderedSlots.map((entry) => (
                <div
                  key={entry.rosterId}
                  className="flex h-8 min-w-0 items-center rounded-md border border-white/10 bg-[#0a1228] px-2"
                >
                  <span className="mr-1 shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">
                    {entry.slot}
                  </span>
                  <span className="truncate text-[10px] font-medium text-white/72" title={entry.displayName}>
                    {entry.displayName}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-1.5">
              {visibleRounds.map((round) => (
                <section key={round} data-testid={`draft-board-round-${round}`}>
                  <div
                    className="grid gap-1 sm:gap-1.5"
                    style={{ gridTemplateColumns: `56px repeat(${teamCount}, minmax(104px, 1fr))` }}
                  >
                    {(() => {
                      const reversed = isSnakeRoundReversed(round, draftType, thirdRoundReversal)
                      const isSnake = draftType === 'snake'
                      return (
                        <div
                          className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border border-white/12 bg-[#0a1228] text-[10px] text-white/70 sm:min-h-[56px]"
                          title={
                            isSnake
                              ? reversed
                                ? 'Snake direction: reversed (right → left)'
                                : 'Snake direction: forward (left → right)'
                              : 'Linear order (left → right)'
                          }
                          data-testid={`draft-board-round-${round}-direction`}
                          data-direction={reversed ? 'reverse' : 'forward'}
                        >
                          <span className="font-semibold uppercase tracking-[0.14em]">R{round}</span>
                          {reversed ? (
                            <ArrowLeft className="h-3 w-3 text-amber-300/80" aria-label="reverse" />
                          ) : (
                            <ArrowRight className="h-3 w-3 text-cyan-300/80" aria-label="forward" />
                          )}
                        </div>
                      )
                    })()}

                    {orderedSlots.map((slotEntry) => {
                      const cell = boardRowsByRoundAndSlot[round]?.get(slotEntry.slot)
                      if (!cell) {
                        return (
                          <div
                            key={`${round}-${slotEntry.slot}-missing`}
                            className="min-h-[52px] rounded-md border border-red-500/20 bg-red-500/5 sm:min-h-[56px]"
                            title="Missing cell data for this slot"
                          />
                        )
                      }
                      const { pick, overall } = cell
                      const existing = picks.find((entry) => entry.overall === overall)
                      const isCurrentPick = currentOverallPick != null && overall === currentOverallPick
                      const emptyCellDirection =
                        draftType === 'snake' && isSnakeRoundReversed(round, draftType, thirdRoundReversal)
                          ? 'reverse'
                          : 'forward'

                      return (
                        <DraftBoardCell
                          key={`${round}-${slotEntry.slot}`}
                          pick={pick}
                          isEmpty={!pick.playerName}
                          isCurrentPick={isCurrentPick}
                          tradedPickColorMode={tradedPickColorMode}
                          showNewOwnerInRed={showNewOwnerInRed}
                          isDevyRound={devyRounds.includes(round) && !pick.playerName}
                          isCollegeRound={c2cCollegeRounds.includes(round) && !pick.playerName}
                          pickHighlight={isCurrentPick ? 'none' : pickHighlight(existing)}
                          emptyCellDirection={emptyCellDirection}
                          onTradeFromCell={
                            currentUserRosterId && onCellTrade && pick.ownerRosterId && typeof pick.slot === 'number'
                              ? () =>
                                  onCellTrade({
                                    round: pick.round,
                                    ownerSlot: pick.slot,
                                    ownerRosterId: pick.ownerRosterId ?? '',
                                    overall: pick.overall,
                                  })
                              : undefined
                          }
                          onViewTradeHistory={
                            onViewCellTradeHistory && pick.tradedPickMeta?.originalRosterId
                              ? () =>
                                  onViewCellTradeHistory({
                                    round: pick.round,
                                    originalRosterId: pick.tradedPickMeta!.originalRosterId!,
                                  })
                              : undefined
                          }
                        />
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export const DraftBoard = React.memo(DraftBoardInner)
