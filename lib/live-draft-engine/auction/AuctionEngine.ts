/**
 * Auction draft engine — deterministic nomination, bidding, timer, budget, roster validation.
 * No AI required for core mechanics. Supports all sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER).
 */

import { prisma } from '@/lib/prisma'
import { getAuctionMaxBid, canPlaceAuctionBid } from '@/lib/mock-draft/draft-engine'
import type {
  AuctionState,
  AuctionBudgets,
  AuctionNomination,
  SlotOrderEntry,
  DraftSessionSnapshot,
} from '@/lib/live-draft-engine/types'
import { computeTimerEndAt } from '@/lib/live-draft-engine/DraftTimerService'
import { formatPickLabel } from '@/lib/live-draft-engine/DraftOrderService'

const DEFAULT_BUDGET = 200
const DEFAULT_MIN_BID = 1
const DEFAULT_MIN_INCREMENT = 1
const DEFAULT_BID_TIMER_SECONDS = 35

export interface AuctionConfig {
  budgetPerTeam: number
  minBid: number
  minBidIncrement: number
  bidTimerSeconds: number
}

export function getAuctionConfigFromSession(session: {
  auctionBudgetPerTeam?: number | null
  timerSeconds?: number | null
}): AuctionConfig {
  return {
    budgetPerTeam: session.auctionBudgetPerTeam ?? DEFAULT_BUDGET,
    minBid: DEFAULT_MIN_BID,
    minBidIncrement: DEFAULT_MIN_INCREMENT,
    bidTimerSeconds: session.timerSeconds ?? DEFAULT_BID_TIMER_SECONDS,
  }
}

export function getAuctionStateFromSession(session: {
  auctionState?: unknown
}): AuctionState | null {
  const raw = session.auctionState
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    nominationOrderIndex: Number(o.nominationOrderIndex ?? 0),
    currentNomination: (o.currentNomination as AuctionNomination) ?? null,
    currentBid: Number(o.currentBid ?? 0),
    currentBidderRosterId: (o.currentBidderRosterId as string) ?? null,
    bidTimerEndAt: (o.bidTimerEndAt as string) ?? null,
    minNextBid: Number(o.minNextBid ?? 0),
  }
}

export function getBudgetsFromSession(session: {
  auctionBudgetPerTeam?: number | null
  auctionBudgets?: unknown
  slotOrder?: unknown
}): AuctionBudgets {
  const slotOrder = (session.slotOrder as unknown as SlotOrderEntry[] | undefined) ?? []
  const defaultBudget = session.auctionBudgetPerTeam ?? DEFAULT_BUDGET
  const raw = session.auctionBudgets
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as AuctionBudgets
  }
  const budgets: AuctionBudgets = {}
  for (const entry of slotOrder) {
    budgets[entry.rosterId] = defaultBudget
  }
  return budgets
}

/** Who is the current nominator (0-based index into slotOrder). */
export function getCurrentNominatorIndex(auctionState: AuctionState | null): number {
  return auctionState?.nominationOrderIndex ?? 0
}

/** Minimum next bid for current auction. */
export function getMinNextBid(auctionState: AuctionState | null, minIncrement: number): number {
  if (!auctionState) return DEFAULT_MIN_BID
  const current = auctionState.currentBid ?? 0
  if (current <= 0) return DEFAULT_MIN_BID
  return current + minIncrement
}

/**
 * Nominate a player (put on the block). Resets bid to min, starts bid timer.
 * Caller must be the current nominator.
 */
