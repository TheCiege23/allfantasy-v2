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

export type EnsureDraftPoolReadyResult =
  | { ok: true; source: 'db-cache' | 'rebuilt' }
  | { ok: false; error: string }

type DraftPoolCacheModel = {
  findFirst: (args: {
    where: { leagueId?: string; cacheKey?: string; expiresAt: { gt: Date } }
    select: { id?: boolean }
  }) => Promise<{ id: string } | null>
  upsert: (args: {
    where: { cacheKey: string }
    create: Record<string, unknown>
    update: Record<string, unknown>
  }) => Promise<{ entryCount?: number; cacheKey?: string }>
}

function getDraftPoolCacheModel(): DraftPoolCacheModel | null {
  return (prisma as { draftPoolCache?: DraftPoolCacheModel }).draftPoolCache ?? null
}

function buildPrewarmCacheKey(leagueId: string, rosterFp: string): string {
  // Matches the key the pool route builds for a standard GET with no query params.
  return `draft_pool:${leagueId}:${rosterFp}:dbmerge_v4:nflproj_v1:api:GET:/api/leagues/${leagueId}/draft/pool`
}

/**
 * Fast cache-only check: queries DB in <50 ms, never triggers a cold build.
 * Returns { warm: true } when a non-expired row exists for the league so the
 * resume/start path can proceed immediately without blocking on a pool build.
 */
export async function checkDraftPoolCacheFast(leagueId: string): Promise<{ warm: boolean }> {
  const t = Date.now()
  const model = getDraftPoolCacheModel()
  if (!model) {
    console.info('[draft-perf] pool fast-check: no model', { leagueId, ms: Date.now() - t })
    return { warm: false }
  }
  try {
    const fresh = await model.findFirst({
      where: { leagueId, expiresAt: { gt: new Date() } },
      select: { id: true },
    })
    const warm = Boolean(fresh)
    console.info('[draft-perf] pool fast-check', { leagueId, warm, ms: Date.now() - t })
    return { warm }
  } catch (err) {
    console.warn('[draft-perf] pool fast-check error (non-fatal):', (err as Error)?.message)
    return { warm: false }
  }
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

  // Fast path: any non-expired DB cache row means the pool will load quickly
  // for the next GET — the pool route finds rows by exact cacheKey, but the
  // presence of ANY row means a prior request already warmed this league.
  if (model) {
    try {
      const t = Date.now()
      const fresh = await model.findFirst({
        where: { leagueId, expiresAt: { gt: new Date() } },
        select: { id: true },
      })
      console.info('[draft-perf] ensureDraftPoolReady cache check', { leagueId, hit: Boolean(fresh), ms: Date.now() - t })
      if (fresh) return { ok: true, source: 'db-cache' }
    } catch {
      // DB cache table may not be generated yet — fall through to cold build
    }
  }

  // Cold path: build the pool and write to DB cache
  try {
    let effectiveLeagueTemplate: Awaited<ReturnType<typeof getEffectiveLeagueRosterTemplate>>
    try {
      effectiveLeagueTemplate = await getEffectiveLeagueRosterTemplate(leagueId)
    } catch {
      return { ok: false, error: 'League not found — cannot warm draft pool.' }
    }

    const starterEligible = starterEligiblePlayerPositionsFromTemplate(effectiveLeagueTemplate.template)
    const rosterFp = `${effectiveLeagueTemplate.hasPersistedRosterSchema ? 'cfg' : 'nocfg'}:starters:${rosterFingerprintFromEligible(
      starterEligible.size > 0 ? starterEligible : new Set(effectiveLeagueTemplate.allowedPositions),
    )}`
    const cacheKey = buildPrewarmCacheKey(leagueId, rosterFp)

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
