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
import { normalizePlayerList } from '@/lib/draft-asset-pipeline'
import { isDevyLeague } from '@/lib/devy'
import { getPromotedProPlayerIdsExcludedFromRookiePool } from '@/lib/devy'
import { isC2CLeague, getC2CPromotedProPlayerIdsExcludedFromRookiePool } from '@/lib/merged-devy-c2c'
import type { LeagueSport } from '@prisma/client'
import { getEffectiveLeagueRosterTemplate } from '@/lib/league/getEffectiveLeagueRosterTemplate'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import { apiChain } from '@/lib/workers/api-chain'
import { legacySupportedSportToApiChain } from '@/lib/workers/api-config'
import {
  API_CACHE_TTL,
  buildApiCacheKey,
  dedupeInFlight,
  getApiCached,
  setApiCached,
} from '@/lib/api-performance'
import {
  draftPoolRowMatchesEligiblePositions,
  rosterFingerprintFromEligible,
} from '@/lib/draft-room/draft-pool-eligible-positions'
import {
  defaultNflPlayerStatsSeason,
  loadRollingInsightsSeasonByDraftPoolKey,
  resolveNflDraftPoolAnalytics,
  type RollingInsightsSeasonSlice,
} from '@/lib/draft/analytics/nfl-rolling-insights-draft-analytics'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 300
const DEVY_POOL_LIMIT = 200
const IDP_POOL_LIMIT = 200
/** IDP defensive positions for merging into draft pool when league is IDP. */
const IDP_POSITIONS = ['DE', 'DT', 'LB', 'CB', 'S']
type PoolType = 'startup_vet' | 'rookie' | 'devy' | 'startup_pro' | 'startup_college' | 'startup_merged' | 'college' | 'merged_rookie_college'
const DRAFT_POOL_CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=120'

function normalizeNameForDedupe(name: string): string {
  return (name ?? '').trim().toLowerCase()
}

