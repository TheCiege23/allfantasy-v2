/**
 * Chat mention parsing for Survivor League.
 * Supports @username, @all, @tribe, and @chimmy mentions.
 */

import { prisma } from '@/lib/prisma'

export interface ParsedMention {
  type: 'user' | 'all' | 'tribe' | 'chimmy'
  raw: string
  userId?: string
  displayName?: string
}

/**
 * Parse @mentions from message content.
 * Returns list of parsed mentions and the message with mentions normalized.
 */
export function parseMentions(content: string): {
  mentions: ParsedMention[]
  normalizedContent: string
} {
  const mentions: ParsedMention[] = []
  const mentionPattern = /@(\w+)/g
  let match: RegExpExecArray | null

  while ((match = mentionPattern.exec(content)) !== null) {
    const raw = match[0]!
    const name = match[1]!.toLowerCase()

    if (name === 'all' || name === 'everyone') {
      mentions.push({ type: 'all', raw })
    } else if (name === 'tribe') {
      mentions.push({ type: 'tribe', raw })
    } else if (name === 'chimmy' || name === 'host') {
      mentions.push({ type: 'chimmy', raw })
    } else {
      mentions.push({ type: 'user', raw, displayName: match[1] })
    }
  }

  return { mentions, normalizedContent: content }
}

/**
 * Resolve user mentions to actual user IDs.
 */
export async function resolveMentionUserIds(
  leagueId: string,
  mentions: ParsedMention[],
): Promise<ParsedMention[]> {
  const userMentions = mentions.filter((m) => m.type === 'user' && m.displayName)
  if (!userMentions.length) return mentions

  const displayNames = userMentions.map((m) => m.displayName!.toLowerCase())

  const players = await (prisma as any).survivorPlayer.findMany({
    where: { leagueId },
    select: { userId: true, displayName: true },
  })

  const nameMap = new Map<string, string>()
  for (const p of players) {
    if (p.displayName) nameMap.set(p.displayName.toLowerCase(), p.userId)
  }

  return mentions.map((m) => {
    if (m.type === 'user' && m.displayName) {
      const userId = nameMap.get(m.displayName.toLowerCase())
      return userId ? { ...m, userId } : m
    }
    return m
  })
}

/**
 * Get notification recipients for mentions.
 */
export async function getMentionRecipients(
  leagueId: string,
  channelId: string,
  mentions: ParsedMention[],
): Promise<string[]> {
  const recipients = new Set<string>()

  for (const mention of mentions) {
    if (mention.type === 'all') {
      // Get all members of the channel
      const channel = await (prisma as any).survivorChatChannel.findUnique({
        where: { id: channelId },
        select: { memberUserIds: true },
      })
      if (channel?.memberUserIds) {
        for (const uid of channel.memberUserIds) recipients.add(uid)
      }
    } else if (mention.type === 'user' && mention.userId) {
      recipients.add(mention.userId)
    }
  }

  return [...recipients]
}
