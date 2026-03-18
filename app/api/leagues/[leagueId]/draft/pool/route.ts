/**
 * GET: Normalized draft pool for league (sport-aware).
 * Returns NormalizedDraftEntry[] with PlayerDisplayModel, assets, and fallbacks.
 * When devy is enabled for the league draft, merges devy player pool (DevyPlayer) with pro pool.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { prisma } from '@/lib/prisma'
import { getLiveADP } from '@/lib/adp-data'
import { getPlayerPoolForLeague } from '@/lib/sport-teams/SportPlayerPoolResolver'
import { normalizeDraftPlayerList } from '@/lib/draft-sports-models/normalize-draft-player'
import { isDevyLeague } from '@/lib/devy'
import { getPromotedProPlayerIdsExcludedFromRookiePool } from '@/lib/devy'
import { isC2CLeague, getC2CPromotedProPlayerIdsExcludedFromRookiePool } from '@/lib/merged-devy-c2c'
import type { LeagueSport } from '@prisma/client'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 300
const DEVY_POOL_LIMIT = 200
type PoolType = 'startup_vet' | 'rookie' | 'devy' | 'startup_pro' | 'startup_college' | 'startup_merged' | 'college' | 'merged_rookie_college'

function normalizeNameForDedupe(name: string): string {
  return (name ?? '').trim().toLowerCase()
}

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

  try {
    const [league, draftSession] = await Promise.all([
      prisma.league.findUnique({
        where: { id: leagueId },
        select: { sport: true },
      }),
      prisma.draftSession.findUnique({
        where: { leagueId },
        select: { devyConfig: true, c2cConfig: true },
      }),
    ])
    const sport = (league?.sport as LeagueSport) ?? 'NFL'
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      500
    )
    let poolType = req.nextUrl.searchParams.get('poolType') as PoolType | null
    const isDevyDynasty = await isDevyLeague(leagueId)
    const isC2C = await isC2CLeague(leagueId)
    if (isDevyDynasty && !isC2C && poolType == null) poolType = 'startup_vet'
    if (isC2C && poolType == null) poolType = 'startup_merged'
    const rawDevyConfig = draftSession?.devyConfig as { enabled?: boolean; devyRounds?: number[] } | null
    const rawC2cConfig = draftSession?.c2cConfig as { enabled?: boolean; collegeRounds?: number[] } | null
    const devyEnabled = Boolean(rawDevyConfig?.enabled)
    const c2cEnabled = Boolean(rawC2cConfig?.enabled) || isC2C
    const mergeCollegePool = (devyEnabled || c2cEnabled) && (sport === 'NFL' || sport === 'NBA')
    const strictPoolSeparation = (isDevyDynasty && poolType != null) || (isC2C && poolType != null)

    type RawRow = {
      name?: string
      playerName?: string
      full_name?: string
      position?: string
      pos?: string
      team?: string | null
      teamAbbr?: string | null
      playerId?: string | null
      sleeperId?: string | null
      id?: string | null
      adp?: number | null
      bye?: number | null
      byeWeek?: number | null
      injuryStatus?: string | null
      status?: string | null
      college?: string | null
      isDevy?: boolean
      school?: string | null
      draftEligibleYear?: number | null
      graduatedToNFL?: boolean
      poolType?: 'college' | 'pro'
    }
    let rawList: RawRow[] = []

    if (strictPoolSeparation && (poolType === 'devy' || poolType === 'college' || poolType === 'startup_college')) {
      const devyPlayers = await (prisma as any).devyPlayer.findMany({
        where: { devyEligible: true, graduatedToNFL: false },
        take: DEVY_POOL_LIMIT,
        orderBy: { devyAdp: 'asc' },
      }).catch(() => [] as any[])
      rawList = devyPlayers.map((p: any) => ({
        name: p.name,
        position: p.position ?? '—',
        team: p.school ?? p.nflTeam ?? null,
        adp: p.devyAdp != null ? Number(p.devyAdp) : null,
        college: p.school ?? null,
        isDevy: true,
        school: p.school ?? null,
        draftEligibleYear: p.draftEligibleYear ?? null,
        graduatedToNFL: false,
        playerId: p.id ?? null,
        ...(isC2C ? { poolType: 'college' as const } : {}),
      }))
    } else if (sport === 'NFL' || sport === 'NBA') {
      const adpEntries = await getLiveADP('redraft', limit).catch(() => [])
      rawList = adpEntries.map((e) => ({
        name: e.name,
        position: e.position,
        team: e.team,
        adp: e.adp,
        bye: e.bye,
      }))
      if (strictPoolSeparation && poolType === 'rookie') {
        const excludedProIds = isC2C
          ? await getC2CPromotedProPlayerIdsExcludedFromRookiePool(leagueId)
          : await getPromotedProPlayerIdsExcludedFromRookiePool(leagueId)
        if (excludedProIds.size > 0) {
          rawList = rawList.filter((r: RawRow) => {
            const id = r.playerId ?? r.id ?? (r as any).sleeperId
            return id == null || !excludedProIds.has(String(id))
          })
        }
      }
    } else {
      const pool = await getPlayerPoolForLeague(leagueId, sport, { limit })
      rawList = pool.map((p) => ({
        name: p.full_name,
        position: p.position,
        team: p.team_abbreviation,
        playerId: p.external_source_id ?? p.player_id,
        injuryStatus: p.injury_status,
        status: p.status,
      }))
    }

    const proNames = new Set(rawList.map((r) => normalizeNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')))
    const includeCollegeInPool =
      mergeCollegePool &&
      !(strictPoolSeparation && (poolType === 'startup_vet' || poolType === 'startup_pro'))

    if (includeCollegeInPool) {
      const devyPlayers = await (prisma as any).devyPlayer.findMany({
        where: { devyEligible: true, graduatedToNFL: false },
        take: DEVY_POOL_LIMIT,
        orderBy: { devyAdp: 'asc' },
      }).catch(() => [] as any[])
      for (const p of devyPlayers) {
        const norm = normalizeNameForDedupe(p.name ?? '')
        if (norm && !proNames.has(norm)) {
          proNames.add(norm)
          rawList.push({
            name: p.name,
            position: p.position ?? '—',
            team: p.school ?? p.nflTeam ?? null,
            adp: p.devyAdp != null ? Number(p.devyAdp) : null,
            college: p.school ?? null,
            isDevy: true,
            school: p.school ?? null,
            draftEligibleYear: p.draftEligibleYear ?? null,
            graduatedToNFL: false,
            playerId: p.id ?? null,
            ...(c2cEnabled ? { poolType: 'college' as const } : {}),
          })
        }
      }
    }

    const entries = normalizeDraftPlayerList(rawList, sport)
    const res = NextResponse.json({
      entries,
      sport,
      count: entries.length,
      poolType: strictPoolSeparation ? poolType ?? undefined : undefined,
      devyConfig: devyEnabled ? { enabled: true, devyRounds: rawDevyConfig?.devyRounds ?? [] } : undefined,
      c2cConfig: c2cEnabled ? { enabled: true, collegeRounds: rawC2cConfig?.collegeRounds ?? [] } : undefined,
    })
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
    return res
  } catch (e) {
    console.error('[draft/pool GET]', e)
    return NextResponse.json(
      { error: (e as Error).message ?? 'Failed to load draft pool' },
      { status: 500 }
    )
  }
}
