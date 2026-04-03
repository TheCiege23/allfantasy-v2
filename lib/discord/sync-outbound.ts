import { prisma } from '@/lib/prisma'
import { postLeagueChatEmbed, isBotConfigured } from '@/lib/discord/bot'
import { channelLink } from '@/lib/discord/deepLinks'

export type OutboundSyncInput = {
  leagueId: string
  messageId: string
  authorName: string
  authorAvatarUrl: string | null
  text: string
  gifUrl?: string | null
}

/**
 * Sync a league chat line to Discord when a row exists in `DiscordLeagueChannel`.
 * No-op if bot token missing or no mapping / sync disabled.
 */
export async function syncOutboundLeagueChat(input: OutboundSyncInput): Promise<{ synced: boolean; discordMessageId?: string }> {
  if (!isBotConfigured()) {
    return { synced: false }
  }

  const row = await prisma.discordLeagueChannel.findFirst({
    where: {
      leagueId: input.leagueId,
      syncEnabled: true,
      syncOutbound: true,
    },
    include: {
      league: { select: { name: true } },
    },
  })

  if (!row) {
    return { synced: false }
  }

  const msg = await prisma.leagueChatMessage.findUnique({
    where: { id: input.messageId },
    select: { sourceDiscord: true },
  })
  if (msg?.sourceDiscord) {
    return { synced: false }
  }

  const leagueName = row.league.name ?? 'League'

  const discordMessageId = await postLeagueChatEmbed(row.channelId, {
    authorName: input.authorName,
    authorAvatar: input.authorAvatarUrl ?? undefined,
    text: input.text,
    gifUrl: input.gifUrl ?? undefined,
    leagueName,
    leagueId: input.leagueId,
  })

  await prisma.discordMessageLink.create({
    data: {
      leagueMessageId: input.messageId,
      discordMessageId,
      direction: 'to_discord',
      guildId: row.guildId,
      channelId: row.channelId,
    },
  })

  return { synced: true, discordMessageId }
}

/** Fire-and-forget friendly URL for logs / admin (not stored on message by default). */
export function discordChannelUrl(guildId: string, channelId: string): string {
  return channelLink(guildId, channelId)
}
