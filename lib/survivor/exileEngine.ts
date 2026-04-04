import { prisma } from '@/lib/prisma'
import { postHostMessage } from './hostEngine'

export async function sendPlayerToExile(leagueId: string, userId: string): Promise<void> {
  await prisma.survivorPlayer.updateMany({
    where: { leagueId, userId },
    data: {
      playerState: 'exile',
      canAccessExileChat: true,
      canAccessTribeChat: false,
      canAccessMergeChat: false,
      exileWeeksServed: { increment: 1 },
    },
  })
  await postHostMessage(leagueId, 'exile_update', { userId }, 'exile_chat').catch(() => {})
}

export async function scoreExileWeek(leagueId: string, week: number): Promise<void> {
  const island = await prisma.exileIsland.findUnique({ where: { leagueId } })
  if (!island) return
  await prisma.exileIsland.update({
    where: { id: island.id },
    data: { currentWeek: week },
  })
  const entries = await prisma.exileWeeklyEntry.findMany({
    where: { exileId: island.id, week },
  })
  let top: { userId: string; weeklyScore: number } | null = null
  for (const e of entries) {
    if (!top || e.weeklyScore > top.weeklyScore) top = { userId: e.userId, weeklyScore: e.weeklyScore }
  }
  if (top) {
    await prisma.survivorPlayer.updateMany({
      where: { leagueId, userId: top.userId },
      data: { tokenBalance: { increment: 1 }, totalTokensEarned: { increment: 1 } },
    })
    await prisma.exileWeeklyEntry.updateMany({
      where: { exileId: island.id, week, userId: top.userId },
      data: { tokenEarned: 1 },
    })
  }
}

export async function processReturnFromExile(leagueId: string): Promise<string | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { survivorExileReturnTrigger: true },
  })
  if (league?.survivorExileReturnTrigger !== 'token_leader') return null

  const top = await prisma.survivorPlayer.findFirst({
    where: { leagueId, playerState: 'exile' },
    orderBy: { tokenBalance: 'desc' },
  })
  if (!top) return null

  await prisma.survivorPlayer.update({
    where: { id: top.id },
    data: {
      playerState: 'active',
      canAccessExileChat: false,
      canAccessMergeChat: true,
      exileReturnEligible: false,
      tokenBalance: 0,
    },
  })
  await postHostMessage(leagueId, 'twist_announcement', { returnedUserId: top.userId }, 'league_chat').catch(() => {})
  return top.userId
}
