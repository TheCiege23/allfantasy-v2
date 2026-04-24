/**
 * GET: Normalized draft pool for league (sport-aware).
 * Returns NormalizedDraftEntry[] with PlayerDisplayModel, assets, and fallbacks.
 * Core implementation: `getResolvedDraftPoolForLeague`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import {
  getEffectiveLeagueRosterTemplate,
  starterEligiblePlayerPositionsFromTemplate,
} from '@/lib/league/getEffectiveLeagueRosterTemplate'
import type { LeagueSport } from '@prisma/client'
import { apiChain } from '@/lib/workers/api-chain'
import { legacySupportedSportToApiChain } from '@/lib/workers/api-config'
import {
  API_CACHE_TTL,
  buildApiCacheKey,
  dedupeInFlight,
  getApiCached,
  setApiCached,
} from '@/lib/api-performance'
import { rosterFingerprintFromEligible } from '@/lib/draft-room/draft-pool-eligible-positions'
import {
  getResolvedDraftPoolForLeague,
  type DraftPoolRawRow,
  type PoolType,
} from '@/lib/draft-room/getResolvedDraftPoolForLeague'

export const dynamic = 'force-dynamic'

/** @deprecated Import from `@/lib/draft-room/getResolvedDraftPoolForLeague` */
export type { DraftPoolRawRow, PoolType }

const DEFAULT_LIMIT = 300
const DRAFT_POOL_CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=120'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let effectiveLeagueTemplate: Awaited<ReturnType<typeof getEffectiveLeagueRosterTemplate>>
  try {
    effectiveLeagueTemplate = await getEffectiveLeagueRosterTemplate(leagueId)
  } catch {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const starterEligible = starterEligiblePlayerPositionsFromTemplate(effectiveLeagueTemplate.template)
  const rosterFp = `${effectiveLeagueTemplate.hasPersistedRosterSchema ? 'cfg' : 'nocfg'}:starters:${rosterFingerprintFromEligible(
    starterEligible.size > 0 ? starterEligible : new Set(effectiveLeagueTemplate.allowedPositions),
  )}`
  const cacheKey = `draft_pool:${leagueId}:${rosterFp}:dbmerge_v2:nflproj_v1:${buildApiCacheKey('GET', req.url)}`
  const cached = getApiCached(cacheKey)
  if (cached) {
    const response = NextResponse.json(cached.body, { status: cached.status })
    for (const [header, value] of Object.entries(cached.headers)) {
      response.headers.set(header, value)
    }
    if (!cached.headers['Cache-Control']) {
      response.headers.set('Cache-Control', DRAFT_POOL_CACHE_CONTROL)
    }
    return response
  }

  try {
    const payload = await dedupeInFlight(cacheKey, async () => {
      const hotCached = getApiCached(cacheKey)
      if (hotCached) return hotCached.body

      const limit = Math.min(
        parseInt(req.nextUrl.searchParams?.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
        500,
      )
      const poolType = req.nextUrl.searchParams?.get('poolType') as PoolType | null

      const resolved = await getResolvedDraftPoolForLeague(leagueId, {
        limit,
        poolType,
        effectiveLeagueTemplate,
      })

      if (resolved.rosterConfigurationIncomplete) {
        const responsePayload = {
          entries: [],
          sport: resolved.sport,
          count: 0,
          rosterConfigurationIncomplete: true as const,
          isIdp: resolved.isIdp,
        }
        setApiCached(cacheKey, responsePayload, {
          ttlMs: API_CACHE_TTL.SHORT,
          status: 200,
          headers: { 'Cache-Control': DRAFT_POOL_CACHE_CONTROL },
        })
        return responsePayload
      }

      const responsePayload = {
        entries: resolved.entries,
        sport: resolved.sport,
        count: resolved.count,
        rosterConfigurationIncomplete: false as const,
        poolType: resolved.poolType,
        devyConfig: resolved.devyConfig,
        c2cConfig: resolved.c2cConfig,
        isIdp: resolved.isIdp,
      }
      setApiCached(cacheKey, responsePayload, {
        ttlMs: API_CACHE_TTL.SHORT,
        status: 200,
        headers: { 'Cache-Control': DRAFT_POOL_CACHE_CONTROL },
      })
      return responsePayload
    })

    if (payload && typeof payload === 'object' && 'sport' in payload) {
      const s = (payload as { sport: LeagueSport }).sport
      const chainSport = legacySupportedSportToApiChain(s)
      void Promise.allSettled([
        apiChain.fetch({ sport: chainSport, dataType: 'injuries' }),
        apiChain.fetch({ sport: chainSport, dataType: 'schedule' }),
      ]).catch(() => {})
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', DRAFT_POOL_CACHE_CONTROL)
    return res
  } catch (e) {
    console.error('[draft/pool GET]', e)
    return NextResponse.json(
      { error: (e as Error).message ?? 'Failed to load draft pool' },
      { status: 500 }
    )
  }
}
