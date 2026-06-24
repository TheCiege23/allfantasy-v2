/**
 * Draft pool cache readiness helpers for resume/start paths.
 *
 * checkDraftPoolCacheFast — DB-only check, returns in <50 ms.
 *   Use on resume/start: if cold, return POOL_NOT_READY immediately and let
 *   the background build (already running via GET /draft/pool) finish first.
 *
 * ensureDraftPoolReady — full synchronous build + persist.
 *   Call as fire-and-forget background trigger, or from non-latency-sensitive paths.
 */

import { prisma } from '@/lib/prisma'
import {
  getEffectiveLeagueRosterTemplate,
  starterEligiblePlayerPositionsFromTemplate,
} from '@/lib/league/getEffectiveLeagueRosterTemplate'
import { rosterFingerprintFromEligible } from '@/lib/draft-room/draft-pool-eligible-positions'
import { getResolvedDraftPoolForLeague } from '@/lib/draft-room/getResolvedDraftPoolForLeague'
import { dbFirstMode } from '@/lib/db-first-mode'
import { getApiCached } from '@/lib/api-performance'

export type EnsureDraftPoolReadyResult =
  | { ok: true; source: 'db-cache' | 'memory-cache' | 'rebuilt' }
  | { ok: false; error: string }

type EffectiveLeagueTemplate = Awaited<ReturnType<typeof getEffectiveLeagueRosterTemplate>>
type DraftPoolReadinessSource = 'db-cache' | 'memory-cache' | 'cold' | 'missing'
type DraftPoolReadiness = {
  warm: boolean
  ready: boolean
  source: DraftPoolReadinessSource
  entryCount: number
  syncedAt: string | null
  cacheKey: string | null
  sourceFingerprint: string | null
}

type DraftPoolCacheModel = {
  findFirst: (args: Record<string, unknown>) => Promise<{
    id?: string
    cacheKey?: string
    sourceFingerprint?: string | null
    entryCount?: number | null
    syncedAt?: Date | null
    payload?: unknown
  } | null>
  upsert: (args: {
    where: { cacheKey: string }
    create: Record<string, unknown>
    update: Record<string, unknown>
  }) => Promise<{ entryCount?: number; cacheKey?: string }>
}

function getDraftPoolCacheModel(): DraftPoolCacheModel | null {
  return (prisma as { draftPoolCache?: DraftPoolCacheModel }).draftPoolCache ?? null
}

export const DRAFT_POOL_CACHE_VERSION = 'dbmerge_v4:nflproj_v2:nflfoundation_v1'

export function buildDraftPoolCacheKey(leagueId: string, rosterFp: string, apiCacheKey: string): string {
  return `draft_pool:${leagueId}:${rosterFp}:${DRAFT_POOL_CACHE_VERSION}:${apiCacheKey}`
}

function buildStandardPoolApiCacheKey(leagueId: string): string {
  return `api:GET:/api/leagues/${leagueId}/draft/pool`
}

function resolveRosterFingerprint(effectiveLeagueTemplate: EffectiveLeagueTemplate): string {
  const starterEligible = starterEligiblePlayerPositionsFromTemplate(effectiveLeagueTemplate.template)
  return `${effectiveLeagueTemplate.hasPersistedRosterSchema ? 'cfg' : 'nocfg'}:starters:${rosterFingerprintFromEligible(
    starterEligible.size > 0 ? starterEligible : new Set(effectiveLeagueTemplate.allowedPositions),
  )}`
}

export async function resolveDraftPoolCacheContext(
  leagueId: string,
  options?: { effectiveLeagueTemplate?: EffectiveLeagueTemplate },
): Promise<{
  effectiveLeagueTemplate: EffectiveLeagueTemplate
  rosterFp: string
  standardCacheKey: string
}> {
  const effectiveLeagueTemplate =
    options?.effectiveLeagueTemplate ?? (await getEffectiveLeagueRosterTemplate(leagueId))
  const rosterFp = resolveRosterFingerprint(effectiveLeagueTemplate)
  return {
    effectiveLeagueTemplate,
    rosterFp,
    standardCacheKey: buildDraftPoolCacheKey(leagueId, rosterFp, buildStandardPoolApiCacheKey(leagueId)),
  }
}