export async function nominatePlayer(
  leagueId: string,
  nomination: AuctionNomination,
  nominatorRosterId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'asc' } } },
  })
  if (!session || session.draftType !== 'auction') {
    return { success: false, error: 'Auction session not found' }
  }
  if (session.status !== 'in_progress' && session.status !== 'paused') {
    return { success: false, error: 'Draft is not in progress' }
  }

  const slotOrder = (session.slotOrder as unknown as SlotOrderEntry[]) ?? []
  const state = getAuctionStateFromSession(session)
  const config = getAuctionConfigFromSession(session)
  const nominationIndex = state?.nominationOrderIndex ?? 0
  const currentNominator = slotOrder[nominationIndex]
  if (!currentNominator || currentNominator.rosterId !== nominatorRosterId) {
    return { success: false, error: 'You are not the current nominator' }
  }

  const playerName = nomination.playerName?.trim()
  if (!playerName) return { success: false, error: 'Player name required' }

  const existingNames = new Set(
    session.picks.map((p) => p.playerName.trim().toLowerCase())
  )
  if (existingNames.has(playerName.toLowerCase())) {
    return { success: false, error: 'Player already drafted' }
  }

  const bidTimerEndAt = computeTimerEndAt(config.bidTimerSeconds)
  const minNextBid = config.minBid

  const newState: AuctionState = {
    nominationOrderIndex: state?.nominationOrderIndex ?? 0,
    currentNomination: {
      playerName,
      position: nomination.position ?? '',
      team: nomination.team ?? null,
      playerId: nomination.playerId ?? null,
      byeWeek: nomination.byeWeek ?? null,
    },
    currentBid: 0,
    currentBidderRosterId: null,
    bidTimerEndAt: bidTimerEndAt.toISOString(),
    minNextBid,
  }

  await prisma.draftSession.update({
    where: { id: session.id },
    data: {
      auctionState: newState as any,
      timerEndAt: bidTimerEndAt,
      pausedRemainingSeconds: null,
      status: 'in_progress',
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  })
  return { success: true }
}

/**
 * Place a bid. Validates minimum bid, budget, then updates high bidder and resets timer.
 */
export async function placeBid(
  leagueId: string,
  rosterId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'asc' } } },
  })
  if (!session || session.draftType !== 'auction') {
    return { success: false, error: 'Auction session not found' }
  }
  if (session.status !== 'in_progress') {
    return { success: false, error: 'Draft is not in progress' }
  }

  const state = getAuctionStateFromSession(session)
  if (!state?.currentNomination) {
    return { success: false, error: 'No player currently on the block' }
  }

  const config = getAuctionConfigFromSession(session)
  const budgets = getBudgetsFromSession(session)
  const myBudget = budgets[rosterId] ?? 0
  const picksByRoster = session.picks.filter((p) => p.rosterId === rosterId)
  const rosterSlotsRemaining = Math.max(0, session.rounds * session.teamCount - picksByRoster.length)
  const rosterSlotsTotal = session.rounds * session.teamCount
  const slotsRemaining = rosterSlotsTotal - picksByRoster.length

  const minNext = getMinNextBid(state, config.minBidIncrement)
  if (amount < minNext) {
    return { success: false, error: `Minimum bid is $${minNext}` }
  }

  const canBid = canPlaceAuctionBid({
    budget: myBudget,
    bid: amount,
    rosterSlotsRemaining: slotsRemaining,
    minimumBid: config.minBid,
  })
  if (!canBid) {
    return { success: false, error: 'Bid exceeds remaining budget or invalid' }
  }

  const bidTimerEndAt = computeTimerEndAt(config.bidTimerSeconds)
  const newState: AuctionState = {
    ...state,
    currentBid: amount,
    currentBidderRosterId: rosterId,
    bidTimerEndAt: bidTimerEndAt.toISOString(),
    minNextBid: amount + config.minBidIncrement,
  }

  await prisma.draftSession.update({
    where: { id: session.id },
    data: {
      auctionState: newState as any,
      timerEndAt: bidTimerEndAt,
      pausedRemainingSeconds: null,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  })
  return { success: true }
}

/**
 * Resolve the current auction: assign player to high bidder, deduct budget, create pick, advance nominator.
 * Called when bid timer expires or commissioner forces sell. If no bids, player is not assigned (pass).
 */
