/**
 * Persists import audit rows + entity mappings after `persistImportedLeagueFromNormalization`.
 */

import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { ImportProvider, NormalizedImportResult } from '@/lib/league-import/types'
import type { CanonicalImportBundle } from '@/lib/league-import/types'
import {
  persistImportedLeagueFromNormalization,
  type PersistImportedLeagueResult,
} from '@/lib/league-import/ImportedLeagueCommitService'

function hashPayload(normalized: NormalizedImportResult): string {
  return createHash('sha256').update(JSON.stringify(normalized.source)).digest('hex').slice(0, 32)
}

function buildImportIdempotencyKey(input: {
  userId: string
  provider: ImportProvider
  sourceLeagueId: string
  season: number
}): string {
  return `${input.userId}:${input.provider}:${input.sourceLeagueId}:${input.season}`
}

function buildExistingLeagueImportIdempotencyKey(input: {
  userId: string
  provider: ImportProvider
  sourceLeagueId: string
  season: number
  leagueId: string
}): string {
  return `${input.userId}:${input.provider}:${input.sourceLeagueId}:${input.season}:into:${input.leagueId}`
}

/** Allows safe retry after a failed import without violating `idempotencyKey` uniqueness. */
async function deleteFailedImportRunIfPresent(idempotencyKey: string): Promise<void> {
  const row = await prisma.importRun.findUnique({ where: { idempotencyKey } })
  if (row?.status === 'failed') {
    await prisma.importRun.delete({ where: { id: row.id } })
  }
}