function normalizeKeyPart(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

/** Max players after merging ranked/seed list with DB pool (snake/linear/devy paths; not auction). */
function poolMergeCap(limit: number): number {
  return Math.min(2200, Math.max(limit, 800))
}

type SportPoolRow = {
  full_name: string
  position: string
  team_abbreviation: string | null
  external_source_id: string | null
  injury_status: string | null
  secondary_positions?: string[]
  image_url?: string | null
  status?: string | null
  player_id?: string | null
  age?: number | null
}

/** Normalized draft pool row before `normalizePlayerList` (all sports). */
export type DraftPoolRawRow = {
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
  secondaryPositions?: string[]
  college?: string | null
  isDevy?: boolean
  school?: string | null
  classYearLabel?: string | null
  draftGrade?: string | null
  projectedLandingSpot?: string | null
  draftEligibleYear?: number | null
  graduatedToNFL?: boolean
  poolType?: 'college' | 'pro'
  imageUrl?: string | null
  age?: number | null
  fantasyPointsPerGame?: number | null
  lifetimeValue?: number | null
}

/**
 * Append DB pool players not already in rawList until mergeCap (snake/linear; all sports).
 * Auction drafts use this alone (no ADP-ranked seed list).
 */
function mergeDbPoolIntoRawList(
  rawList: DraftPoolRawRow[],
  poolRows: SportPoolRow[],
  mergeCap: number,
  useMixedPoolTypeMarkers: boolean,
  seenNames: Set<string>,
): void {
  for (const p of poolRows) {
    if (rawList.length >= mergeCap) break
    const norm = normalizeNameForDedupe(p.full_name ?? '')
    if (!norm || seenNames.has(norm)) continue
    seenNames.add(norm)
    rawList.push({
      name: p.full_name,
      position: p.position ?? '—',
      team: p.team_abbreviation ?? null,
      playerId: p.external_source_id ?? p.player_id ?? null,
      adp: null,
      bye: null,
      injuryStatus: p.injury_status ?? null,
      status: p.status ?? null,
      secondaryPositions: Array.isArray(p.secondary_positions) ? p.secondary_positions : undefined,
      imageUrl: p.image_url ?? null,
      age: p.age ?? null,
      ...(useMixedPoolTypeMarkers ? { poolType: 'pro' as const } : {}),
    })
  }
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

  let effectiveLeagueTemplate: Awaited<ReturnType<typeof getEffectiveLeagueRosterTemplate>>
  try {
    effectiveLeagueTemplate = await getEffectiveLeagueRosterTemplate(leagueId)
  } catch {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const rosterFp = `${effectiveLeagueTemplate.hasPersistedRosterSchema ? 'cfg' : 'nocfg'}:${rosterFingerprintFromEligible(
    new Set(effectiveLeagueTemplate.allowedPositions),
  )}`
  const cacheKey = `draft_pool:${leagueId}:${rosterFp}:${buildApiCacheKey('GET', req.url)}`
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

      if (!effectiveLeagueTemplate.hasPersistedRosterSchema) {
        const responsePayload = {
          entries: [],
          sport: effectiveLeagueTemplate.sport,
          count: 0,
          rosterConfigurationIncomplete: true as const,
          isIdp: effectiveLeagueTemplate.idpEnabled || undefined,
        }
        setApiCached(cacheKey, responsePayload, {
          ttlMs: API_CACHE_TTL.SHORT,
          status: 200,
          headers: { 'Cache-Control': DRAFT_POOL_CACHE_CONTROL },
        })
        return responsePayload
      }

      const eligiblePositions =
        effectiveLeagueTemplate.allowedPositions.size > 0
          ? new Set<string>(effectiveLeagueTemplate.allowedPositions)
          : null

      const [league, draftSession] = await Promise.all([
        prisma.league.findUnique({
          where: { id: leagueId },
          select: {
            sport: true,
            leagueVariant: true,
            settings: true,
            starters: true,
            leagueSettings: { select: { draftType: true } },
          },
        }),
        prisma.draftSession.findUnique({
          where: { leagueId },
          select: { devyConfig: true, c2cConfig: true, keeperSelections: true, draftType: true },
        }),
      ])
      const sport = (league?.sport as LeagueSport) ?? DEFAULT_SPORT
      const settingsDraftType = String(league?.leagueSettings?.draftType ?? '').toLowerCase()
      const sessionDraftType = draftSession?.draftType ? String(draftSession.draftType).toLowerCase() : ''
      const isAuction =
        sessionDraftType === 'auction' || (!sessionDraftType && settingsDraftType === 'auction')
      const limit = Math.min(
        parseInt(req.nextUrl.searchParams?.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
        500
      )
      let poolType = req.nextUrl.searchParams?.get('poolType') as PoolType | null
      const isDevyDynasty = await isDevyLeague(leagueId)
      const isC2C = await isC2CLeague(leagueId)
      const rawDevyConfig = draftSession?.devyConfig as { enabled?: boolean; devyRounds?: number[] } | null
      const rawC2cConfig = draftSession?.c2cConfig as { enabled?: boolean; collegeRounds?: number[] } | null
      const devyEnabled = Boolean(rawDevyConfig?.enabled)
      const c2cEnabled = Boolean(rawC2cConfig?.enabled) || isC2C
      const liveDraftUsesDevyPools = devyEnabled || c2cEnabled
      if (isDevyDynasty && !isC2C && poolType == null && !liveDraftUsesDevyPools) poolType = 'startup_vet'
      if (isC2C && poolType == null && !liveDraftUsesDevyPools) poolType = 'startup_merged'
      const mergeCollegePool = (devyEnabled || c2cEnabled) && (sport === 'NFL' || sport === 'NBA')
      const strictPoolSeparation = (isDevyDynasty && poolType != null) || (isC2C && poolType != null)
      const useMixedPoolTypeMarkers = mergeCollegePool || c2cEnabled || devyEnabled

      type RawRow = DraftPoolRawRow
      let rawList: RawRow[] = []
      const poolRows = await getPlayerPoolForLeague(leagueId, sport, {
        limit: Math.min(Math.max(limit * 4, 800), 2200),
      }).catch(() => [] as Array<{
        full_name: string
        position: string
        team_abbreviation: string | null
        external_source_id: string | null
        injury_status: string | null
        secondary_positions?: string[]
      }>)
      const poolByStrictKey = new Map<string, typeof poolRows[number]>()
      const poolByLooseKey = new Map<string, typeof poolRows[number]>()
      for (const row of poolRows) {
        const nameKey = normalizeKeyPart(row.full_name)
        const posKey = normalizeKeyPart(row.position)
        const teamKey = normalizeKeyPart(row.team_abbreviation)
        if (!nameKey || !posKey) continue
        const strict = `${nameKey}|${posKey}|${teamKey}`
        const loose = `${nameKey}|${posKey}`
        if (!poolByStrictKey.has(strict)) poolByStrictKey.set(strict, row)
        if (!poolByLooseKey.has(loose)) poolByLooseKey.set(loose, row)
      }

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
        classYearLabel: p.classYearLabel ?? null,
        draftGrade: p.draftGrade ?? null,
        projectedLandingSpot: p.nflTeam ?? null,
        draftEligibleYear: p.draftEligibleYear ?? null,
        graduatedToNFL: false,
        playerId: p.id ?? null,
        ...(isC2C || devyEnabled ? { poolType: 'college' as const } : {}),
      }))
      } else if (isAuction) {
        rawList = []
        const seenAuction = new Set<string>()
        mergeDbPoolIntoRawList(
          rawList,
          poolRows as SportPoolRow[],
          poolMergeCap(limit),
          useMixedPoolTypeMarkers,
          seenAuction,
        )
      } else if (sport === 'NFL') {
      const adpEntries = await getLiveADP('redraft', Math.min(500, Math.max(limit, 400))).catch(() => [])
      rawList = adpEntries.map((e) => ({
        name: e.name,
        position: e.position,
        team: e.team,
        adp: e.adp,
        bye: e.bye,
        ...(useMixedPoolTypeMarkers ? { poolType: 'pro' as const } : {}),
      }))
      if (effectiveLeagueTemplate.idpEnabled) {
        const idpFiltered = poolRows
          .filter((p) => IDP_POSITIONS.includes(p.position?.trim()?.toUpperCase() ?? ''))
          .slice(0, IDP_POOL_LIMIT)
        const seenNames = new Set(rawList.map((r) => normalizeNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')))
        for (const p of idpFiltered) {
          const norm = normalizeNameForDedupe(p.full_name ?? '')
          if (norm && !seenNames.has(norm)) {
            seenNames.add(norm)
            rawList.push({
              name: p.full_name,
              position: p.position ?? '—',
              team: p.team_abbreviation ?? null,
              playerId: p.external_source_id ?? (p as { player_id?: string | null }).player_id ?? null,
              adp: null,
              bye: null,
              ...(useMixedPoolTypeMarkers ? { poolType: 'pro' as const } : {}),
            })
          }
        }
      }
      // ADP-only lists are often short; merge DB pool for full sport universe + external IDs for assets/APIs.
      const seenAfterRanked = new Set(
        rawList.map((r) => normalizeNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')),
      )
      mergeDbPoolIntoRawList(
        rawList,
        poolRows as SportPoolRow[],
        poolMergeCap(limit),
        useMixedPoolTypeMarkers,
        seenAfterRanked,
      )
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
      rawList = poolRows.slice(0, limit).map((p) => ({
        name: p.full_name,
        position: p.position,
        team: p.team_abbreviation,
        playerId: p.external_source_id ?? (p as { player_id?: string | null }).player_id ?? null,
        injuryStatus: p.injury_status,
        status: (p as { status?: string | null }).status ?? null,
        imageUrl: (p as { image_url?: string | null }).image_url ?? null,
        age: (p as { age?: number | null }).age ?? null,
        ...(useMixedPoolTypeMarkers ? { poolType: 'pro' as const } : {}),
      }))
      const seenNonNfl = new Set(
        rawList.map((r) => normalizeNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')),
      )
      mergeDbPoolIntoRawList(
        rawList,
        poolRows as SportPoolRow[],
        poolMergeCap(limit),
        useMixedPoolTypeMarkers,
        seenNonNfl,
      )
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
            classYearLabel: p.classYearLabel ?? null,
            draftGrade: p.draftGrade ?? null,
            projectedLandingSpot: p.nflTeam ?? null,
            draftEligibleYear: p.draftEligibleYear ?? null,
            graduatedToNFL: false,
            playerId: p.id ?? null,
            ...(c2cEnabled || devyEnabled ? { poolType: 'college' as const } : {}),
          })
        }
      }
      }

      let rawListFiltered = rawList
      const keeperSelections = draftSession?.keeperSelections as Array<{ playerName?: string }> | null
      if (Array.isArray(keeperSelections) && keeperSelections.length > 0) {
        const keptNames = new Set(keeperSelections.map((k) => normalizeNameForDedupe(k.playerName ?? '')).filter(Boolean))
        if (keptNames.size > 0) {
          rawListFiltered = rawList.filter(
            (r: RawRow) => !keptNames.has(normalizeNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? ''))
          )
        }
      }

      if (eligiblePositions?.size) {
        rawListFiltered = rawListFiltered.filter((r: RawRow) =>
          draftPoolRowMatchesEligiblePositions(r.position ?? r.pos ?? '', eligiblePositions),
        )
      }

      const analyticsByKey = new Map<
        string,
        { fantasyPointsPerGame: number | null; lifetimeValue: number | null; updatedAt: Date | null }
      >()
      let identityByPoolKey = new Map<
        string,
        { rollingInsightsPlayerId: string; confidence: 'high' }
      >()
      let riSeasonByPlayerId = new Map<string, RollingInsightsSeasonSlice>()

      if (sport === 'NFL' && rawListFiltered.length > 0) {
        const nameKeys = [
          ...new Set(
            rawListFiltered
              .map((r) => normalizeNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? ''))
              .filter(Boolean),
          ),
        ].slice(0, 1200)
        if (nameKeys.length > 0) {
          const analyticsRows = await prisma.playerAnalyticsSnapshot
            .findMany({
              where: { normalizedName: { in: nameKeys } },
              select: {
                normalizedName: true,
                position: true,
                fantasyPointsPerGame: true,
                lifetimeValue: true,
                updatedAt: true,
              },
            })
            .catch(
              () =>
                [] as Array<{
                  normalizedName: string
                  position: string | null
                  fantasyPointsPerGame: number | null
                  lifetimeValue: number | null
                  updatedAt: Date
                }>,
            )
          for (const row of analyticsRows) {
            const nk = normalizeNameForDedupe(row.normalizedName ?? '')
            const pk = normalizeKeyPart(row.position ?? '')
            if (!nk || !pk) continue
            analyticsByKey.set(`${nk}|${pk}`, {
              fantasyPointsPerGame: row.fantasyPointsPerGame ?? null,
              lifetimeValue: row.lifetimeValue ?? null,
              updatedAt: row.updatedAt ?? null,
            })
          }
        }

        const riRows = rawListFiltered.map((r: RawRow) => {
          const nk = normalizeNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')
          const pk = normalizeKeyPart(r.position ?? r.pos ?? '')
          const sid = r.playerId ?? r.sleeperId ?? r.id ?? null
          const sleeperCandidate = sid != null && String(sid).trim() !== '' ? String(sid).trim() : null
          return { nk, pk, sleeperCandidate }
        })
        const loaded = await loadRollingInsightsSeasonByDraftPoolKey({ rows: riRows })
        identityByPoolKey = loaded.identityByPoolKey
        riSeasonByPlayerId = loaded.riSeasonByPlayerId
      }

      const nflStatsSeason = sport === 'NFL' ? defaultNflPlayerStatsSeason() : ''

      const promotedMap = new Map<string, { school: string | null }>()
      if (devyEnabled || c2cEnabled || isDevyDynasty || isC2C) {
        const promotedRows = await (prisma as any).devyPlayer.findMany({
          where: { graduatedToNFL: true },
          select: { normalizedName: true, name: true, position: true, school: true },
          take: 3000,
        }).catch(() => [] as any[])
        for (const p of promotedRows) {
          const nameKey = normalizeNameForDedupe(p.name ?? '')
          const posKey = normalizeKeyPart(p.position ?? '')
          if (!nameKey || !posKey) continue
          promotedMap.set(`${nameKey}|${posKey}`, { school: p.school ?? null })
        }
      }

      const enrichedList = rawListFiltered.map((row) => {
        const name = row.name ?? row.playerName ?? row.full_name ?? ''
        const position = row.position ?? row.pos ?? ''
        const team = row.team ?? row.teamAbbr ?? null
        const strict = `${normalizeKeyPart(name)}|${normalizeKeyPart(position)}|${normalizeKeyPart(team)}`
        const loose = `${normalizeKeyPart(name)}|${normalizeKeyPart(position)}`
        const poolMatch = poolByStrictKey.get(strict) ?? poolByLooseKey.get(loose)
        const promoted = promotedMap.get(`${normalizeNameForDedupe(name)}|${normalizeKeyPart(position)}`)
        const poolAnalyticsKey = `${normalizeNameForDedupe(name)}|${normalizeKeyPart(position)}`
        const analytics = analyticsByKey.get(poolAnalyticsKey)
        const idn = identityByPoolKey.get(poolAnalyticsKey)
        const riSlice = idn ? riSeasonByPlayerId.get(idn.rollingInsightsPlayerId) ?? null : null
        const resolvedAnalytics =
          sport === 'NFL'
            ? resolveNflDraftPoolAnalytics({
                snapshot: analytics
                  ? {
                      fantasyPointsPerGame: analytics.fantasyPointsPerGame,
                      lifetimeValue: analytics.lifetimeValue,
                      updatedAt: analytics.updatedAt,
                    }
                  : null,
                rollingInsights: riSlice,
                identityMatchConfidence: idn ? 'high' : 'none',
                currentStatsSeason: nflStatsSeason,
              })
            : null
        const base = poolMatch
          ? {
              ...row,
              team: row.team ?? row.teamAbbr ?? poolMatch.team_abbreviation ?? null,
              teamAbbr: row.teamAbbr ?? row.team ?? poolMatch.team_abbreviation ?? null,
              playerId: row.playerId ?? row.sleeperId ?? row.id ?? poolMatch.external_source_id ?? null,
              injuryStatus: row.injuryStatus ?? row.status ?? poolMatch.injury_status ?? null,
              secondaryPositions: Array.isArray(poolMatch.secondary_positions) ? poolMatch.secondary_positions : undefined,
              age: (row as RawRow).age ?? (poolMatch as { age?: number | null }).age ?? null,
              imageUrl:
                (row as RawRow).imageUrl ??
                (poolMatch as { image_url?: string | null }).image_url ??
                null,
            }
          : { ...row }
        return {
          ...base,
          graduatedToNFL: row.graduatedToNFL ?? (promoted ? true : undefined),
          school: row.school ?? promoted?.school ?? null,
          college: row.college ?? promoted?.school ?? null,
          fantasyPointsPerGame:
            resolvedAnalytics?.fantasyPointsPerGame ??
            analytics?.fantasyPointsPerGame ??
            (row as RawRow).fantasyPointsPerGame ??
            undefined,
          lifetimeValue:
            resolvedAnalytics?.lifetimeValue ??
            analytics?.lifetimeValue ??
            (row as RawRow).lifetimeValue ??
            undefined,
          rollingInsightsSupplemental: resolvedAnalytics?.rollingInsightsSupplemental ?? undefined,
        } as RawRow
      })

      const entries = normalizePlayerList(enrichedList, sport)
      const responsePayload = {
        entries,
        sport,
        count: entries.length,
        rosterConfigurationIncomplete: false as const,
        poolType: strictPoolSeparation ? poolType ?? undefined : undefined,
        devyConfig: devyEnabled ? { enabled: true, devyRounds: rawDevyConfig?.devyRounds ?? [] } : undefined,
        c2cConfig: c2cEnabled ? { enabled: true, collegeRounds: rawC2cConfig?.collegeRounds ?? [] } : undefined,
        isIdp: effectiveLeagueTemplate.idpEnabled || undefined,
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
