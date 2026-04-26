/**
 * Single server source for normalized draft pool rows (same enrichment as GET /draft/pool).
 * Use from API route, DraftWorker, autopick fallback, and tests.
 */

import { prisma } from '@/lib/prisma'
import { classifyAvatarSource } from '@/lib/draft-room/classify-avatar-source'
import { getLiveADP } from '@/lib/adp-data'
import { getPlayerPoolForLeague } from '@/lib/sport-teams/SportPlayerPoolResolver'
import { normalizePlayerList, type NormalizedDraftEntry } from '@/lib/draft-asset-pipeline'
import { isDevyLeague } from '@/lib/devy'
import { getPromotedProPlayerIdsExcludedFromRookiePool } from '@/lib/devy'
import { isC2CLeague, getC2CPromotedProPlayerIdsExcludedFromRookiePool } from '@/lib/merged-devy-c2c'
import type { LeagueSport } from '@prisma/client'
import {
  getEffectiveLeagueRosterTemplate,
  starterEligiblePlayerPositionsFromTemplate,
} from '@/lib/league/getEffectiveLeagueRosterTemplate'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import {
  draftPoolRowMatchesEligiblePositions,
} from '@/lib/draft-room/draft-pool-eligible-positions'
import {
  defaultNflPlayerStatsSeason,
  loadRollingInsightsSeasonByDraftPoolKey,
  loadRollingInsightsStatsDetailByPlayerIds,
  resolveNflDraftPoolAnalytics,
  type RollingInsightsSeasonSlice,
  type RollingInsightsStatsDetailRow,
} from '@/lib/draft/analytics/nfl-rolling-insights-draft-analytics'
import {
  buildNflDraftProjectionSplits,
  emptyNflDraftProjectionSplits,
  type NflDraftProjectionSplits,
} from '@/lib/draft/analytics/nfl-draft-pool-projection-splits'
import { loadNflRookieLookup, lookupYearsExp, type NflRookieLookup } from '@/lib/draft-room/nflRookieLookup'

const DEFAULT_LIMIT = 300
const DEVY_POOL_LIMIT = 200
const IDP_POOL_LIMIT = 200
const IDP_POSITIONS = ['DE', 'DT', 'LB', 'CB', 'S']

export type PoolType =
  | 'startup_vet'
  | 'rookie'
  | 'devy'
  | 'startup_pro'
  | 'startup_college'
  | 'startup_merged'
  | 'college'
  | 'merged_rookie_college'

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
  nflDraftProjectionSplits?: NflDraftProjectionSplits
  /** D.7 — Sleeper years_exp; 0 = rookie. Only attached for NFL pools. */
  yearsExp?: number | null
  isRookie?: boolean | null
}

export type GetResolvedDraftPoolOptions = {
  limit?: number
  poolType?: PoolType | null
  /** Normalized lowercase trimmed names — excludes rows matching drafted picks by name. */
  excludeDraftedNames?: ReadonlySet<string>
  excludeDraftedPlayerIds?: ReadonlySet<string>
  /**
   * When provided, skips getEffectiveLeagueRosterTemplate (caller already loaded for cache keys).
   */
  effectiveLeagueTemplate?: Awaited<ReturnType<typeof getEffectiveLeagueRosterTemplate>>
}

