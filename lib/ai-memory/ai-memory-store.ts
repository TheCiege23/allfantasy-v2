/**
 * PROMPT 234 — AiMemory table: user preferences, favorite teams, league history, past trades.
 * Backend service for context-aware, league-aware, personalized Chimmy.
 */

import { prisma } from '@/lib/prisma'

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
}

export async function getAiMemory(
  userId: string,
  scope: AiMemoryScope,
  options?: { leagueId?: string | null; key?: string }
): Promise<Record<string, unknown> | unknown[] | null> {
  const leagueId = options?.leagueId ?? null
  const key = options?.key ?? ''

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

  const rows = await prisma.aiMemory.findMany({
    where,
    orderBy: [{ scope: 'asc' }, { key: 'asc' }],
  })
  return rows.map((r) => ({
    scope: r.scope,
    key: r.key,
    value: r.value as Record<string, unknown> | unknown[],
  }))
}
