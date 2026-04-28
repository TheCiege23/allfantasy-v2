import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dbFirstMode } from '@/lib/db-first-mode'
import { assertLeagueMember } from '@/lib/league/league-access'
import { buildAnnualDraftPool } from '@/lib/devy/draftFormatEngine'

export const dynamic = 'force-dynamic'

type DevyDraftType = 'rookie' | 'devy' | 'combined'

function normalizeText(value: string | number | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parsePositiveInt(value: string | number | null | undefined): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.floor(parsed))
}

function buildDevyDraftCacheKey(input: {
  sport: string
  season: number
  draftType: DevyDraftType
  poolType: string
  teamCount: number
  limit: number
  leagueId: string
  draftId?: string | null
}): string {
  const sport = normalizeText(input.sport) || 'nfl'
  const season = parsePositiveInt(input.season)
  const draftType = normalizeText(input.draftType) || 'combined'
  const poolType = normalizeText(input.poolType) || 'devy-annual'
  const teamCount = parsePositiveInt(input.teamCount)
  const limit = parsePositiveInt(input.limit)
  const leagueId = normalizeText(input.leagueId) || 'unknown-league'
  const draftId = normalizeText(input.draftId) || 'none'
  return `devy:${sport}:${season}:${draftType}:${poolType}:${teamCount}:${limit}:league:${leagueId}:draft:${draftId}`
}

async function getCachedDevyDraftPool(input: {
  leagueId: string
  draftId?: string | null
  sport: string
  season: number
  draftType: DevyDraftType
  poolType: string
  teamCount: number
  limit: number
  forceRefresh?: boolean
}) {
  const cacheKey = buildDevyDraftCacheKey(input)
  const ttlSeconds = Math.max(1, dbFirstMode.draftPoolCacheTtlSeconds)
  const draftPoolCacheModel = (prisma as { draftPoolCache?: { findFirst: Function; upsert: Function } }).draftPoolCache

  if (!input.forceRefresh && draftPoolCacheModel?.findFirst) {
    const cached = await draftPoolCacheModel.findFirst({
      where: { cacheKey, expiresAt: { gt: new Date() } },
      select: { payload: true, syncedAt: true },
    })
    if (cached?.payload && typeof cached.payload === 'object') {
      console.info('devy pool cache hit', { cacheKey })
      return {
        pool: cached.payload,
        source: 'db-cache' as const,
        cacheKey,
        cachedAt: cached.syncedAt instanceof Date ? cached.syncedAt.toISOString() : null,
      }
    }
  }

  console.info('devy pool cache miss', { cacheKey })
  const rebuildStartedAt = Date.now()
  const pool = await buildAnnualDraftPool(input.leagueId, input.season, input.draftType)
  console.info('devy pool rebuild duration', {
    cacheKey,
    durationMs: Date.now() - rebuildStartedAt,
  })

  if (draftPoolCacheModel?.upsert) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
    await draftPoolCacheModel.upsert({
      where: { cacheKey },
      create: {
        leagueId: input.leagueId,
        cacheKey,
        sport: input.sport,
        poolType: input.poolType,
        sourceFingerprint: `devy:${input.sport}:${input.season}:${input.draftType}`,
        entryCount: (pool.rookieCandidates?.length ?? 0) + (pool.devyCandidates?.length ?? 0),
        payload: pool as unknown as object,
        expiresAt,
      },
      update: {
        sport: input.sport,
        poolType: input.poolType,
        sourceFingerprint: `devy:${input.sport}:${input.season}:${input.draftType}`,
        entryCount: (pool.rookieCandidates?.length ?? 0) + (pool.devyCandidates?.length ?? 0),
        payload: pool as unknown as object,
        syncedAt: new Date(),
        expiresAt,
      },
    })
    console.info('devy pool persisted row count', {
      cacheKey,
      entryCount: (pool.rookieCandidates?.length ?? 0) + (pool.devyCandidates?.length ?? 0),
    })
  }

  return {
    pool,
    source: 'rebuilt' as const,
    cacheKey,
    cachedAt: new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams?.get('leagueId')?.trim()
  const draftId = req.nextUrl.searchParams?.get('draftId')?.trim() || null
  const seasonParam = req.nextUrl.searchParams?.get('season')
  const poolType = req.nextUrl.searchParams?.get('poolType')?.trim() || 'devy_annual'
  const limit = parsePositiveInt(req.nextUrl.searchParams?.get('limit'))
  const forceRefresh =
    req.nextUrl.searchParams?.get('forceRefresh') === '1' ||
    req.nextUrl.searchParams?.get('forceRefresh') === 'true'
  const draftType = (req.nextUrl.searchParams?.get('draftType')?.trim() ?? 'combined') as
    | 'rookie'
    | 'devy'
    | 'combined'

  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const cfg = await prisma.devyLeague.findUnique({ where: { leagueId } })
  if (!cfg) return NextResponse.json({ error: 'Devy league not configured' }, { status: 404 })

  const leagueMeta = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, _count: { select: { rosters: true } } },
  })

  const season = seasonParam ? Number(seasonParam) : cfg.season
  const cached = await getCachedDevyDraftPool({
    leagueId,
    draftId,
    sport: leagueMeta?.sport ?? 'NFL',
    season,
    draftType,
    poolType,
    teamCount: leagueMeta?._count?.rosters ?? 0,
    limit,
    forceRefresh,
  })
  const pool = cached.pool
  return NextResponse.json({ pool })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as {
    leagueId?: string
    draftId?: string
    season?: number
    draftType?: 'rookie' | 'devy' | 'combined'
    poolType?: string
    limit?: number
    teamCount?: number
    sport?: string
    forceRefresh?: boolean
  }
  const leagueId = body.leagueId?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const cfg = await prisma.devyLeague.findUnique({ where: { leagueId } })
  if (!cfg) return NextResponse.json({ error: 'Devy league not configured' }, { status: 404 })

  const season = body.season ?? cfg.season
  const draftType = body.draftType ?? 'combined'
  const leagueMeta = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, _count: { select: { rosters: true } } },
  })

  const cached = await getCachedDevyDraftPool({
    leagueId,
    draftId: body.draftId?.trim() || null,
    sport: body.sport?.trim() || leagueMeta?.sport || 'NFL',
    season,
    draftType,
    poolType: body.poolType?.trim() || 'devy_annual',
    teamCount: body.teamCount ?? leagueMeta?._count?.rosters ?? 0,
    limit: parsePositiveInt(body.limit),
    forceRefresh: Boolean(body.forceRefresh),
  })
  const pool = cached.pool
  return NextResponse.json({ ok: true, initialized: true, pool })
}