function inferEntryCountFromPayload(payload: unknown): number {
  if (!payload || typeof payload !== 'object') return 0
  const record = payload as { meta?: unknown; count?: unknown; entries?: unknown }
  if (record.meta && typeof record.meta === 'object') {
    const metaCount = Number((record.meta as { entryCount?: unknown }).entryCount ?? NaN)
    if (Number.isFinite(metaCount) && metaCount >= 0) return metaCount
  }
  const payloadCount = Number(record.count ?? NaN)
  if (Number.isFinite(payloadCount) && payloadCount >= 0) return payloadCount
  return Array.isArray(record.entries) ? record.entries.length : 0
}

export async function getDraftPoolReadiness(
  leagueId: string,
  options?: { effectiveLeagueTemplate?: EffectiveLeagueTemplate },
): Promise<DraftPoolReadiness> {
  const model = getDraftPoolCacheModel()
  if (!model) {
    return {
      warm: false,
      ready: false,
      source: 'missing',
      entryCount: 0,
      syncedAt: null,
      cacheKey: null,
      sourceFingerprint: null,
    }
  }

  try {
    const cacheContext = await resolveDraftPoolCacheContext(leagueId, options)
    const cached = getApiCached(cacheContext.standardCacheKey)
    if (cached) {
      const cachedBody = cached.body && typeof cached.body === 'object' ? cached.body : null
      const cachedAt =
        cachedBody &&
        typeof cachedBody === 'object' &&
        typeof (cachedBody as { meta?: { cachedAt?: unknown } }).meta?.cachedAt === 'string'
          ? (cachedBody as { meta: { cachedAt: string } }).meta.cachedAt
          : null
      return {
        warm: true,
        ready: true,
        source: 'memory-cache',
        entryCount: inferEntryCountFromPayload(cached.body),
        syncedAt: cachedAt,
        cacheKey: cacheContext.standardCacheKey,
        sourceFingerprint: cacheContext.rosterFp,
      }
    }

    const now = new Date()
    const exactFresh = await model.findFirst({
      where: { cacheKey: cacheContext.standardCacheKey, expiresAt: { gt: now } },
      select: { entryCount: true, syncedAt: true, payload: true },
    })
    if (exactFresh) {
      return {
        warm: true,
        ready: true,
        source: 'db-cache',
        entryCount: Number(exactFresh.entryCount ?? inferEntryCountFromPayload(exactFresh.payload)),
        syncedAt: exactFresh.syncedAt instanceof Date ? exactFresh.syncedAt.toISOString() : null,
        cacheKey: cacheContext.standardCacheKey,
        sourceFingerprint: cacheContext.rosterFp,
      }
    }

    const fallbackFresh = await model.findFirst({
      where: {
        leagueId,
        sourceFingerprint: cacheContext.rosterFp,
        expiresAt: { gt: now },
      },
      orderBy: { syncedAt: 'desc' },
      select: { entryCount: true, syncedAt: true, payload: true, cacheKey: true },
    })
    if (fallbackFresh) {
      return {
        warm: true,
        ready: true,
        source: 'db-cache',
        entryCount: Number(fallbackFresh.entryCount ?? inferEntryCountFromPayload(fallbackFresh.payload)),
        syncedAt: fallbackFresh.syncedAt instanceof Date ? fallbackFresh.syncedAt.toISOString() : null,
        cacheKey: typeof fallbackFresh.cacheKey === 'string' ? fallbackFresh.cacheKey : cacheContext.standardCacheKey,
        sourceFingerprint: cacheContext.rosterFp,
      }
    }

    return {
      warm: false,
      ready: false,
      source: 'cold',
      entryCount: 0,
      syncedAt: null,
      cacheKey: cacheContext.standardCacheKey,
      sourceFingerprint: cacheContext.rosterFp,
    }
  } catch (err) {
    console.warn('[draft-perf] pool readiness check error (non-fatal):', (err as Error)?.message)
    return {
      warm: false,
      ready: false,
      source: 'missing',
      entryCount: 0,
      syncedAt: null,
      cacheKey: null,
      sourceFingerprint: null,
    }
  }
}

/**
 * Fast cache-only check: queries DB in <50 ms, never triggers a cold build.
 * Returns { warm: true } when a non-expired row exists for the league so the
 * resume/start path can proceed immediately without blocking on a pool build.
 */
