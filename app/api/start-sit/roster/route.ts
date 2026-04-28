import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import { createDemoRoster, DEMO_SOURCE_LABEL, uiKeyToDataSport } from '@/lib/startSit/shared'

export const dynamic = 'force-dynamic'

type ProjectionEnvelope = {
  projected: number | null
  floor: number | null
  ceiling: number | null
  confidence: number | null
  matchupRank: number | null
  opponent: string | null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function firstNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const val = toNumber(obj[key])
    if (val != null) return val
  }
  return null
}

function firstText(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const val = toText(obj[key])
    if (val) return val
  }
  return null
}

function parseProjectionEnvelope(raw: unknown): ProjectionEnvelope {
  if (!isRecord(raw)) {
    return {
      projected: null,
      floor: null,
      ceiling: null,
      confidence: null,
      matchupRank: null,
      opponent: null,
    }
  }

  const range = isRecord(raw.range) ? raw.range : null
  const projected = firstNumber(raw, [
    'fantasyPointsPerGame',
    'projectedPoints',
    'projection',
    'proj',
    'points',
    'expectedPoints',
  ])
  const floor = firstNumber(raw, ['floor', 'low', 'min']) ?? (range ? firstNumber(range, ['low', 'floor', 'min']) : null)
  const ceiling = firstNumber(raw, ['ceiling', 'high', 'max']) ?? (range ? firstNumber(range, ['high', 'ceiling', 'max']) : null)

  return {
    projected,
    floor,
    ceiling,
    confidence: firstNumber(raw, ['confidence', 'projectionConfidence']),
    matchupRank: firstNumber(raw, ['matchupRank', 'opponentRank', 'defenseRank']),
    opponent: firstText(raw, ['opponent', 'opp', 'matchupOpponent']),
  }
}

function recentFpgFromStats(raw: unknown): number | null {
  if (!isRecord(raw)) return null
  return firstNumber(raw, ['fantasyPointsPerGame', 'fppg', 'avgPoints', 'avg_fp'])
}

function confidenceFromLevel(level: string | null | undefined): number {
  const normalized = String(level ?? '').trim().toLowerCase()
  if (normalized === 'high') return 85
  if (normalized === 'low') return 60
  return 72
}

function trendFromProjection(projected: number, baseline: number | null): 'up' | 'down' | 'flat' {
  if (baseline == null) return 'flat'
  if (projected >= baseline + 1.5) return 'up'
  if (projected <= baseline - 1.5) return 'down'
  return 'flat'
}

function normalizeRosterPlayers(playerData: unknown): Array<{ rawId: string; nameHint: string | null }> {
  const ids = getRosterPlayerIds(playerData)
  const out = ids
    .map((id) => String(id).trim())
    .filter(Boolean)
    .map((rawId) => ({ rawId, nameHint: null as string | null }))

  if (!isRecord(playerData)) return out
  const players = playerData.players
  if (!Array.isArray(players)) return out

  const nameById = new Map<string, string>()
  for (const p of players) {
    if (typeof p === 'string') continue
    if (!isRecord(p)) continue
    const rawId = toText(p.id) ?? toText(p.player_id) ?? null
    const name = toText(p.full_name) ?? toText(p.name) ?? null
    if (rawId && name) {
      nameById.set(rawId, name)
    }
  }

  return out.map((row) => ({
    rawId: row.rawId,
    nameHint: nameById.get(row.rawId) ?? null,
  }))
}

