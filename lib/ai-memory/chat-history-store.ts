/**
 * PROMPT 234 — chat_history table service for Chimmy memory context.
 */

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export interface ChatHistoryMessage {
  role: string
  content: string
  createdAt?: Date
}

export interface AppendChatHistoryInput {
  conversationId: string
  role: 'user' | 'assistant' | string
  content: string
  userId?: string | null
  leagueId?: string | null
  meta?: Record<string, unknown> | null
}

export function buildChimmyConversationId(input: {
  userId?: string | null
  leagueId?: string | null
  explicitConversationId?: string | null
}): string {
  if (input.explicitConversationId && input.explicitConversationId.trim().length > 0) {
    return input.explicitConversationId.trim()
  }
  if (input.userId && input.leagueId) return `chimmy:${input.userId}:${input.leagueId}`
  if (input.userId) return `chimmy:${input.userId}:global`
  return `chimmy:anon:${randomUUID()}`
}

export async function appendChatHistory(input: AppendChatHistoryInput): Promise<void> {
  const content = input.content.trim()
  if (!content) return
  const id = randomUUID()

  try {
    await prisma.$executeRaw`
      INSERT INTO "chat_history"
        ("id", "conversationId", "userId", "leagueId", "role", "content", "meta", "createdAt")
      VALUES
        (${id}, ${input.conversationId}, ${input.userId ?? null}, ${input.leagueId ?? null}, ${input.role}, ${content}, ${input.meta ? JSON.stringify(input.meta) : null}::jsonb, NOW())
    `
  } catch (error) {
    console.warn('[ChatHistory] failed to append chat_history:', String(error))
    return
  }

  // Keep chat_conversations fresh for existing UIs that rely on conversation rollups.
  if (input.userId) {
    try {
      const existing = await prisma.chatConversation.findUnique({
        where: { id: input.conversationId },
        select: { id: true, messageCount: true },
      })
      if (!existing) {
        await prisma.chatConversation.create({
          data: {
            id: input.conversationId,
            userId: input.userId,
            messageCount: 1,
            lastMessageAt: new Date(),
          },
        })
      } else {
        await prisma.chatConversation.update({
          where: { id: input.conversationId },
          data: {
            messageCount: existing.messageCount + 1,
            lastMessageAt: new Date(),
          },
        })
      }
    } catch (error) {
      console.warn('[ChatHistory] failed to maintain chat_conversations:', String(error))
    }
  }
}

/**
 * Get recent messages for a conversation (for prompt context).
 */
export async function getRecentChatHistory(
  conversationId: string,
  limit: number
): Promise<ChatHistoryMessage[]> {
  if (!conversationId || limit <= 0) return []
  try {
    const rows = await prisma.$queryRaw<Array<{ role: string; content: string; createdAt: Date }>>`
      SELECT "role", "content", "createdAt"
      FROM "chat_history"
      WHERE "conversationId" = ${conversationId}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `
    return rows
      .map((row: { role: string; content: string; createdAt?: Date }) => ({
        role: row.role,
        content: row.content,
        createdAt: row.createdAt,
      }))
      .reverse()
  } catch (error) {
    console.warn('[ChatHistory] failed to query chat_history:', String(error))
    return []
  }
}
