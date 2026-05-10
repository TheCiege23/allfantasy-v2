/**
 * Prewarm the draft pool DB cache before starting or resuming a draft.
 *
 * Fast path: if draftPoolCache has any non-expired row for the league, the
 *            pool will return from DB cache on the next GET — return immediately.
 *
 * Slow path: build getResolvedDraftPoolForLeague and persist to draftPoolCache
 *            using the same key the pool route uses for a standard (no-param)
 *            request, so the next GET /draft/pool hits the DB cache.
 *
 * Failure path: if building fails, return { ok: false } so the controls route
 *               can refuse to start/resume the timer.
 *
 * Called from /draft/controls before 'start' and 'resume' so the timer never
 * begins while managers are waiting for a cold pool load (60–90 s).
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

export async function ensureDraftPoolReady(leagueId: string): Promise<EnsureDraftPoolReadyResult> {
  const model = getDraftPoolCacheModel()

  // Fast path: any non-expired DB cache row means the pool will load quickly
  // for the next GET — the pool route finds rows by exact cacheKey, but the
  // presence of ANY row means a prior request already warmed this league.
  if (model) {
    try {
      const fresh = await model.findFirst({
        where: { leagueId, expiresAt: { gt: new Date() } },
        select: { id: true },
      })
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

    const resolved = await getResolvedDraftPoolForLeague(leagueId, {
      limit: 300,
      poolType: null,
      effectiveLeagueTemplate,
    })

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