export type GetResolvedDraftPoolResult = {
  entries: NormalizedDraftEntry[]
  sport: LeagueSport
  count: number
  rosterConfigurationIncomplete: boolean
  poolType?: PoolType
  devyConfig?: { enabled: true; devyRounds: number[] }
  c2cConfig?: { enabled: true; collegeRounds: number[] }
  isIdp?: boolean
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

export function normalizeDraftPoolNameForDedupe(name: string): string {
  return (name ?? '').trim().toLowerCase()
}

function normalizeKeyPart(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function poolMergeCap(limit: number): number {
  // Must exceed ADP seed + essentially all SportsPlayer rows for NFL; otherwise
  // merge stops early and deep roster + K/DST never surface in the draft room.
  return Math.min(25_000, Math.max(limit * 14, 6000))
}

function enrichRawRowFromDbPool(existing: DraftPoolRawRow, p: SportPoolRow): void {
  const extId = p.external_source_id ?? null
  const legacyPlayerId = p.player_id ?? null
  existing.playerId ??= extId ?? legacyPlayerId ?? undefined
  existing.sleeperId ??= extId ?? undefined
  existing.id ??= extId ?? legacyPlayerId ?? undefined
  existing.imageUrl ??= p.image_url ?? undefined
  existing.team ??= p.team_abbreviation ?? undefined
  existing.injuryStatus ??= p.injury_status ?? undefined
  existing.status ??= p.status ?? undefined
  existing.age ??= p.age ?? undefined
  if (
    (!existing.secondaryPositions || existing.secondaryPositions.length === 0) &&
    Array.isArray(p.secondary_positions) &&
    p.secondary_positions.length > 0
  ) {
    existing.secondaryPositions = [...p.secondary_positions]
  }
}

function mergeDbPoolIntoRawList(
  rawList: DraftPoolRawRow[],
  poolRows: SportPoolRow[],
  mergeCap: number,
  useMixedPoolTypeMarkers: boolean,
  seenNames: Set<string>,
): void {
  for (const p of poolRows) {
    const norm = normalizeDraftPoolNameForDedupe(p.full_name ?? '')
    if (!norm) continue

    const existingIdx = rawList.findIndex(
      (r) => normalizeDraftPoolNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '') === norm,
    )
    if (existingIdx >= 0) {
      enrichRawRowFromDbPool(rawList[existingIdx], p)
      seenNames.add(norm)
      continue
    }

    if (rawList.length >= mergeCap) continue
    if (seenNames.has(norm)) continue
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

function filterExcludedDraftEntries(
  entries: NormalizedDraftEntry[],
  excludeDraftedNames?: ReadonlySet<string>,
  excludeDraftedPlayerIds?: ReadonlySet<string>,
): NormalizedDraftEntry[] {
  if (
    (!excludeDraftedNames || excludeDraftedNames.size === 0) &&
    (!excludeDraftedPlayerIds || excludeDraftedPlayerIds.size === 0)
  ) {
    return entries
  }
  return entries.filter((e) => {
    const nk = normalizeDraftPoolNameForDedupe(e.name)
    if (excludeDraftedNames?.size && excludeDraftedNames.has(nk)) return false
    const pid = String(e.display?.playerId ?? e.playerId ?? '').trim()
    if (pid && excludeDraftedPlayerIds?.size && excludeDraftedPlayerIds.has(pid)) return false
    return true
  })
}

/**
 * Builds the same normalized draft pool as GET `/api/leagues/[leagueId]/draft/pool`.
 */
export async function getResolvedDraftPoolForLeague(
  leagueId: string,
  options: GetResolvedDraftPoolOptions = {},
): Promise<GetResolvedDraftPoolResult> {
  const effectiveLeagueTemplate =
    options.effectiveLeagueTemplate ?? (await getEffectiveLeagueRosterTemplate(leagueId))

  if (!effectiveLeagueTemplate.hasPersistedRosterSchema) {
    return {
      entries: [],
      sport: effectiveLeagueTemplate.sport,
      count: 0,
      rosterConfigurationIncomplete: true,
      isIdp: effectiveLeagueTemplate.idpEnabled || undefined,
    }
  }

  const starterEligible = starterEligiblePlayerPositionsFromTemplate(effectiveLeagueTemplate.template)
  const eligiblePositions =
    starterEligible.size > 0
      ? starterEligible
      : effectiveLeagueTemplate.allowedPositions.size > 0
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
        season: true,
        scoring: true,
        isDynasty: true,
        leagueSize: true,
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
  const isAuction = sessionDraftType === 'auction' || (!sessionDraftType && settingsDraftType === 'auction')
  const rawLimit = options.limit ?? DEFAULT_LIMIT
  const limit = Math.min(Math.max(Number(rawLimit) || DEFAULT_LIMIT, 1), 500)
  let poolType = options.poolType ?? null
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
  const poolFetchLimit =
    sport === 'NFL'
      ? Math.min(50_000, Math.max(limit * 12, 16_000))
      : Math.min(Math.max(limit * 4, 800), 2200)
  const poolRows = await getPlayerPoolForLeague(leagueId, sport, {
    limit: poolFetchLimit,
  }).catch(() => [] as Array<{
    full_name: string
    position: string
    team_abbreviation: string | null
    external_source_id: string | null
    injury_status: string | null
    secondary_positions?: string[]
  }>)
  const poolByStrictKey = new Map<string, (typeof poolRows)[number]>()
  const poolByLooseKey = new Map<string, (typeof poolRows)[number]>()
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
    const devyPlayers = await (prisma as any).devyPlayer
      .findMany({
        where: { devyEligible: true, graduatedToNFL: false },
        take: DEVY_POOL_LIMIT,
        orderBy: { devyAdp: 'asc' },
      })
      .catch(() => [] as any[])
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
    const adpEntries = await getLiveADP('redraft', Math.min(1400, Math.max(limit * 2, 900))).catch(() => [])
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
      const seenNames = new Set(rawList.map((r) => normalizeDraftPoolNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')))
      for (const p of idpFiltered) {
        const norm = normalizeDraftPoolNameForDedupe(p.full_name ?? '')
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
    const seenAfterRanked = new Set(
      rawList.map((r) => normalizeDraftPoolNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')),
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
      rawList.map((r) => normalizeDraftPoolNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')),
    )
    mergeDbPoolIntoRawList(
      rawList,
      poolRows as SportPoolRow[],
      poolMergeCap(limit),
      useMixedPoolTypeMarkers,
      seenNonNfl,
    )
  }

  const proNames = new Set(rawList.map((r) => normalizeDraftPoolNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')))
  const includeCollegeInPool =
    mergeCollegePool && !(strictPoolSeparation && (poolType === 'startup_vet' || poolType === 'startup_pro'))

  if (includeCollegeInPool) {
    const devyPlayers = await (prisma as any).devyPlayer
      .findMany({
        where: { devyEligible: true, graduatedToNFL: false },
        take: DEVY_POOL_LIMIT,
        orderBy: { devyAdp: 'asc' },
      })
      .catch(() => [] as any[])
    for (const p of devyPlayers) {
      const norm = normalizeDraftPoolNameForDedupe(p.name ?? '')
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
    const keptNames = new Set(
      keeperSelections.map((k) => normalizeDraftPoolNameForDedupe(k.playerName ?? '')).filter(Boolean),
    )
    if (keptNames.size > 0) {
      rawListFiltered = rawList.filter(
        (r: RawRow) => !keptNames.has(normalizeDraftPoolNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')),
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
    {
      fantasyPointsPerGame: number | null
      lifetimeValue: number | null
      updatedAt: Date | null
      expectedFantasyPoints: number | null
    }
  >()
  let identityByPoolKey = new Map<string, { rollingInsightsPlayerId: string; confidence: 'high' }>()
  let riSeasonByPlayerId = new Map<string, RollingInsightsSeasonSlice>()

  if (sport === 'NFL' && rawListFiltered.length > 0) {
    const nameKeys = [
      ...new Set(
        rawListFiltered
          .map((r) => normalizeDraftPoolNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? ''))
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
            expectedFantasyPoints: true,
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
              expectedFantasyPoints: number | null
              updatedAt: Date
            }>,
        )
      for (const row of analyticsRows) {
        const nk = normalizeDraftPoolNameForDedupe(row.normalizedName ?? '')
        const pk = normalizeKeyPart(row.position ?? '')
        if (!nk || !pk) continue
        analyticsByKey.set(`${nk}|${pk}`, {
          fantasyPointsPerGame: row.fantasyPointsPerGame ?? null,
          lifetimeValue: row.lifetimeValue ?? null,
          updatedAt: row.updatedAt ?? null,
          expectedFantasyPoints: row.expectedFantasyPoints ?? null,
        })
      }
    }

    const riRows = rawListFiltered.map((r: RawRow) => {
      const nk = normalizeDraftPoolNameForDedupe(r.name ?? r.playerName ?? r.full_name ?? '')
      const pk = normalizeKeyPart(r.position ?? r.pos ?? '')
      const sid = r.playerId ?? r.sleeperId ?? r.id ?? null
      const sleeperCandidate = sid != null && String(sid).trim() !== '' ? String(sid).trim() : null
      return { nk, pk, sleeperCandidate }
    })
    const loaded = await loadRollingInsightsSeasonByDraftPoolKey({ rows: riRows })
    identityByPoolKey = loaded.identityByPoolKey
    riSeasonByPlayerId = loaded.riSeasonByPlayerId
  }

  let riDetailByPlayerId = new Map<string, RollingInsightsStatsDetailRow>()
  if (sport === 'NFL' && identityByPoolKey.size > 0) {
    const riIds = [...new Set([...identityByPoolKey.values()].map((v) => v.rollingInsightsPlayerId))]
    riDetailByPlayerId = await loadRollingInsightsStatsDetailByPlayerIds(riIds)
  }

  const nflStatsSeason = sport === 'NFL' ? defaultNflPlayerStatsSeason() : ''

  /** E.1.5: prefer real backfilled headshots when SportsPlayer has them.
   * The backfill script `npm run backfill:player-headshots` populates SportsPlayer rows with
   * imageUrl values from ClearSports / SportsDB. This map indexes them by (normalizedName,
   * normalizedPosition) so the per-row enrichment below can swap a synthesized AF data-URI
   * placeholder for a real photo. The query is no-op when SportsPlayer is empty (today). */
  const sportsPlayerImageByNameKey = new Map<string, string>()
  if (sport === 'NFL' && rawListFiltered.length > 0) {
    try {
      /**
       * Bug fix (post-E.1.6): every NFL player has TWO SportsPlayer rows — one
       * `source='rolling_insights'` (from syncNFLPlayersToDb, sometimes carrying a
       * naked-filename URL like "ee4a97dd-...png" with no protocol) and one
       * `source='backfill'` (from scripts/backfill-player-headshots.ts, with a
       * real ClearSports/SportsDB/TheSportsAPI URL).
       *
       * Two corrections:
       *   1. Order by source so backfill rows are seen first — when both rows
       *      exist for the same (name, position), the real URL wins the
       *      "first set" race against the bogus one.
       *   2. Validate the URL via classifyAvatarSource before caching — naked
       *      filenames (no `https://`) classify as `'null'` and are skipped, so
       *      they can never poison the map.
       */
      const csPlayers = await prisma.sportsPlayer.findMany({
        where: { sport: 'NFL' as any, imageUrl: { not: null } },
        select: { name: true, position: true, imageUrl: true, source: true },
        take: 8000,
        orderBy: [{ source: 'asc' }],
        // 'backfill' < 'rolling_insights' alphabetically, so backfill rows arrive first.
      })
      for (const row of csPlayers) {
        const nk = normalizeDraftPoolNameForDedupe(row.name ?? '')
        const pk = normalizeKeyPart(row.position ?? '')
        if (!nk || !row.imageUrl) continue
        // Filter: must classify as a real headshot URL (https://, not data: URI,
        // not /teamLogos/ path, not a naked filename).
        if (classifyAvatarSource(row.imageUrl) !== 'headshot') continue
        // Prefer (name|position). Also store name-only as a fallback when position is missing.
        const keyWithPos = `${nk}|${pk}`
        if (!sportsPlayerImageByNameKey.has(keyWithPos)) sportsPlayerImageByNameKey.set(keyWithPos, row.imageUrl)
        const keyNameOnly = `${nk}|`
        if (!sportsPlayerImageByNameKey.has(keyNameOnly)) sportsPlayerImageByNameKey.set(keyNameOnly, row.imageUrl)
      }
    } catch {
      /* swallow — pool falls through to placeholder behavior */
    }
  }

  /**
   * D.5 — overlay AI ADP from `AllFantasyAdpSnapshot` keyed by the league's draft
   * context (sport / leagueType / draftType / scoring / rosterFormat / teamCount /
   * season). Default draftMode is 'real'. If no snapshot rows match, the map is
   * empty and downstream rows render em-dash for the AI ADP cell — by design,
   * the resolver does NOT fall back to external/market ADP and label it AI ADP
   * (per D.5 spec).
   *
   * `aiAdpByPlayerKey.get('<lowercased name>|<lowercased position>')` returns
   *   { adp, sampleSize, lowSample, sevenDayTrend, thirtyDayTrend, standardDeviation }
   */
  const aiAdpByPlayerKey = new Map<
    string,
    {
      adp: number
      sampleSize: number
      lowSample: boolean
      sevenDayTrend: number | null
      thirtyDayTrend: number | null
      standardDeviation: number | null
    }
  >()
  if (rawListFiltered.length > 0) {
    try {
      const { buildContextHash } = await import('@/lib/adp/computeAllFantasyAdp')
      const settingsForCtx = (league?.settings as Record<string, unknown> | null) ?? {}
      const draftFromSettings = (settingsForCtx.draft as { type?: string } | undefined)?.type ?? draftSession?.draftType ?? 'snake'
      const ctxHash = buildContextHash({
        sport: String(sport ?? 'NFL').toUpperCase(),
        leagueType: league?.leagueVariant ?? (league?.isDynasty ? 'dynasty' : 'redraft'),
        draftType: String(draftFromSettings).toLowerCase(),
        scoringFormat: String(league?.scoring ?? 'ppr').toLowerCase(),
        rosterFormat: 'standard',
        teamCount: league?.leagueSize ?? 12,
        season: String(league?.season ?? new Date().getUTCFullYear()),
      })
      const adpRows = await prisma.allFantasyAdpSnapshot.findMany({
        where: { contextHash: ctxHash, draftMode: 'real' },
        select: {
          playerKey: true,
          averageOverallPick: true,
          sampleSize: true,
          sevenDayTrend: true,
          thirtyDayTrend: true,
          standardDeviation: true,
        },
        take: 4000,
      })
      const LOW_SAMPLE_THRESHOLD = 10
      for (const row of adpRows) {
        aiAdpByPlayerKey.set(row.playerKey, {
          adp: row.averageOverallPick,
          sampleSize: row.sampleSize,
          lowSample: row.sampleSize < LOW_SAMPLE_THRESHOLD,
          sevenDayTrend: row.sevenDayTrend,
          thirtyDayTrend: row.thirtyDayTrend,
          standardDeviation: row.standardDeviation,
        })
      }
    } catch {
      /* swallow — pool renders em-dashes for the AI ADP column when snapshot is unavailable */
    }
  }

  const promotedMap = new Map<string, { school: string | null }>()
  if (devyEnabled || c2cEnabled || isDevyDynasty || isC2C) {
    const promotedRows = await (prisma as any).devyPlayer
      .findMany({
        where: { graduatedToNFL: true },
        select: { normalizedName: true, name: true, position: true, school: true },
        take: 3000,
      })
      .catch(() => [] as any[])
    for (const p of promotedRows) {
      const nameKey = normalizeDraftPoolNameForDedupe(p.name ?? '')
      const posKey = normalizeKeyPart(p.position ?? '')
      if (!nameKey || !posKey) continue
      promotedMap.set(`${nameKey}|${posKey}`, { school: p.school ?? null })
    }
  }

  /** D.7 — Sleeper-backed rookie lookup. Only built for NFL pools. The lookup is
   * `null` for non-NFL sports (no upstream years_exp available); UI surfaces a
   * "Rookie data unavailable" message in that case. Failures inside the helper
   * degrade silently to `hasData=false` rather than breaking the pool fetch. */
  let nflRookieLookup: NflRookieLookup | null = null
  if (sport === 'NFL') {
    nflRookieLookup = await loadNflRookieLookup().catch(() => null)
  }

  const enrichedList = rawListFiltered.map((row) => {
    const name = row.name ?? row.playerName ?? row.full_name ?? ''
    const position = row.position ?? row.pos ?? ''
    const team = row.team ?? row.teamAbbr ?? null
    const strict = `${normalizeKeyPart(name)}|${normalizeKeyPart(position)}|${normalizeKeyPart(team)}`
    const loose = `${normalizeKeyPart(name)}|${normalizeKeyPart(position)}`
    const poolMatch = poolByStrictKey.get(strict) ?? poolByLooseKey.get(loose)
    const promoted = promotedMap.get(`${normalizeDraftPoolNameForDedupe(name)}|${normalizeKeyPart(position)}`)
    const poolAnalyticsKey = `${normalizeDraftPoolNameForDedupe(name)}|${normalizeKeyPart(position)}`
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

    const nflDraftProjectionSplits =
      sport === 'NFL'
        ? (buildNflDraftProjectionSplits({
            position,
            statsJson: idn ? riDetailByPlayerId.get(idn.rollingInsightsPlayerId)?.stats ?? null : null,
            snapshotExpectedPoints: analytics?.expectedFantasyPoints ?? null,
            riSeasonFantasyPoints: idn
              ? (riDetailByPlayerId.get(idn.rollingInsightsPlayerId)?.fantasyPoints ??
                  riSlice?.fantasyPointsSeason ??
                  null)
              : null,
            projectedPointsPerGame:
              resolvedAnalytics?.fantasyPointsPerGame ?? analytics?.fantasyPointsPerGame ?? null,
          }) ?? emptyNflDraftProjectionSplits())
        : null

    /** E.1.5: real headshot lookup from the backfilled SportsPlayer cache, keyed by
     * (normalizedName | normalizedPosition). Wins over synth/data-URI/team-logo URLs that the
     * upstream pool produced — but only when classifyAvatarSource flags the upstream as bogus.
     * If there's no cache hit, leave the upstream URL alone so the runtime PlayerAvatar's
     * classifier still rejects it and falls back to the silhouette. */
    let backfilledHeadshot: string | null = null
    if (sport === 'NFL') {
      const lookupName = normalizeDraftPoolNameForDedupe(name ?? '')
      const lookupPos = normalizeKeyPart(position ?? '')
      backfilledHeadshot =
        sportsPlayerImageByNameKey.get(`${lookupName}|${lookupPos}`) ??
        sportsPlayerImageByNameKey.get(`${lookupName}|`) ??
        null
    }

    /** D.5 — AI ADP overlay from AllFantasyAdpSnapshot. The map is keyed by
     * `<normalized name>|<normalized position>` matching the same shape the
     * recompute script writes (see lib/adp/computeAllFantasyAdp.buildPlayerKey). */
    const aiAdpHit = aiAdpByPlayerKey.get(
      `${normalizeDraftPoolNameForDedupe(name ?? '')}|${normalizeKeyPart(position ?? '')}`,
    )

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
            backfilledHeadshot ??
            (row as RawRow).imageUrl ??
            (poolMatch as { image_url?: string | null }).image_url ??
            null,
        }
      : { ...row, imageUrl: backfilledHeadshot ?? (row as RawRow).imageUrl ?? null }
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
      ...(sport === 'NFL' && nflDraftProjectionSplits ? { nflDraftProjectionSplits } : {}),
      /** D.5 — AI ADP comes from AllFantasyAdpSnapshot ONLY. Empty when no snapshot
       * exists for this context — the table renders em-dashes (no external ADP fallback). */
      ...(aiAdpHit
        ? {
            aiAdp: aiAdpHit.adp,
            aiAdpSampleSize: aiAdpHit.sampleSize,
            aiAdpLowSample: aiAdpHit.lowSample,
            aiAdpSevenDayTrend: aiAdpHit.sevenDayTrend,
            aiAdpThirtyDayTrend: aiAdpHit.thirtyDayTrend,
            aiAdpStandardDeviation: aiAdpHit.standardDeviation,
          }
        : { aiAdp: null }),
      /** D.7 — attach Sleeper years_exp for NFL rows. Devy rows that have not
       * been promoted to the NFL retain `isRookie=true` regardless of yearsExp
       * (their Sleeper match is typically absent). Promoted rows fall through
       * to the Sleeper lookup so a former devy player who has played a season
       * is correctly excluded from "Rookies Only" in redraft. */
      ...(sport === 'NFL'
        ? (() => {
            const ye = nflRookieLookup ? lookupYearsExp(nflRookieLookup, name, position) : null
            return ye != null ? { yearsExp: ye } : {}
          })()
        : {}),
      ...(row.isDevy && !row.graduatedToNFL ? { isRookie: true } : {}),
    } as unknown as RawRow
  })

  let entries = normalizePlayerList(enrichedList, sport)
  entries = filterExcludedDraftEntries(
    entries,
    options.excludeDraftedNames,
    options.excludeDraftedPlayerIds,
  )

  return {
    entries,
    sport,
    count: entries.length,
    rosterConfigurationIncomplete: false,
    poolType: strictPoolSeparation ? poolType ?? undefined : undefined,
    devyConfig: devyEnabled ? { enabled: true, devyRounds: rawDevyConfig?.devyRounds ?? [] } : undefined,
    c2cConfig: c2cEnabled ? { enabled: true, collegeRounds: rawC2cConfig?.collegeRounds ?? [] } : undefined,
    isIdp: effectiveLeagueTemplate.idpEnabled || undefined,
  }
}
