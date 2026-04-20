import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function stableStringify(val: unknown): string {
  if (val === null || typeof val !== 'object') return JSON.stringify(val)
  if (Array.isArray(val)) return `[${val.map(stableStringify).join(',')}]`
  const o = val as Record<string, unknown>
  const keys = Object.keys(o).sort()
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(o[k])).join(',')}}`
}

export function hashPlayerDataSnapshot(playerData: unknown): string {
  return createHash('sha256').update(stableStringify(playerData)).digest('hex').slice(0, 32)
}

export async function recordAfRosterMoveHistory(input: {
  leagueId: string
  rosterId: string
  season: number
  week: number
  actorUserId?: string | null
  source: 'user_save' | 'commissioner_override' | 'import' | 'system'
  beforePlayerData: unknown
  afterPlayerData: unknown
  metadata?: Prisma.InputJsonValue
}): Promise<{ id: string | null; skipped: boolean }> {
  const beforeHash = hashPlayerDataSnapshot(input.beforePlayerData)
  const afterHash = hashPlayerDataSnapshot(input.afterPlayerData)
  if (beforeHash === afterHash) {
    return { id: null, skipped: true }
  }

  const row = await prisma.afRosterMoveHistory.create({
    data: {
      leagueId: input.leagueId,
      rosterId: input.rosterId,
      season: input.season,
      week: input.week,
      actorUserId: input.actorUserId ?? null,
      source: input.source,
      moveSummary: 'roster_playerData_update',
      beforeHash,
      afterHash,
      metadata: input.metadata ?? undefined,
    },
  })
  return { id: row.id, skipped: false }
}
