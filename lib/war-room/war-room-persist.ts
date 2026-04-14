import type { LeagueSport, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function logAiRecommendation(args: {
  userId: string
  leagueId?: string | null
  draftSessionId?: string | null
  feature: string
  recommendationType?: string | null
  inputJson: Prisma.InputJsonValue
  outputJson: Prisma.InputJsonValue
  providerSummary?: string | null
  tokenEstimate?: number | null
  confidencePct?: number | null
  accepted?: boolean | null
}) {
  return prisma.aiRecommendationLog.create({
    data: {
      userId: args.userId,
      leagueId: args.leagueId ?? undefined,
      draftSessionId: args.draftSessionId ?? undefined,
      feature: args.feature,
      recommendationType: args.recommendationType ?? undefined,
      inputJson: args.inputJson,
      outputJson: args.outputJson,
      providerSummary: args.providerSummary ?? undefined,
      tokenEstimate: args.tokenEstimate ?? undefined,
      confidencePct: args.confidencePct ?? undefined,
      accepted: args.accepted ?? undefined,
    },
    select: { id: true, createdAt: true },
  })
}

export async function createWarRoomSnapshot(args: {
  leagueId: string
  userId: string
  draftSessionId?: string | null
  sport: LeagueSport
  season?: number | null
  snapshotKind?: string
  payload: Prisma.InputJsonValue
}) {
  return prisma.warRoomSnapshot.create({
    data: {
      leagueId: args.leagueId,
      userId: args.userId,
      draftSessionId: args.draftSessionId ?? undefined,
      sport: args.sport,
      season: args.season ?? undefined,
      snapshotKind: args.snapshotKind ?? 'in_draft',
      payload: args.payload,
    },
    select: { id: true, createdAt: true },
  })
}

export async function upsertPlayerOutlook(args: {
  userId: string
  leagueId?: string | null
  sport: LeagueSport
  season?: number | null
  playerId: string
  playerName: string
  position?: string | null
  team?: string | null
  summary: string
  confidence?: number | null
  detailJson?: Prisma.InputJsonValue | null
  validUntil?: Date | null
}) {
  const existing = await prisma.playerOutlook.findFirst({
    where: {
      userId: args.userId,
      playerId: args.playerId,
      sport: args.sport,
      season: args.season ?? undefined,
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (existing) {
    return prisma.playerOutlook.update({
      where: { id: existing.id },
      data: {
        leagueId: args.leagueId ?? undefined,
        playerName: args.playerName,
        position: args.position ?? undefined,
        team: args.team ?? undefined,
        summary: args.summary,
        confidence: args.confidence ?? undefined,
        detailJson: args.detailJson === null ? undefined : args.detailJson ?? undefined,
        validUntil: args.validUntil ?? undefined,
      },
      select: { id: true, updatedAt: true },
    })
  }

  return prisma.playerOutlook.create({
    data: {
      userId: args.userId,
      leagueId: args.leagueId ?? undefined,
      sport: args.sport,
      season: args.season ?? undefined,
      playerId: args.playerId,
      playerName: args.playerName,
      position: args.position ?? undefined,
      team: args.team ?? undefined,
      summary: args.summary,
      confidence: args.confidence ?? undefined,
      detailJson: args.detailJson === null ? undefined : args.detailJson ?? undefined,
      validUntil: args.validUntil ?? undefined,
    },
    select: { id: true, updatedAt: true },
  })
}

export async function upsertManagerTendency(args: {
  leagueId: string
  season: number
  rosterId: string
  sport: LeagueSport
  label?: string | null
  tendenciesJson: Prisma.InputJsonValue
  samplePicks?: number
}) {
  return prisma.managerTendency.upsert({
    where: {
      leagueId_rosterId_season: {
        leagueId: args.leagueId,
        rosterId: args.rosterId,
        season: args.season,
      },
    },
    create: {
      leagueId: args.leagueId,
      season: args.season,
      rosterId: args.rosterId,
      sport: args.sport,
      label: args.label ?? undefined,
      tendenciesJson: args.tendenciesJson,
      samplePicks: args.samplePicks ?? 0,
    },
    update: {
      label: args.label ?? undefined,
      tendenciesJson: args.tendenciesJson,
      samplePicks: args.samplePicks ?? undefined,
      lastComputedAt: new Date(),
    },
    select: { id: true, updatedAt: true },
  })
}

export async function replaceDraftQueueEntries(args: {
  draftSessionId: string
  userId: string
  entries: Array<{ playerId: string; playerName?: string | null; priority: number }>
}) {
  await prisma.draftQueueEntry.deleteMany({
    where: { draftSessionId: args.draftSessionId, userId: args.userId },
  })
  if (args.entries.length === 0) {
    return { count: 0 }
  }
  await prisma.draftQueueEntry.createMany({
    data: args.entries.map((e, i) => ({
      draftSessionId: args.draftSessionId,
      userId: args.userId,
      playerId: e.playerId,
      playerName: e.playerName ?? undefined,
      priority: e.priority ?? i,
    })),
  })
  return { count: args.entries.length }
}
