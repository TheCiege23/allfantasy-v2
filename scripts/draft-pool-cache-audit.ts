import 'server-only'

import { prisma } from '@/lib/prisma'

type CacheRow = {
  id: string
  leagueId: string
  cacheKey: string
  entryCount: number
  payload: unknown
  syncedAt: Date
  expiresAt: Date
}

type DraftEntry = Record<string, unknown>

function isMissingTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /does not exist in the current database/i.test(message) || /P2021/i.test(message)
}

function parseArg(name: string): string | null {
  const i = process.argv.findIndex((v) => v === name)
  if (i === -1) return null
  return process.argv[i + 1] ?? null
}

function asEntries(payload: unknown): DraftEntry[] {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as { entries?: unknown; assets?: unknown }
  const list = Array.isArray(root.entries) ? root.entries : Array.isArray(root.assets) ? root.assets : []
  return list.filter((entry): entry is DraftEntry => Boolean(entry && typeof entry === 'object'))
}

function shouldAuditPlayerMetrics(entry: DraftEntry): boolean {
  const assetType = getString(entry.assetType)
  return assetType == null || assetType === 'player'
}

function getString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readPath(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj
  for (const segment of path) {
    if (!current || typeof current !== 'object') return null
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function hasHeadshot(entry: DraftEntry): boolean {
  return Boolean(
    getString(readPath(entry, ['display', 'assets', 'headshotUrl'])) ||
      getString(entry.headshotUrl) ||
      getString(entry.playerImageUrl)
  )
}

function hasTeamLogo(entry: DraftEntry): boolean {
  const teamValue = readPath(entry, ['display', 'team'])
  const teamObj = teamValue && typeof teamValue === 'object' ? (teamValue as Record<string, unknown>) : null
  return Boolean(
    getString(readPath(entry, ['display', 'team', 'logoUrl'])) ||
      getString(entry.teamLogoUrl) ||
      getString(teamObj?.logoUrl)
  )
}

function readTeamAbbreviation(entry: DraftEntry): string | null {
  return (
    getString(entry.team) ||
    getString(readPath(entry, ['display', 'team', 'abbreviation'])) ||
    getString(readPath(entry, ['display', 'team', 'abbr']))
  )
}

function readTeamId(entry: DraftEntry): string | null {
  return getString(entry.teamId) || getString(readPath(entry, ['display', 'team', 'id']))
}

function readPosition(entry: DraftEntry): string {
  return (
    getString(entry.position) ||
    getString(readPath(entry, ['display', 'metadata', 'position'])) ||
    ''
  )
}

function canonicalToken(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase()
}

function isFreeAgentTeamValue(value: string | null | undefined): boolean {
  const token = canonicalToken(value)
  return token === 'FA' || token === 'FREE AGENT' || token === 'FREE_AGENT'
}

function isUnknownTeamValue(value: string | null | undefined): boolean {
  const token = canonicalToken(value)
  if (!token) return false
  return token === 'UNK' || token === 'UNKNOWN' || token === 'N/A' || token === 'NA' || token === 'NONE' || token === '-'
}

function isValidTeamAbbreviation(value: string | null | undefined): boolean {
  const token = canonicalToken(value)
  if (!token) return false
  if (isFreeAgentTeamValue(token) || isUnknownTeamValue(token)) return false
  return /^[A-Z]{2,4}$/.test(token)
}

function isDefenseSpecialCase(entry: DraftEntry): boolean {
  const position = canonicalToken(readPosition(entry))
  if (position === 'DEF' || position === 'DST') return true
  const name = canonicalToken(getString(entry.name) || getString(readPath(entry, ['display', 'displayName'])) || '')
  return /\bDEFENSE\b/.test(name)
}

function classifyMissingTeamLogo(entry: DraftEntry):
  | 'missingTeamLogoTrue'
  | 'missingTeamLogoNoTeamExpected'
  | 'missingTeamLogoFreeAgentExpected'
  | 'missingTeamLogoUnknownTeam' {
  const teamAbbreviation = readTeamAbbreviation(entry)
  const teamId = readTeamId(entry)
  if (isFreeAgentTeamValue(teamAbbreviation)) return 'missingTeamLogoFreeAgentExpected'
  if (!teamAbbreviation && !teamId) return 'missingTeamLogoNoTeamExpected'
  if (isUnknownTeamValue(teamAbbreviation)) return 'missingTeamLogoUnknownTeam'

  const hasValidTeamAssignment = Boolean(teamId) || isValidTeamAbbreviation(teamAbbreviation)
  if (!hasValidTeamAssignment) return 'missingTeamLogoUnknownTeam'

  // DEF/DST rows are still true failures when team assignment is valid.
  void isDefenseSpecialCase(entry)
  return 'missingTeamLogoTrue'
}

function hasAdp(entry: DraftEntry): boolean {
  const adp = entry.adp
  return typeof adp === 'number' && Number.isFinite(adp)
}

function hasProjection(entry: DraftEntry): boolean {
  const projection = readPath(entry, ['display', 'stats', 'fantasyPointsPerGame'])
  return typeof projection === 'number' && Number.isFinite(projection)
}

function hasRookieFlag(entry: DraftEntry): boolean {
  if (typeof entry.isRookie === 'boolean') return true
  if (typeof entry.yearsExp === 'number') return true
  return false
}

function isUnavailableOrDrafted(entry: DraftEntry): boolean {
  if (entry.drafted === true || entry.isDrafted === true) return true
  if (entry.available === false || entry.isAvailable === false) return true
  const status = getString(entry.status)
  return Boolean(status && /drafted|unavailable|taken/i.test(status))
}

function dedupeKey(entry: DraftEntry): string {
  const playerId = getString(entry.playerId) || getString(readPath(entry, ['display', 'playerId']))
  if (playerId) return `id:${playerId.toLowerCase()}`

  const name = (getString(entry.name) || getString(readPath(entry, ['display', 'displayName'])) || 'unknown').toLowerCase()
  const position = (getString(entry.position) || 'na').toLowerCase()
  const team = (getString(entry.team) || getString(readPath(entry, ['display', 'team', 'abbr'])) || 'na').toLowerCase()
  return `key:${name}:${position}:${team}`
}

async function main(): Promise<void> {
  const leagueId = parseArg('--leagueId')
  const cacheKeyLike = parseArg('--cacheKeyLike')
  const mockOnly = parseArg('--mockOnly') === '1' || parseArg('--mockOnly') === 'true'
  const draftKind = parseArg('--draftKind')
  const limitArg = parseArg('--limit')
  const take = Number.isFinite(Number(limitArg)) ? Math.max(1, Number(limitArg)) : 200

  const draftKindPrefix =
    draftKind === 'dispersal' || draftKind === 'supplemental' || draftKind === 'rookie' || draftKind === 'specialty'
      ? `${draftKind}:`
      : null

  let rows: CacheRow[] = []
  try {
    rows = (await (prisma as any).draftPoolCache.findMany({
      where: {
        ...(leagueId ? { leagueId } : {}),
        ...(mockOnly ? { cacheKey: { startsWith: 'mock:' } } : {}),
        ...(draftKindPrefix ? { cacheKey: { startsWith: draftKindPrefix } } : {}),
        ...(cacheKeyLike ? { cacheKey: { contains: cacheKeyLike } } : {}),
      },
      select: {
        id: true,
        leagueId: true,
        cacheKey: true,
        entryCount: true,
        payload: true,
        syncedAt: true,
        expiresAt: true,
      },
      orderBy: { syncedAt: 'desc' },
      take,
    })) as CacheRow[]
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn('[draft-pool:cache:audit] DraftPoolCache table not found. Apply migrations first.')
      console.log(
        JSON.stringify(
          {
            rowsScanned: 0,
            leagueFilter: leagueId,
            mockOnly,
            draftKind,
            totalCachedRows: 0,
            mockCachedRows: 0,
            liveCachedRows: 0,
            specialtyCachedRows: 0,
            totalEntries: 0,
            missingHeadshots: 0,
            missingTeamLogos: 0,
            missingImages: 0,
            duplicatePlayers: 0,
            missingAdp: 0,
            missingProjections: 0,
            missingRookieFlags: 0,
            unavailableOrDraftedCount: 0,
            cacheAgeSeconds: { min: 0, avg: 0, max: 0 },
            latestRows: [],
            warning: 'draft_pool_cache table missing; run migrations',
          },
          null,
          2
        )
      )
      return
    }
    throw error
  }

  const now = Date.now()
  let totalEntries = 0
  let missingHeadshots = 0
  let missingTeamLogos = 0
  let missingTeamLogoTrue = 0
  let missingTeamLogoNoTeamExpected = 0
  let missingTeamLogoFreeAgentExpected = 0
  let missingTeamLogoUnknownTeam = 0
  let missingImages = 0
  let missingAdp = 0
  let missingProjections = 0
  let missingRookieFlags = 0
  let unavailableOrDraftedCount = 0
  let mockCachedRows = 0
  let specialtyCachedRows = 0

  const duplicateCounter = new Map<string, number>()
  const cacheAgesSeconds: number[] = []

  for (const row of rows) {
    if (row.cacheKey.startsWith('mock:')) {
      mockCachedRows += 1
    }
    if (
      row.cacheKey.startsWith('dispersal:') ||
      row.cacheKey.startsWith('supplemental:') ||
      row.cacheKey.startsWith('rookie:') ||
      row.cacheKey.startsWith('specialty:')
    ) {
      specialtyCachedRows += 1
    }
    cacheAgesSeconds.push(Math.max(0, Math.floor((now - row.syncedAt.getTime()) / 1000)))
    const entries = asEntries(row.payload)
    totalEntries += entries.length

    for (const entry of entries) {
      const headshot = hasHeadshot(entry)
      const teamLogo = hasTeamLogo(entry)
      if (shouldAuditPlayerMetrics(entry)) {
        if (!headshot) missingHeadshots += 1
        if (!teamLogo) {
          missingTeamLogos += 1
          const logoBucket = classifyMissingTeamLogo(entry)
          if (logoBucket === 'missingTeamLogoTrue') missingTeamLogoTrue += 1
          else if (logoBucket === 'missingTeamLogoNoTeamExpected') missingTeamLogoNoTeamExpected += 1
          else if (logoBucket === 'missingTeamLogoFreeAgentExpected') missingTeamLogoFreeAgentExpected += 1
          else if (logoBucket === 'missingTeamLogoUnknownTeam') missingTeamLogoUnknownTeam += 1
        }
        if (!headshot && !teamLogo) missingImages += 1
        if (!hasAdp(entry)) missingAdp += 1
        if (!hasProjection(entry)) missingProjections += 1
        if (!hasRookieFlag(entry)) missingRookieFlags += 1
        if (isUnavailableOrDrafted(entry)) unavailableOrDraftedCount += 1

        const key = dedupeKey(entry)
        duplicateCounter.set(key, (duplicateCounter.get(key) ?? 0) + 1)
      }
    }
  }

  const duplicatePlayers = [...duplicateCounter.values()].reduce((acc, n) => acc + Math.max(0, n - 1), 0)
  const ageMin = cacheAgesSeconds.length ? Math.min(...cacheAgesSeconds) : 0
  const ageMax = cacheAgesSeconds.length ? Math.max(...cacheAgesSeconds) : 0
  const ageAvg = cacheAgesSeconds.length
    ? Math.round(cacheAgesSeconds.reduce((a, b) => a + b, 0) / cacheAgesSeconds.length)
    : 0

  const report = {
    rowsScanned: rows.length,
    leagueFilter: leagueId,
    mockOnly,
    draftKind,
    totalCachedRows: rows.length,
    mockCachedRows,
    liveCachedRows: rows.length - mockCachedRows - specialtyCachedRows,
    specialtyCachedRows,
    totalEntries,
    missingHeadshots,
    missingTeamLogos,
    missingTeamLogoTrue,
    missingTeamLogoNoTeamExpected,
    missingTeamLogoFreeAgentExpected,
    missingTeamLogoUnknownTeam,
    anyTeamAssignedPlayersMissingLogos: missingTeamLogoTrue > 0,
    missingImages,
    duplicatePlayers,
    missingAdp,
    missingProjections,
    missingRookieFlags,
    unavailableOrDraftedCount,
    cacheAgeSeconds: {
      min: ageMin,
      avg: ageAvg,
      max: ageMax,
    },
    latestRows: rows.slice(0, 10).map((row) => ({
      id: row.id,
      leagueId: row.leagueId,
      cacheKey: row.cacheKey,
      entryCount: row.entryCount,
      syncedAt: row.syncedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    })),
  }

  console.log('[draft-pool:cache:audit] summary')
  console.log(JSON.stringify(report, null, 2))
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[draft-pool:cache:audit] failed:', message)
  process.exit(1)
})