async function buildDbFallbackRoster(dataSport: string, week: string, limit = 12) {
  const baseRows = await prisma.sportsPlayerRecord.findMany({
    where: { sport: dataSport },
    orderBy: [{ name: 'asc' }],
    take: 120,
    select: {
      id: true,
      name: true,
      position: true,
      team: true,
      projections: true,
      stats: true,
      injuryStatus: true,
    },
  })

  if (baseRows.length === 0) return []

  const candidateIds = baseRows.map((row) => row.id)
  const numericWeek = Number.isFinite(Number(week)) ? Number(week) : null

  const [seasonRows, afProjectionRows] = await Promise.all([
    prisma.playerSeasonStats.findMany({
      where: {
        sport: dataSport,
        seasonType: 'regular',
        playerId: { in: candidateIds },
      },
      orderBy: [{ season: 'desc' }, { fetchedAt: 'desc' }],
      select: {
        playerId: true,
        season: true,
        source: true,
        fantasyPointsPerGame: true,
        stats: true,
      },
    }),
    prisma.aFProjectionSnapshot.findMany({
      where: {
        sport: dataSport,
        playerId: { in: candidateIds },
      },
      orderBy: [{ season: 'desc' }, { computedAt: 'desc' }],
      select: {
        playerId: true,
        season: true,
        week: true,
        afProjection: true,
        confidenceLevel: true,
      },
    }),
  ])

  const seasonByPlayerId = new Map<string, (typeof seasonRows)[number]>()
  for (const row of seasonRows) {
    if (!seasonByPlayerId.has(row.playerId)) {
      seasonByPlayerId.set(row.playerId, row)
    }
  }

  const afByPlayerId = new Map<string, (typeof afProjectionRows)[number]>()
  for (const row of afProjectionRows) {
    if (numericWeek != null && row.week != null && row.week !== numericWeek) continue
    if (!afByPlayerId.has(row.playerId)) {
      afByPlayerId.set(row.playerId, row)
    }
  }

  return baseRows.slice(0, limit).map((row, i) => {
    const projection = parseProjectionEnvelope(row.projections)
    const season = seasonByPlayerId.get(row.id)
    const af = afByPlayerId.get(row.id) ?? null
    const seasonFppg = season?.fantasyPointsPerGame ?? recentFpgFromStats(season?.stats)
    const statsFppg = recentFpgFromStats(row.stats)

    const projectedRaw = af?.afProjection ?? projection.projected ?? seasonFppg ?? statsFppg
    const projected = projectedRaw != null ? roundToTenth(projectedRaw) : roundToTenth(9 + (i % 7) + (i % 3) * 0.9)
    const floor = projection.floor != null ? roundToTenth(projection.floor) : roundToTenth(projected * 0.72)
    const ceiling = projection.ceiling != null ? roundToTenth(projection.ceiling) : roundToTenth(projected * 1.35)

    const confidenceRaw = af ? confidenceFromLevel(af.confidenceLevel) : projection.confidence
    const confidence = Math.max(45, Math.min(95, Math.round(confidenceRaw ?? (seasonFppg != null ? 68 : 60))))
    const baseline = seasonFppg ?? statsFppg

    const source =
      af != null
        ? 'AFProjectionSnapshot'
        : projection.projected != null
          ? 'SportsPlayerRecord.projections'
          : seasonFppg != null
            ? 'PlayerSeasonStats'
            : statsFppg != null
              ? 'SportsPlayerRecord.stats'
              : 'fallback'

    return {
      id: row.id,
      name: row.name,
      position: row.position ?? ['QB', 'RB', 'WR', 'TE', 'FLEX'][i % 5],
      team: row.team ?? '—',
      opponent: projection.opponent ?? 'TBD',
      projected,
      floor,
      ceiling,
      confidence,
      trend: trendFromProjection(projected, baseline),
      status: row.injuryStatus ?? 'Active',
      note:
        source === 'fallback'
          ? 'No DB projection row found for this player yet; showing conservative fallback estimate.'
          : `DB-backed projection source: ${source}.`,
      matchupRank: Math.round(projection.matchupRank ?? (15 + (i % 12))),
    }
  })
}