export async function checkDraftPoolCacheFast(leagueId: string): Promise<DraftPoolReadiness> {
  const t = Date.now()
  const readiness = await getDraftPoolReadiness(leagueId)
  console.info('[draft-perf] pool fast-check', {
    leagueId,
    warm: readiness.warm,
    source: readiness.source,
    entryCount: readiness.entryCount,
    ms: Date.now() - t,
  })
  return readiness
}

/**
 * Fire-and-forget: triggers ensureDraftPoolReady in background so the caller
 * can return immediately. Logs duration when the build finishes.
 */
export function triggerDraftPoolPrewarmBackground(leagueId: string): void {
  const t = Date.now()
  ensureDraftPoolReady(leagueId)
    .then((result) => {
      console.info('[draft-perf] background prewarm done', {
        leagueId,
        ok: result.ok,
        source: result.ok ? result.source : undefined,
        ms: Date.now() - t,
      })
    })
    .catch((err) => {
      console.warn('[draft-perf] background prewarm failed', { leagueId, ms: Date.now() - t, err: (err as Error)?.message })
    })
}

export async function ensureDraftPoolReady(leagueId: string): Promise<EnsureDraftPoolReadyResult> {
  const model = getDraftPoolCacheModel()

  const readiness = await getDraftPoolReadiness(leagueId)
  console.info('[draft-perf] ensureDraftPoolReady cache check', {
    leagueId,
    hit: readiness.warm,
    source: readiness.source,
    entryCount: readiness.entryCount,
  })
  if (readiness.warm) {
    return { ok: true, source: readiness.source === 'memory-cache' ? 'memory-cache' : 'db-cache' }
  }

  // Cold path: build the pool and write to DB cache
  try {
    let cacheContext: Awaited<ReturnType<typeof resolveDraftPoolCacheContext>>
    try {
      cacheContext = await resolveDraftPoolCacheContext(leagueId)
    } catch {
      return { ok: false, error: 'League not found — cannot warm draft pool.' }
    }
    const { effectiveLeagueTemplate, rosterFp, standardCacheKey: cacheKey } = cacheContext

    // Race guard: another request may have just built the cache
    if (model) {
      try {
        const exactFresh = await model.findFirst({
          where: { cacheKey, expiresAt: { gt: new Date() } },
          select: { id: true },
        })
        if (exactFresh) return { ok: true, source: 'db-cache' }
      } catch {
        // non-fatal
      }
    }

    const coldBuildStart = Date.now()
      const resolved = await getResolvedDraftPoolForLeague(leagueId, {
        limit: 300,
        poolType: null,
        effectiveLeagueTemplate,
      })
    console.info('[draft-perf] ensureDraftPoolReady cold build done', { leagueId, ms: Date.now() - coldBuildStart })

    if (model) {
      const expiresAt = new Date(Date.now() + Math.max(1, dbFirstMode.draftPoolCacheTtlSeconds) * 1000)
      await model.upsert({
        where: { cacheKey },
        create: {
          leagueId,
          cacheKey,
          sport: resolved.sport,
          poolType: resolved.poolType ?? null,
          sourceFingerprint: rosterFp,
          entryCount: Number(resolved.count ?? resolved.entries.length),
          payload: {
            entries: resolved.entries,
            sport: resolved.sport,
            count: resolved.count,
            rosterConfigurationIncomplete: resolved.rosterConfigurationIncomplete,
            poolType: resolved.poolType,
            devyConfig: resolved.devyConfig,
            c2cConfig: resolved.c2cConfig,
            isIdp: resolved.isIdp,
          } as unknown as object,
          expiresAt,
        },
        update: {
          sport: resolved.sport,
          poolType: resolved.poolType ?? null,
          sourceFingerprint: rosterFp,
          entryCount: Number(resolved.count ?? resolved.entries.length),
          payload: {
            entries: resolved.entries,
            sport: resolved.sport,
            count: resolved.count,
            rosterConfigurationIncomplete: resolved.rosterConfigurationIncomplete,
            poolType: resolved.poolType,
            devyConfig: resolved.devyConfig,
            c2cConfig: resolved.c2cConfig,
            isIdp: resolved.isIdp,
          } as unknown as object,
          syncedAt: new Date(),
          expiresAt,
        },
      })
    }

    return { ok: true, source: 'rebuilt' }
  } catch (err) {
    return {
      ok: false,
      error: `Failed to warm draft pool: ${(err as Error)?.message ?? 'unknown error'}`,
    }
  }
}
