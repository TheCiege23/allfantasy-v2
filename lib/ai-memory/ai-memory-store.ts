/**
 * PROMPT 234 — AiMemory table: user preferences, favorite teams, league history, past trades.
 * Backend service for context-aware, league-aware, personalized Chimmy.
 */

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type AiMemoryScope =
  | 'user_preferences'
  | 'favorite_teams'
  | 'league_history'
  | 'past_trades'
  | 'coaching_notes'

export interface UpsertAiMemoryInput {
  userId: string
  leagueId?: string | null
  scope: AiMemoryScope
  key?: string
  value: Record<string, unknown> | unknown[]
}

export async function upsertAiMemory(input: UpsertAiMemoryInput): Promise<{ id: string }> {
  const leagueId = input.leagueId ?? null
  const key = input.key ?? ''
  try {
    const existing = await prisma.aiMemory.findFirst({
      where: {
        userId: input.userId,
        leagueId,
        scope: input.scope,
        key,
      },
      select: { id: true },
    })

    const row = existing
      ? await prisma.aiMemory.update({
          where: { id: existing.id },
          data: { value: input.value as object },
        })
      : await prisma.aiMemory.create({
          data: {
            userId: input.userId,
            leagueId,
            scope: input.scope,
            key,
            value: input.value as object,
          },
        })
    return { id: row.id }
  } catch (error) {
    console.warn('[AiMemory] upsert failed:', String(error))
    return { id: '' }
  }
}

export async function getAiMemory(
  userId: string,
  scope: AiMemoryScope,
  options?: { leagueId?: string | null; key?: string }
): Promise<Record<string, unknown> | unknown[] | null> {
  const leagueId = options?.leagueId ?? null
  const key = options?.key ?? ''

  try {
    const row = await prisma.aiMemory.findFirst({
      where: {
        userId,
        leagueId,
        scope,
        key,
      },
    })
    if (!row) return null
    return row.value as Record<string, unknown> | unknown[]
  } catch (error) {
    console.warn('[AiMemory] get failed:', String(error))
    return null
  }
}

export async function listAiMemoryByUser(
  userId: string,
  options?: { leagueId?: string | null; scopes?: AiMemoryScope[] }
): Promise<{ scope: string; key: string; value: Record<string, unknown> | unknown[] }[]> {
  const where: { userId: string; leagueId?: string | null; scope?: { in: string[] } } = {
    userId,
  }
  if (options?.leagueId !== undefined) where.leagueId = options.leagueId
  if (options?.scopes?.length) where.scope = { in: options.scopes }

  try {
    const rows = await prisma.aiMemory.findMany({
      where,
      orderBy: [{ scope: 'asc' }, { key: 'asc' }],
    })
    return rows.map((r) => ({
      scope: r.scope,
      key: r.key,
      value: r.value as Record<string, unknown> | unknown[],
    }))
  } catch (error) {
    console.warn('[AiMemory] list failed:', String(error))
    return []
  }
}

function parseFavoriteTeam(message: string): string | null {
  const match = message.match(
    /(?:favorite\s+team|fav\s+team|root\s+for|fan\s+of)\s*(?:is|:)?\s*([A-Za-z0-9 .'\-]{2,50})/i
  )
  if (!match?.[1]) return null
  return match[1].trim().slice(0, 50)
}

function parsePreferenceFlags(message: string): Record<string, unknown> {
  const text = message.toLowerCase()
  const updates: Record<string, unknown> = {}
  if (/\bconservative\b/.test(text)) updates.riskStyle = 'conservative'
  if (/\baggressive\b/.test(text)) updates.riskStyle = 'aggressive'
  if (/\bconcise\b|short answer|brief/.test(text)) updates.detailLevel = 'concise'
  if (/\bdetailed\b|deep dive|more detail/.test(text)) updates.detailLevel = 'detailed'
  if (/\bcalm\b|steady tone/.test(text)) updates.toneStyle = 'calm'
  if (/\bhype\b|fun|banter/.test(text)) updates.toneStyle = 'engaging'
  return updates
}

function summarizeMessage(message: string): string {
  return message.replace(/\s+/g, ' ').trim().slice(0, 220)
}

export async function rememberChimmyUserMessageMemory(input: {
  userId: string
  leagueId?: string | null
  sport?: string | null
  message: string
}): Promise<void> {
  const message = input.message.trim()
  if (!message) return

  const leagueId = input.leagueId ?? null
  const now = new Date().toISOString()
  const sport = normalizeToSupportedSport(input.sport ?? undefined)
  const summary = summarizeMessage(message)

  const preferenceUpdates = parsePreferenceFlags(message)
  if (Object.keys(preferenceUpdates).length > 0) {
    const existing = (await getAiMemory(input.userId, 'user_preferences', { leagueId })) as
      | Record<string, unknown>
      | null
    await upsertAiMemory({
      userId: input.userId,
      leagueId,
      scope: 'user_preferences',
      key: 'coaching_profile',
      value: {
        ...(existing && !Array.isArray(existing) ? existing : {}),
        ...preferenceUpdates,
        updatedAt: now,
      },
    })
  }

  const favoriteTeam = parseFavoriteTeam(message)
  if (favoriteTeam) {
    await upsertAiMemory({
      userId: input.userId,
      leagueId,
      scope: 'favorite_teams',
      key: 'primary',
      value: {
        team: favoriteTeam,
        sport,
        source: 'chimmy_chat',
        updatedAt: now,
      },
    })
  }

  const leagueHistory = (await getAiMemory(input.userId, 'league_history', { leagueId, key: 'summary' })) as
    | Record<string, unknown>
    | null
  await upsertAiMemory({
    userId: input.userId,
    leagueId,
    scope: 'league_history',
    key: 'summary',
    value: {
      ...(leagueHistory && !Array.isArray(leagueHistory) ? leagueHistory : {}),
      sport,
      lastInteractionAt: now,
      lastUserTopic: summary,
      interactionCount:
        Number(
          !Array.isArray(leagueHistory) && leagueHistory && typeof leagueHistory.interactionCount === 'number'
            ? leagueHistory.interactionCount
            : 0
        ) + 1,
    },
  })

  if (/\btrade\b|offer|counter|accept|decline/i.test(message)) {
    const existingTrades = (await getAiMemory(input.userId, 'past_trades', { leagueId, key: 'recent' })) as
      | unknown[]
      | null
    const nextTrades = Array.isArray(existingTrades) ? existingTrades.slice(0, 9) : []
    nextTrades.unshift({
      capturedAt: now,
      from: 'user_message',
      summary,
    })
    await upsertAiMemory({
      userId: input.userId,
      leagueId,
      scope: 'past_trades',
      key: 'recent',
      value: nextTrades,
    })
  }
}

export async function rememberChimmyAssistantMemory(input: {
  userId: string
  leagueId?: string | null
  answer: string
  recommendedTool?: string | null
  confidence?: number | null
}): Promise<void> {
  const summary = summarizeMessage(input.answer)
  if (!summary) return
  const leagueId = input.leagueId ?? null
  const now = new Date().toISOString()

  await upsertAiMemory({
    userId: input.userId,
    leagueId,
    scope: 'coaching_notes',
    key: 'latest',
    value: {
      updatedAt: now,
      lastAdvice: summary,
      recommendedTool: input.recommendedTool ?? null,
      confidence: input.confidence ?? null,
    },
  })
}