export async function persistImportWithCanonicalAudit(input: {
  userId: string
  provider: ImportProvider
  normalized: NormalizedImportResult
  canonical: CanonicalImportBundle
  allowUpdateExisting?: boolean
}): Promise<{
  persisted: PersistImportedLeagueResult
  runId: string
}> {
  const seasonYear =
    typeof input.normalized.league.season === 'number' && Number.isFinite(input.normalized.league.season)
      ? input.normalized.league.season
      : new Date().getFullYear()

  const idempotencyKey = buildImportIdempotencyKey({
    userId: input.userId,
    provider: input.provider,
    sourceLeagueId: input.normalized.source.source_league_id,
    season: seasonYear,
  })

  await deleteFailedImportRunIfPresent(idempotencyKey)

  const existingRun = await prisma.importRun.findUnique({ where: { idempotencyKey } })
  if (existingRun?.status === 'completed' && existingRun.leagueId) {
    const league = await prisma.league.findUnique({
      where: { id: existingRun.leagueId },
      select: { id: true, name: true, sport: true },
    })
    if (league) {
      return {
        persisted: {
          league: { id: league.id, name: league.name ?? '', sport: String(league.sport) },
          historicalBackfill: null,
          existed: true,
        },
        runId: existingRun.id,
      }
    }
  }

  const run = await prisma.importRun.create({
    data: {
      userId: input.userId,
      provider: input.provider,
      sourceLeagueId: input.normalized.source.source_league_id,
      season: seasonYear,
      status: 'running',
      idempotencyKey,
      rawPayloadHash: hashPayload(input.normalized),
      canonicalSummary: input.canonical as object,
    },
  })

  try {
    const persisted = await persistImportedLeagueFromNormalization({
      userId: input.userId,
      provider: input.provider,
      normalized: input.normalized,
      allowUpdateExisting: input.allowUpdateExisting ?? false,
      canonicalBundle: input.canonical,
    })

    await prisma.importRun.update({
      where: { id: run.id },
      data: {
        leagueId: persisted.league.id,
        status: 'completed',
        completedAt: new Date(),
      },
    })

    for (const w of input.canonical.warnings) {
      await prisma.importWarning.create({
        data: {
          runId: run.id,
          leagueId: persisted.league.id,
          code: w.code,
          message: w.message,
          severity: w.severity,
          metadata: (w.metadata ?? {}) as object,
        },
      })
    }

    for (const m of input.normalized.identity_mappings ?? []) {
      await prisma.externalEntityMapping.upsert({
        where: {
          leagueId_provider_entityType_sourceId: {
            leagueId: persisted.league.id,
            provider: m.source_provider,
            entityType: m.entity_type,
            sourceId: m.source_id,
          },
        },
        create: {
          leagueId: persisted.league.id,
          runId: run.id,
          provider: m.source_provider,
          entityType: m.entity_type,
          sourceId: m.source_id,
          internalId: m.af_id ?? undefined,
          confidence: m.af_id ? 1 : 0.5,
          metadata: { stable_key: m.stable_key },
        },
        update: {
          runId: run.id,
          internalId: m.af_id ?? undefined,
          confidence: m.af_id ? 1 : 0.5,
          metadata: { stable_key: m.stable_key },
        },
      })
    }

    if (input.canonical.reviewRequired) {
      await prisma.importReviewTask.create({
        data: {
          leagueId: persisted.league.id,
          userId: input.userId,
          runId: run.id,
          taskType: 'import_review',
          status: 'open',
          payload: { reasons: input.canonical.reviewReasons } as object,
        },
      })
    }

    return { persisted, runId: run.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await prisma.importRun.update({
      where: { id: run.id },
      data: { status: 'failed', error: msg, completedAt: new Date() },
    })
    throw e
  }
}

/**
 * Audit trail for commissioner import into an **existing** league (no new League row).
 * Uses a distinct idempotency key suffix `:into:{leagueId}` so it does not collide with fresh imports.
 */
export async function recordCanonicalImportAuditForExistingLeague(input: {
  userId: string
  leagueId: string
  provider: ImportProvider
  normalized: NormalizedImportResult
  canonical: CanonicalImportBundle
}): Promise<{ runId: string }> {
  const seasonYear =
    typeof input.normalized.league.season === 'number' && Number.isFinite(input.normalized.league.season)
      ? input.normalized.league.season
      : new Date().getFullYear()

  const idempotencyKey = buildExistingLeagueImportIdempotencyKey({
    userId: input.userId,
    provider: input.provider,
    sourceLeagueId: input.normalized.source.source_league_id,
    season: seasonYear,
    leagueId: input.leagueId,
  })

  await deleteFailedImportRunIfPresent(idempotencyKey)

  const existingRun = await prisma.importRun.findUnique({ where: { idempotencyKey } })
  if (existingRun?.status === 'completed') {
    return { runId: existingRun.id }
  }

  const run = await prisma.importRun.create({
    data: {
      userId: input.userId,
      leagueId: input.leagueId,
      provider: input.provider,
      sourceLeagueId: input.normalized.source.source_league_id,
      season: seasonYear,
      status: 'running',
      idempotencyKey,
      rawPayloadHash: hashPayload(input.normalized),
      canonicalSummary: input.canonical as object,
    },
  })

  try {
    for (const w of input.canonical.warnings) {
      await prisma.importWarning.create({
        data: {
          runId: run.id,
          leagueId: input.leagueId,
          code: w.code,
          message: w.message,
          severity: w.severity,
          metadata: (w.metadata ?? {}) as object,
        },
      })
    }

    for (const m of input.normalized.identity_mappings ?? []) {
      await prisma.externalEntityMapping.upsert({
        where: {
          leagueId_provider_entityType_sourceId: {
            leagueId: input.leagueId,
            provider: m.source_provider,
            entityType: m.entity_type,
            sourceId: m.source_id,
          },
        },
        create: {
          leagueId: input.leagueId,
          runId: run.id,
          provider: m.source_provider,
          entityType: m.entity_type,
          sourceId: m.source_id,
          internalId: m.af_id ?? undefined,
          confidence: m.af_id ? 1 : 0.5,
          metadata: { stable_key: m.stable_key },
        },
        update: {
          runId: run.id,
          internalId: m.af_id ?? undefined,
          confidence: m.af_id ? 1 : 0.5,
          metadata: { stable_key: m.stable_key },
        },
      })
    }

    if (input.canonical.reviewRequired) {
      await prisma.importReviewTask.create({
        data: {
          leagueId: input.leagueId,
          userId: input.userId,
          runId: run.id,
          taskType: 'import_review',
          status: 'open',
          payload: { reasons: input.canonical.reviewReasons } as object,
        },
      })
    }

    await prisma.importRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    })

    return { runId: run.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await prisma.importRun.update({
      where: { id: run.id },
      data: { status: 'failed', error: msg, completedAt: new Date() },
    })
    throw e
  }
}
