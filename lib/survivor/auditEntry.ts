import { prisma } from '@/lib/prisma'

export type SurvivorAuditEntryInput = {
  leagueId: string
  week?: number | null
  category: string
  action: string
  actorUserId?: string | null
  targetUserId?: string | null
  targetTribeId?: string | null
  relatedEntityId?: string | null
  relatedEntityType?: string | null
  data: Record<string, unknown>
  isVisibleToCommissioner?: boolean
  isVisibleToPublic?: boolean
  isRevealablePostSeason?: boolean
}

export async function logSurvivorAuditEntry(input: SurvivorAuditEntryInput): Promise<void> {
  await prisma.survivorAuditEntry.create({
    data: {
      leagueId: input.leagueId,
      week: input.week ?? null,
      category: input.category,
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      targetTribeId: input.targetTribeId ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      data: input.data as object,
      isVisibleToCommissioner: input.isVisibleToCommissioner ?? true,
      isVisibleToPublic: input.isVisibleToPublic ?? false,
      isRevealablePostSeason: input.isRevealablePostSeason ?? true,
    },
  })
}
