import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  applyDecayToAllTraits,
  applyLearningEvent,
  buildPublicProfile,
  computeStatsFromRecentEvents,
  traitMapFromRows,
  traitsMapToStoredArray,
} from './engine'
import type { LineupPreferenceEventKind, TraitStoredState, UserLineupPreferenceProfile } from './types'

const EVENT_FETCH_LIMIT = 120

export async function loadUserLineupPreferenceProfile(userId: string): Promise<UserLineupPreferenceProfile> {
  const rows = await (prisma as any).userLineupPreferenceTrait.findMany({
    where: { userId },
  })

  const map = traitMapFromRows(
    rows.map((r: any) => ({
      traitId: r.traitId,
      confidence: r.confidence,
      sampleSize: r.sampleSize,
      lastReinforcedAt: r.lastReinforcedAt,
      examples: r.examples,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }))
  )

  const traits = traitsMapToStoredArray(map)

  const events = await (prisma as any).userLineupPreferenceEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: EVENT_FETCH_LIMIT,
    select: { kind: true },
  })

  const stats = computeStatsFromRecentEvents(events as { kind: string }[])

  return buildPublicProfile(userId, traits, stats)
}

export async function recordUserLineupPreferenceEvent(
  userId: string,
  kind: LineupPreferenceEventKind,
  payload: Record<string, unknown>
): Promise<{ traits: TraitStoredState[] }> {
  const now = new Date()

  await (prisma as any).userLineupPreferenceEvent.create({
    data: {
      userId,
      kind,
      payload: payload as Prisma.InputJsonValue,
    },
  })

  const rows = await (prisma as any).userLineupPreferenceTrait.findMany({ where: { userId } })
  const rowCreated = new Map(rows.map((r: any) => [r.traitId, r.createdAt]))
  const map = traitMapFromRows(
    rows.map((r: any) => ({
      traitId: r.traitId,
      confidence: r.confidence,
      sampleSize: r.sampleSize,
      lastReinforcedAt: r.lastReinforcedAt,
      examples: r.examples,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }))
  )

  applyDecayToAllTraits(map, rowCreated, now)
  applyLearningEvent(map, kind, payload, now)

  const traits = traitsMapToStoredArray(map)

  for (const t of traits) {
    await (prisma as any).userLineupPreferenceTrait.upsert({
      where: { userId_traitId: { userId, traitId: t.traitId } },
      create: {
        userId,
        traitId: t.traitId,
        confidence: t.confidence,
        sampleSize: t.sampleSize,
        lastReinforcedAt: t.lastReinforcedAt,
        examples: t.examples as unknown as Prisma.InputJsonValue,
        metadata: t.metadata === null ? undefined : (t.metadata as unknown as Prisma.InputJsonValue),
      },
      update: {
        confidence: t.confidence,
        sampleSize: t.sampleSize,
        lastReinforcedAt: t.lastReinforcedAt,
        examples: t.examples as unknown as Prisma.InputJsonValue,
        metadata: t.metadata === null ? undefined : (t.metadata as unknown as Prisma.InputJsonValue),
      },
    })
  }

  return { traits }
}

export function mergeLearnedWithRequestPreferences(
  learned: UserLineupPreferenceProfile['optimizerProfileInput'],
  request?: import('@/lib/lineup-decision-engine/types').UserLineupPreferenceProfileInput | null
): import('@/lib/lineup-decision-engine/types').UserLineupPreferenceProfileInput {
  if (!request) return learned
  const overrides = Object.fromEntries(
    Object.entries(request).filter(([, v]) => v !== undefined)
  ) as import('@/lib/lineup-decision-engine/types').UserLineupPreferenceProfileInput
  if (Object.keys(overrides).length === 0) return learned
  return { ...learned, ...overrides }
}
