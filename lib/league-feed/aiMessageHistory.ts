import { prisma } from "@/lib/prisma"

const WINDOW_MS = 5 * 60 * 1000
const MAX_IN_WINDOW = 8

export async function shouldThrottleFlavor(leagueId: string, botId: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS)
  const n = await prisma.aiBotMessageHistory.count({
    where: { leagueId, botId, createdAt: { gte: since } },
  })
  return n >= MAX_IN_WINDOW
}

export async function recordBotMessageLine(input: {
  leagueId: string
  botId: string
  eventType: string
  contentHash: string
  templateKey: string
}): Promise<void> {
  await prisma.aiBotMessageHistory.create({
    data: {
      leagueId: input.leagueId,
      botId: input.botId,
      eventType: input.eventType.slice(0, 64),
      contentHash: input.contentHash.slice(0, 64),
      templateKey: input.templateKey.slice(0, 96),
    },
  })
}

export async function recentDuplicateFlavor(leagueId: string, contentHash: string): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 60 * 1000)
  const hit = await prisma.aiBotMessageHistory.findFirst({
    where: { leagueId, contentHash, createdAt: { gte: since } },
    select: { id: true },
  })
  return Boolean(hit)
}