async function resolveSportsPlayerRecord(sport: string, rawId: string, nameHint: string | null) {
  const directIds = Array.from(new Set([rawId, `${sport}:${rawId}`].map((v) => v.trim()).filter(Boolean)))
  for (const id of directIds) {
    const direct = await prisma.sportsPlayerRecord.findUnique({ where: { id } })
    if (direct) return direct
  }

  const seed = await prisma.sportsPlayer.findFirst({
    where: {
      sport,
      OR: [{ externalId: rawId }, { sleeperId: rawId }, { id: rawId }],
    },
    select: { name: true },
  })

  if (seed?.name) {
    const bySeedName = await prisma.sportsPlayerRecord.findFirst({
      where: { sport, name: { equals: seed.name, mode: 'insensitive' } },
    })
    if (bySeedName) return bySeedName
  }

  if (nameHint) {
    const byHintName = await prisma.sportsPlayerRecord.findFirst({
      where: { sport, name: { equals: nameHint, mode: 'insensitive' } },
    })
    if (byHintName) return byHintName
  }

  if (rawId.includes(' ')) {
    return prisma.sportsPlayerRecord.findFirst({
      where: { sport, name: { equals: rawId, mode: 'insensitive' } },
    })
  }

  return null
}

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = typeof session?.user?.id === 'string' ? session.user.id : null

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId') || ''
  const sport = searchParams.get('sport') || 'nfl'
  const dataSport = uiKeyToDataSport(sport)
  const week = searchParams.get('week') || 'current'
  const format = searchParams.get('format') || 'PPR'

  if (!leagueId || leagueId === 'all' || !userId) {
    const dbFallbackPlayers = await buildDbFallbackRoster(dataSport, week)
    const players =
      dbFallbackPlayers.length > 0 ? dbFallbackPlayers : createDemoRoster(sport, leagueId || 'demo', week)
    return NextResponse.json({
      players,
      source: dbFallbackPlayers.length > 0 ? 'DB/cache fallback roster snapshot' : DEMO_SOURCE_LABEL,
      meta: { format, week, sport },
    })
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId, userId },
    select: {
      id: true,
      name: true,
      sport: true,
      rosters: { select: { playerData: true } },
    },
  })

  if (!league?.rosters?.length) {
    const dbFallbackPlayers = await buildDbFallbackRoster(dataSport, week)
    const players =
      dbFallbackPlayers.length > 0 ? dbFallbackPlayers : createDemoRoster(sport, league?.name ?? leagueId, week)
    return NextResponse.json({
      players,
      source: dbFallbackPlayers.length > 0 ? 'DB/cache fallback roster snapshot' : DEMO_SOURCE_LABEL,
      meta: { format, week },
    })
  }

  const rosterRows: Array<{ rawId: string; nameHint: string | null }> = []
  for (const r of league.rosters) {
    rosterRows.push(...normalizeRosterPlayers(r.playerData).slice(0, 24))
  }

  const uniqueRosterRows = Array.from(
    new Map(rosterRows.map((row) => [row.rawId, row])).values(),
  ).slice(0, 40)

  if (uniqueRosterRows.length === 0) {
    const dbFallbackPlayers = await buildDbFallbackRoster(dataSport, week)
    const players =
      dbFallbackPlayers.length > 0 ? dbFallbackPlayers : createDemoRoster(sport, league.name ?? league.id, week)
    return NextResponse.json({
      players,
      source: dbFallbackPlayers.length > 0 ? 'DB/cache fallback roster snapshot' : DEMO_SOURCE_LABEL,
    })
  }

  const resolved = await Promise.all(
    uniqueRosterRows.map(async (row) => ({
      rawId: row.rawId,
      nameHint: row.nameHint,
      record: await resolveSportsPlayerRecord(dataSport, row.rawId, row.nameHint),
    })),
  )

  const candidateIds = Array.from(
    new Set(
      resolved
        .flatMap((row) => [row.rawId, row.record?.id])
        .map((id) => String(id ?? '').trim())
        .filter(Boolean),
    ),
  )

  const identityWhere = [] as Array<Record<string, unknown>>
  if (candidateIds.length > 0) {
    identityWhere.push({ sleeperId: { in: candidateIds } })
    identityWhere.push({ apiSportsId: { in: candidateIds } })
    identityWhere.push({ fantasyCalcId: { in: candidateIds } })
    identityWhere.push({ rollingInsightsId: { in: candidateIds } })
    identityWhere.push({ espnId: { in: candidateIds } })
    identityWhere.push({ clearSportsId: { in: candidateIds } })
  }

  const [identityRows, seasonRows, afProjectionRows] = await Promise.all([
    identityWhere.length > 0
      ? prisma.playerIdentityMap.findMany({
          where: {
            sport: dataSport,
            OR: identityWhere,
          },
          select: {
            sleeperId: true,
            apiSportsId: true,
            fantasyCalcId: true,
            rollingInsightsId: true,
            espnId: true,
            clearSportsId: true,
            canonicalName: true,
            currentTeam: true,
            position: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    candidateIds.length > 0
      ? prisma.playerSeasonStats.findMany({
          where: {
            sport: dataSport,
            seasonType: 'regular',
            playerId: { in: candidateIds },
          },
          orderBy: [{ season: 'desc' }, { fetchedAt: 'desc' }],
          select: {
            playerId: true,
            season: true,
            source: true,
            fantasyPointsPerGame: true,
            stats: true,
          },
        })
      : Promise.resolve([]),
    candidateIds.length > 0
      ? prisma.aFProjectionSnapshot.findMany({
          where: {
            sport: dataSport,
            playerId: { in: candidateIds },
          },
          orderBy: [{ season: 'desc' }, { computedAt: 'desc' }],
          select: {
            playerId: true,
            season: true,
            week: true,
            afProjection: true,
            confidenceLevel: true,
            computedAt: true,
          },
        })
      : Promise.resolve([]),
  ])

  // E.3 fallback: if resolved records have names/positions but no external ID matches,
  // try PlayerIdentityMap lookup by normalizedName+position. This helps when identity
  // ingestion is incomplete but we have SportsPlayerRecord data.
  let identityByNamePos: Array<{ canonicalName: string; position: string | null; identity: (typeof identityRows)[number] }> = []
  const unresolvedRecords = resolved
    .filter((r) => !identityByExternalId.get(r.rawId) && r.record)
    .slice(0, 12)
  if (unresolvedRecords.length > 0) {
    const namesAndPos = unresolvedRecords
      .map((r) => ({
        normalizedName: String(r.record?.name ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ''),
        position: (r.record?.position ?? '').trim().toLowerCase(),
        record: r,
      }))
      .filter((x) => x.normalizedName && x.position)

    if (namesAndPos.length > 0) {
      const fallbackIdentities = await prisma.playerIdentityMap.findMany({
        where: {
          sport: dataSport,
          OR: namesAndPos.map((x) => ({
            AND: [
              { normalizedName: x.normalizedName },
              { position: { equals: x.position, mode: 'insensitive' } },
            ],
          })),
        },
        select: {
          sleeperId: true,
          apiSportsId: true,
          fantasyCalcId: true,
          rollingInsightsId: true,
          espnId: true,
          clearSportsId: true,
          canonicalName: true,
          currentTeam: true,
          position: true,
          status: true,
        },
      })

      // Map fallback results back to resolved records, skipping ambiguous matches.
      const identitiesByKey = new Map<string, (typeof fallbackIdentities)[number][]>()
      for (const ident of fallbackIdentities) {
        const nk = (ident.canonicalName ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
        const pk = (ident.position ?? '').trim().toLowerCase()
        const k = `${nk}|${pk}`
        const group = identitiesByKey.get(k) ?? []
        group.push(ident)
        identitiesByKey.set(k, group)
      }

      identityByNamePos = namesAndPos
        .map((x) => {
          const nk = x.normalizedName
          const pk = x.position
          const k = `${nk}|${pk}`
          const group = identitiesByKey.get(k) ?? []
          if (group.length === 1) {
            return { canonicalName: nk, position: pk, identity: group[0] }
          }
          return null
        })
        .filter(Boolean) as typeof identityByNamePos
    }
  }

  const identityByExternalId = new Map<string, (typeof identityRows)[number]>()
  for (const row of identityRows) {
    for (const externalId of [row.sleeperId, row.apiSportsId, row.fantasyCalcId, row.rollingInsightsId, row.espnId, row.clearSportsId]) {
      const normalized = String(externalId ?? '').trim()
      if (normalized && !identityByExternalId.has(normalized)) {
        identityByExternalId.set(normalized, row)
      }
    }
  }

  // Add fallback name+position matches to the identity map.
  for (const fallback of identityByNamePos) {
    const lookupKey = `namepos:${fallback.canonicalName}|${fallback.position}`
    identityByExternalId.set(lookupKey, fallback.identity)
  }

  const seasonByPlayerId = new Map<string, (typeof seasonRows)[number]>()
  for (const row of seasonRows) {
    if (!seasonByPlayerId.has(row.playerId)) {
      seasonByPlayerId.set(row.playerId, row)
    }
  }

  const afByPlayerId = new Map<string, (typeof afProjectionRows)[number]>()
  const numericWeek = Number.isFinite(Number(week)) ? Number(week) : null
  for (const row of afProjectionRows) {
    if (numericWeek != null && row.week != null && row.week !== numericWeek) continue
    if (!afByPlayerId.has(row.playerId)) {
      afByPlayerId.set(row.playerId, row)
    }
  }

  const players = resolved.slice(0, 12).map((row, i) => {
    let identity = identityByExternalId.get(row.rawId) ?? (row.record?.id ? identityByExternalId.get(row.record.id) : undefined)

    // E.3 fallback: if no external ID match, try name+position fallback.
    if (!identity && row.record?.name && row.record?.position) {
      const nk = row.record.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
      const pk = row.record.position.trim().toLowerCase()
      const lookupKey = `namepos:${nk}|${pk}`
      identity = identityByExternalId.get(lookupKey)
    }

    const projection = parseProjectionEnvelope(row.record?.projections)

    const projectionCandidates = [row.rawId, row.record?.id, identity?.rollingInsightsId, identity?.apiSportsId, identity?.fantasyCalcId, identity?.espnId, identity?.clearSportsId]
      .map((id) => String(id ?? '').trim())
      .filter(Boolean)

    const af = projectionCandidates.map((id) => afByPlayerId.get(id)).find(Boolean) ?? null
    const season = projectionCandidates.map((id) => seasonByPlayerId.get(id)).find(Boolean) ?? null
    const seasonFppg = season?.fantasyPointsPerGame ?? recentFpgFromStats(season?.stats)
    const statsFppg = recentFpgFromStats(row.record?.stats)

    const projectedRaw = af?.afProjection ?? projection.projected ?? seasonFppg ?? statsFppg
    const projected = projectedRaw != null ? roundToTenth(projectedRaw) : roundToTenth(9 + (i % 7) + (i % 3) * 0.9)
    const floor = projection.floor != null ? roundToTenth(projection.floor) : roundToTenth(projected * 0.72)
    const ceiling = projection.ceiling != null ? roundToTenth(projection.ceiling) : roundToTenth(projected * 1.35)

    const confidenceRaw = af ? confidenceFromLevel(af.confidenceLevel) : projection.confidence
    const confidence = Math.max(45, Math.min(95, Math.round(confidenceRaw ?? (seasonFppg != null ? 68 : 60))))

    const baseline = seasonFppg ?? statsFppg
    const trend = trendFromProjection(projected, baseline)

    const source =
      af != null
        ? 'AFProjectionSnapshot'
        : projection.projected != null
          ? 'SportsPlayerRecord.projections'
          : seasonFppg != null
            ? 'PlayerSeasonStats'
            : statsFppg != null
              ? 'SportsPlayerRecord.stats'
              : 'fallback'

    return {
      id: row.record?.id ?? row.rawId,
      name: row.record?.name ?? row.nameHint ?? row.rawId,
      position: row.record?.position ?? identity?.position ?? ['QB', 'RB', 'WR', 'TE', 'FLEX'][i % 5],
      team: row.record?.team ?? identity?.currentTeam ?? '—',
      opponent: projection.opponent ?? 'TBD',
      projected,
      floor,
      ceiling,
      confidence,
      trend,
      status: row.record?.injuryStatus ?? identity?.status ?? 'Active',
      note:
        source === 'fallback'
          ? 'No DB projection row found for this player yet; showing conservative fallback estimate.'
          : `DB-backed projection source: ${source}.`,
      matchupRank: Math.round(projection.matchupRank ?? (15 + (i % 12))),
    }
  })

  return NextResponse.json({
    players,
    source: 'AllFantasy league roster + DB/cache projections',
    meta: { format, week, sport: dataSport },
  })
}
