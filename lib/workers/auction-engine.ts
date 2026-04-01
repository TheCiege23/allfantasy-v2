import 'server-only'

import { prisma } from '@/lib/prisma'
import { assertLiveDraftContext } from '@/lib/draft/resolve-draft-context'
import {
  nominatePlayer as nominateAuctionPlayer,
  placeBid as placeAuctionBid,
  resolveAuctionWin,
  getAuctionStateFromSession,
  getBudgetsFromSession,
} from '@/lib/live-draft-engine/auction/AuctionEngine'

export type NominationResult = {
  success: boolean
  error?: string
}

export type BidResult = {
  success: boolean
  error?: string
}

export type AuctionResult = {
  success: boolean
  error?: string
  sold?: boolean
  winnerTeamId?: string
  amount?: number
}

async function resolveAuctionPlayerFromId(leagueId: string, playerId: string) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, position: true, team: true },
  })

  if (player?.id) {
    return {
      playerId: player.id,
      playerName: player.name,
      position: player.position ?? '',
      team: player.team ?? null,
    }
  }

  const sportsPlayer = await prisma.sportsPlayer.findFirst({
    where: {
      OR: [{ id: playerId }, { externalId: playerId }],
    },
    select: {
      id: true,
      name: true,
      position: true,
      team: true,
    },
  })

  if (sportsPlayer?.id) {
    return {
      playerId: sportsPlayer.id,
      playerName: sportsPlayer.name ?? playerId,
      position: sportsPlayer.position ?? '',
      team: sportsPlayer.team ?? null,
    }
  }

  return null
}

export async function nominateDraftPlayer(
  draftId: string,
  teamId: string,
  playerId: string
): Promise<NominationResult> {
  const context = await assertLiveDraftContext(draftId)
  const player = await resolveAuctionPlayerFromId(context.leagueId, playerId)
  if (!player) {
    return { success: false, error: 'Player not found for nomination' }
  }

  return nominateAuctionPlayer(
    context.leagueId,
    {
      playerId: player.playerId,
      playerName: player.playerName,
      position: player.position,
      team: player.team,
    },
    teamId
  )
}

export async function placeDraftBid(
  draftId: string,
  teamId: string,
  amount: number
): Promise<BidResult> {
  const context = await assertLiveDraftContext(draftId)
  return placeAuctionBid(context.leagueId, teamId, amount)
}

export async function closeDraftAuction(
  draftId: string
): Promise<AuctionResult> {
  const context = await assertLiveDraftContext(draftId)
  const result = await resolveAuctionWin(context.leagueId, { force: true })
  return {
    success: result.success,
    error: result.error,
    sold: result.sold,
    winnerTeamId: result.winnerRosterId,
    amount: result.amount,
  }
}

export async function getAuctionSnapshot(draftId: string) {
  const context = await assertLiveDraftContext(draftId)
  const session = await prisma.draftSession.findUnique({
    where: { id: context.draftId },
    select: {
      auctionBudgetPerTeam: true,
      auctionBudgets: true,
      auctionState: true,
      slotOrder: true,
      timerEndAt: true,
      timerSeconds: true,
    },
  })

  if (!session) {
    return null
  }

  return {
    budgets: getBudgetsFromSession(session),
    state: getAuctionStateFromSession(session),
    slotOrder: session.slotOrder,
    timerEndAt: session.timerEndAt?.toISOString() ?? null,
    timerSeconds: session.timerSeconds ?? null,
  }
}