export async function resolveAuctionWin(leagueId: string): Promise<{
  success: boolean
  error?: string
  sold?: boolean
  winnerRosterId?: string
  amount?: number
}> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'asc' } } },
  })
  if (!session || session.draftType !== 'auction') {
    return { success: false, error: 'Auction session not found' }
  }

  const state = getAuctionStateFromSession(session)
  if (!state?.currentNomination) {
    return { success: false, error: 'No player on the block' }
  }

  const slotOrder = (session.slotOrder as unknown as SlotOrderEntry[]) ?? []
  const teamCount = session.teamCount
  const totalPicks = session.rounds * teamCount
  const picksCount = session.picks.length

  const winnerRosterId = state.currentBidderRosterId
  const amount = state.currentBid
  const nomination = state.currentNomination
  const nominationIndex = state.nominationOrderIndex
  const nextNominationIndex = (nominationIndex + 1) % slotOrder.length

  await prisma.$transaction(async (tx) => {
    if (winnerRosterId && amount > 0) {
      const budgets = getBudgetsFromSession(session)
      const newBudgets = { ...budgets }
      newBudgets[winnerRosterId] = Math.max(0, (budgets[winnerRosterId] ?? 0) - amount)

      const winnerEntry = slotOrder.find((e) => e.rosterId === winnerRosterId)
      const overall = picksCount + 1
      const round = Math.ceil(overall / teamCount)
      const slot = ((overall - 1) % teamCount) + 1

      await (tx as any).draftPick.create({
        data: {
          sessionId: session.id,
          overall,
          round,
          slot,
          rosterId: winnerRosterId,
          displayName: winnerEntry?.displayName ?? null,
          playerName: nomination.playerName,
          position: nomination.position,
          team: nomination.team ?? null,
          byeWeek: nomination.byeWeek ?? null,
          playerId: nomination.playerId ?? null,
          source: 'user',
          amount,
        },
      })

      await (tx as any).draftSession.update({
        where: { id: session.id },
        data: {
          auctionState: {
            nominationOrderIndex: nextNominationIndex,
            currentNomination: null,
            currentBid: 0,
            currentBidderRosterId: null,
            bidTimerEndAt: null,
            minNextBid: 0,
          },
          auctionBudgets: newBudgets,
          timerEndAt: null,
          pausedRemainingSeconds: null,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      })
    } else {
      await (tx as any).draftSession.update({
        where: { id: session.id },
        data: {
          auctionState: {
            nominationOrderIndex: nextNominationIndex,
            currentNomination: null,
            currentBid: 0,
            currentBidderRosterId: null,
            bidTimerEndAt: null,
            minNextBid: 0,
          },
          timerEndAt: null,
          pausedRemainingSeconds: null,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      })
    }
  })

  const sold = Boolean(winnerRosterId && amount > 0)
  if (picksCount + (sold ? 1 : 0) >= totalPicks) {
    await prisma.draftSession.update({
      where: { id: session.id },
      data: { status: 'completed', timerEndAt: null, pausedRemainingSeconds: null, version: { increment: 1 } },
    })
  }

  return {
    success: true,
    sold,
    winnerRosterId: winnerRosterId ?? undefined,
    amount: amount > 0 ? amount : undefined,
  }
}

/**
 * Initialize auction state and budgets when starting an auction draft.
 */
export async function initializeAuctionForSession(leagueId: string): Promise<boolean> {
  const session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!session || session.draftType !== 'auction') return false

  const slotOrder = (session.slotOrder as unknown as SlotOrderEntry[]) ?? []
  const budgetPerTeam = session.auctionBudgetPerTeam ?? DEFAULT_BUDGET
  const budgets: AuctionBudgets = {}
  for (const entry of slotOrder) {
    budgets[entry.rosterId] = budgetPerTeam
  }

  const initialAuctionState: AuctionState = {
    nominationOrderIndex: 0,
    currentNomination: null,
    currentBid: 0,
    currentBidderRosterId: null,
    bidTimerEndAt: null,
    minNextBid: DEFAULT_MIN_BID,
  }

  await prisma.draftSession.update({
    where: { id: session.id },
    data: {
      auctionBudgets: budgets as any,
      auctionState: initialAuctionState as any,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  })
  return true
}
