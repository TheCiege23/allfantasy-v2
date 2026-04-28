/**
 * PlayerIdentityMap sleeperId carry-forward (diagnostic first, guarded apply).
 *
 * Usage:
 *   npx tsx scripts/backfill-player-identity-sleeper-carry-forward.ts
 *   npx tsx scripts/backfill-player-identity-sleeper-carry-forward.ts --json
 *   npx tsx scripts/backfill-player-identity-sleeper-carry-forward.ts --apply
 *
 * Defaults:
 *   - dry-run (no writes)
 *   - sport = NFL
 *
 * Safety rules:
 *   - normalized-name match
 *   - position match
 *   - team match when both sides have team
 *   - no Jr/non-Jr cross matching (canonical name keeps suffixes)
 *   - candidate sleeperId must not already belong to another PlayerIdentityMap row
 *   - if multiple candidate sleeperIds exist for an identity row, skip
 *   - if one candidate sleeperId maps to multiple identity rows in this run, skip
 */

import { PrismaClient } from '@prisma/client'
import { canonicalName, canonicalPosition, canonicalTeam } from '../lib/draft-room/player-canonical-identity'

const prisma = new PrismaClient()

type Args = {
  apply: boolean
  json: boolean
  sport: string
  limit: number | null
  onlyNames: Set<string> | null
}

type IdentityRow = {
  id: string
  canonicalName: string
  normalizedName: string
  currentTeam: string | null
  position: string | null
  sleeperId: string | null
}

type SportsPlayerRow = {
  id: string
  name: string
  position: string | null
  team: string | null
  sleeperId: string | null
  source: string
}

type SportsRecordRow = {
  id: string
  name: string
  position: string
  team: string
  dataSource: string
}

type DraftPoolCacheRow = {
  payload: unknown
  syncedAt: Date
}

type CacheEntryRow = {
  name: string
  position: string | null
  team: string | null
  sleeperId: string | null
}

type CandidateRow = {
  identityId: string
  canonicalName: string
  normalizedName: string
  currentTeam: string | null
  position: string | null
  candidateSleeperId: string | null
  sourceTable: string | null
  confidenceReason: string
  collisionRisk: string
  safeToApply: boolean
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    apply: false,
    json: false,
    sport: 'NFL',
    limit: null,
    onlyNames: null,
  }

  for (const arg of argv) {
    if (arg === '--apply') out.apply = true
    else if (arg === '--json') out.json = true
    else if (arg.startsWith('--sport=')) out.sport = String(arg.slice('--sport='.length) || 'NFL').toUpperCase()
    else if (arg.startsWith('--limit=')) {
      const n = Number.parseInt(arg.slice('--limit='.length), 10)
      if (Number.isFinite(n) && n > 0) out.limit = n
    } else if (arg.startsWith('--onlyNames=')) {
      const raw = String(arg.slice('--onlyNames='.length) ?? '').trim()
      const names = raw
        .split(',')
        .map((v) => canonicalName(v))
        .filter((v) => v.length > 0)
      if (names.length > 0) out.onlyNames = new Set(names)
    }
  }

  return out
}

function normName(value: string | null | undefined): string {
  return canonicalName(value)
}

function normPos(value: string | null | undefined): string {
  return canonicalPosition(value)
}

function normTeam(value: string | null | undefined): string {
  return canonicalTeam(value)
}

function isNoTeamToken(value: string | null | undefined): boolean {
  const t = normTeam(value)
  return t === '' || t === 'FA' || t === 'F/A' || t === 'NONE' || t === 'N/A' || t === 'NA' || t === 'UNKNOWN'
}

function effectiveTeamForMatch(value: string | null | undefined): string {
  return isNoTeamToken(value) ? '' : normTeam(value)
}

function sourceTeamMatches(identityTeam: string, sourceTeam: string): boolean {
  const a = effectiveTeamForMatch(identityTeam)
  const b = effectiveTeamForMatch(sourceTeam)
  if (!a || !b) return true
  return a === b
}

function sleeperIdFromSportsRecordId(id: string | null | undefined): string | null {
  const token = String(id ?? '').trim()
  if (!token) return null
  return /^\d{3,}$/.test(token) ? token : null
}

function getString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

function readPath(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj
  for (const segment of path) {
    if (!cur || typeof cur !== 'object') return null
    cur = (cur as Record<string, unknown>)[segment]
  }
  return cur
}

function extractCacheEntries(payload: unknown): CacheEntryRow[] {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as { entries?: unknown }
  const entries = Array.isArray(root.entries) ? root.entries : []
  return entries
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => ({
      // Some cache rows omit sleeperId but carry the same numeric value in playerId.
      // Treat numeric playerId as a sleeperId candidate for identity carry-forward.
      _playerId: getString(entry.playerId) || getString(readPath(entry, ['display', 'playerId'])),
      name: getString(entry.name) || getString(readPath(entry, ['display', 'displayName'])) || 'unknown',
      position: getString(entry.position) || getString(readPath(entry, ['display', 'metadata', 'position'])),
      team: getString(entry.team) || getString(readPath(entry, ['display', 'team', 'abbreviation'])) || getString(readPath(entry, ['display', 'team', 'abbr'])),
      sleeperId: getString(entry.sleeperId),
    }))
    .map((row) => {
      const direct = String(row.sleeperId ?? '').trim()
      const fallback = String((row as CacheEntryRow & { _playerId?: string | null })._playerId ?? '').trim()
      const sid = /^\d{3,}$/.test(direct) ? direct : /^\d{3,}$/.test(fallback) ? fallback : null
      return {
        name: row.name,
        position: row.position,
        team: row.team,
        sleeperId: sid,
      } as CacheEntryRow
    })
    .filter((row) => Boolean(row.sleeperId))
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  const [missingIdentityRows, assignedIdentityRows, sportsPlayersRaw, sportsRecordsRaw, draftPoolCacheRows] = await Promise.all([
    prisma.playerIdentityMap.findMany({
      where: {
        sport: args.sport,
        sleeperId: null,
      },
      select: {
        id: true,
        canonicalName: true,
        normalizedName: true,
        currentTeam: true,
        position: true,
        sleeperId: true,
      },
      orderBy: { canonicalName: 'asc' },
      ...(args.limit ? { take: args.limit } : {}),
    }) as Promise<IdentityRow[]>,
    prisma.playerIdentityMap.findMany({
      where: {
        sport: args.sport,
        sleeperId: { not: null },
      },
      select: {
        id: true,
        canonicalName: true,
        normalizedName: true,
        currentTeam: true,
        position: true,
        sleeperId: true,
      },
      take: 20000,
    }) as Promise<IdentityRow[]>,
    prisma.sportsPlayer.findMany({
      where: {
        sport: args.sport,
        sleeperId: { not: null },
      },
      select: {
        id: true,
        name: true,
        position: true,
        team: true,
        sleeperId: true,
        source: true,
      },
      take: 30000,
    }) as Promise<SportsPlayerRow[]>,
    prisma.sportsPlayerRecord.findMany({
      where: {
        sport: args.sport,
      },
      select: {
        id: true,
        name: true,
        position: true,
        team: true,
        dataSource: true,
      },
      take: 30000,
    }) as Promise<SportsRecordRow[]>,
    (prisma as any).draftPoolCache.findMany({
      where: {
        cacheKey: { contains: 'draft_pool:' },
      },
      select: {
        payload: true,
        syncedAt: true,
      },
      orderBy: { syncedAt: 'desc' },
      take: 40,
    }) as Promise<DraftPoolCacheRow[]>,
  ])

  const assignedBySleeperId = new Map<string, IdentityRow>()
  for (const row of assignedIdentityRows) {
    const sid = String(row.sleeperId ?? '').trim()
    if (!sid) continue
    if (!assignedBySleeperId.has(sid)) assignedBySleeperId.set(sid, row)
  }

  const sportsPlayersByNamePos = new Map<string, SportsPlayerRow[]>()
  for (const row of sportsPlayersRaw) {
    const sid = String(row.sleeperId ?? '').trim()
    if (!sid) continue
    const key = `${normName(row.name)}|${normPos(row.position)}`
    const list = sportsPlayersByNamePos.get(key) ?? []
    list.push(row)
    sportsPlayersByNamePos.set(key, list)
  }

  const sportsRecordsByNamePos = new Map<string, SportsRecordRow[]>()
  for (const row of sportsRecordsRaw) {
    const sid = sleeperIdFromSportsRecordId(row.id)
    if (!sid) continue
    const key = `${normName(row.name)}|${normPos(row.position)}`
    const list = sportsRecordsByNamePos.get(key) ?? []
    list.push(row)
    sportsRecordsByNamePos.set(key, list)
  }

  const cacheEntriesByNamePos = new Map<string, CacheEntryRow[]>()
  for (const cacheRow of draftPoolCacheRows) {
    for (const row of extractCacheEntries(cacheRow.payload)) {
      const sid = String(row.sleeperId ?? '').trim()
      if (!sid) continue
      const key = `${normName(row.name)}|${normPos(row.position)}`
      const list = cacheEntriesByNamePos.get(key) ?? []
      list.push(row)
      cacheEntriesByNamePos.set(key, list)
    }
  }

  const candidateRows: CandidateRow[] = []

  for (const idRow of missingIdentityRows) {
    const identityName = normName(idRow.canonicalName || idRow.normalizedName)
    const identityPos = normPos(idRow.position)
    const identityTeam = normTeam(idRow.currentTeam)
    const identityKey = `${identityName}|${identityPos}`

    const playerMatches = (sportsPlayersByNamePos.get(identityKey) ?? []).filter((row) =>
      sourceTeamMatches(identityTeam, normTeam(row.team)),
    )

    const recordMatches = (sportsRecordsByNamePos.get(identityKey) ?? []).filter((row) =>
      sourceTeamMatches(identityTeam, normTeam(row.team)),
    )

    const cacheMatches = (cacheEntriesByNamePos.get(identityKey) ?? []).filter((row) =>
      sourceTeamMatches(identityTeam, normTeam(row.team)),
    )

    const sourceBySleeperId = new Map<string, Set<string>>()

    for (const row of playerMatches) {
      const sid = String(row.sleeperId ?? '').trim()
      if (!sid) continue
      const existing = sourceBySleeperId.get(sid) ?? new Set<string>()
      existing.add('SportsPlayer')
      sourceBySleeperId.set(sid, existing)
    }

    for (const row of recordMatches) {
      const sid = sleeperIdFromSportsRecordId(row.id)
      if (!sid) continue
      const existing = sourceBySleeperId.get(sid) ?? new Set<string>()
      existing.add('SportsPlayerRecord')
      sourceBySleeperId.set(sid, existing)
    }

    for (const row of cacheMatches) {
      const sid = String(row.sleeperId ?? '').trim()
      if (!sid) continue
      const existing = sourceBySleeperId.get(sid) ?? new Set<string>()
      existing.add('DraftPoolCache')
      sourceBySleeperId.set(sid, existing)
    }

    const sleeperCandidates = [...sourceBySleeperId.keys()]

    if (sleeperCandidates.length === 0) continue

    if (sleeperCandidates.length > 1) {
      candidateRows.push({
        identityId: idRow.id,
        canonicalName: idRow.canonicalName,
        normalizedName: idRow.normalizedName,
        currentTeam: idRow.currentTeam,
        position: idRow.position,
        candidateSleeperId: null,
        sourceTable: null,
        confidenceReason: 'normalized-name+position match found but multiple sleeperId candidates from sources',
        collisionRisk: `multiple_candidate_sleeper_ids:${sleeperCandidates.join(',')}`,
        safeToApply: false,
      })
      continue
    }

    const candidateSleeperId = sleeperCandidates[0]!
    const sourceTable = [...(sourceBySleeperId.get(candidateSleeperId) ?? new Set<string>())].sort().join('+')

    const owner = assignedBySleeperId.get(candidateSleeperId)
    if (owner && owner.id !== idRow.id) {
      candidateRows.push({
        identityId: idRow.id,
        canonicalName: idRow.canonicalName,
        normalizedName: idRow.normalizedName,
        currentTeam: idRow.currentTeam,
        position: idRow.position,
        candidateSleeperId,
        sourceTable,
        confidenceReason: 'normalized-name+position matched, but sleeperId already belongs to another PlayerIdentityMap row',
        collisionRisk: `sleeper_id_already_assigned_to:${owner.id}`,
        safeToApply: false,
      })
      continue
    }

    const teamMatched =
      playerMatches.some((row) => {
        const srcTeam = normTeam(row.team)
        return Boolean(identityTeam && srcTeam && srcTeam === identityTeam)
      }) ||
      recordMatches.some((row) => {
        const srcTeam = normTeam(row.team)
        return Boolean(identityTeam && srcTeam && srcTeam === identityTeam)
      }) ||
      cacheMatches.some((row) => {
        const srcTeam = normTeam(row.team)
        return Boolean(identityTeam && srcTeam && srcTeam === identityTeam)
      })

    const confidenceReason = [
      'normalized-name-match',
      'position-match',
      teamMatched ? 'team-match' : 'team-not-required',
      sourceTable.includes('+') ? 'source-agreement' : 'single-source-confirmed',
      'jr-suffix-preserved-in-normalized-name',
      'sleeperId-unassigned-in-PlayerIdentityMap',
    ].join(', ')

    candidateRows.push({
      identityId: idRow.id,
      canonicalName: idRow.canonicalName,
      normalizedName: idRow.normalizedName,
      currentTeam: idRow.currentTeam,
      position: idRow.position,
      candidateSleeperId,
      sourceTable,
      confidenceReason,
      collisionRisk: 'none',
      safeToApply: true,
    })
  }

  // Prevent writing the same sleeperId to multiple identity rows in one run.
  const groupedByCandidate = new Map<string, CandidateRow[]>()
  for (const row of candidateRows) {
    const sid = String(row.candidateSleeperId ?? '').trim()
    if (!sid) continue
    const list = groupedByCandidate.get(sid) ?? []
    list.push(row)
    groupedByCandidate.set(sid, list)
  }

  for (const [sid, rows] of groupedByCandidate.entries()) {
    if (rows.length <= 1) continue
    for (const row of rows) {
      row.safeToApply = false
      row.collisionRisk = `candidate_shared_across_multiple_identity_rows:${sid}`
      row.confidenceReason = `${row.confidenceReason}, blocked-by-shared-candidate`
    }
  }

  const safeCandidates = candidateRows
    .filter((row) => row.safeToApply && row.candidateSleeperId)
    .filter((row) => {
      if (!args.onlyNames || args.onlyNames.size === 0) return true
      return args.onlyNames.has(canonicalName(row.canonicalName || row.normalizedName))
    })
  const blockedCandidates = candidateRows.filter((row) => !row.safeToApply)

  const applyLog: Array<{ identityId: string; oldSleeperId: null; newSleeperId: string; updated: boolean }> = []

  if (args.apply) {
    for (const row of safeCandidates) {
      const sid = String(row.candidateSleeperId ?? '').trim()
      if (!sid) continue
      const result = await prisma.playerIdentityMap.updateMany({
        where: {
          id: row.identityId,
          sleeperId: null,
          sport: args.sport,
        },
        data: {
          sleeperId: sid,
        },
      })
      applyLog.push({
        identityId: row.identityId,
        oldSleeperId: null,
        newSleeperId: sid,
        updated: result.count === 1,
      })
    }
  }

  const namedChecks = await prisma.playerIdentityMap.findMany({
    where: {
      sport: args.sport,
      normalizedName: {
        in: [
          canonicalName('Russell Wilson'),
          canonicalName("De'Von Achane"),
          canonicalName('Marvin Harrison Jr.'),
          canonicalName('Marvin Harrison'),
        ],
      },
    },
    select: {
      id: true,
      canonicalName: true,
      normalizedName: true,
      position: true,
      currentTeam: true,
      sleeperId: true,
    },
    orderBy: [{ normalizedName: 'asc' }, { position: 'asc' }],
  })

  const report = {
    mode: args.apply ? 'apply' : 'dry-run',
    sport: args.sport,
    onlyNamesFilter: args.onlyNames ? [...args.onlyNames] : null,
    scannedIdentityRowsMissingSleeperId: missingIdentityRows.length,
    candidateCount: candidateRows.length,
    safeCandidateCount: safeCandidates.length,
    blockedCandidateCount: blockedCandidates.length,
    applyAttempted: args.apply,
    appliedCount: applyLog.filter((x) => x.updated).length,
    applyLog,
    candidates: candidateRows,
    namedChecks,
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('============================================================')
    console.log(' PlayerIdentityMap sleeperId carry-forward')
    console.log('============================================================')
    console.log(`mode: ${report.mode}`)
    console.log(`sport: ${report.sport}`)
    console.log(`scanned missing sleeperId rows: ${report.scannedIdentityRowsMissingSleeperId}`)
    console.log(`candidates: ${report.candidateCount}`)
    console.log(`safe candidates: ${report.safeCandidateCount}`)
    console.log(`blocked candidates: ${report.blockedCandidateCount}`)
    if (args.apply) console.log(`applied updates: ${report.appliedCount}`)
    console.log('')
    console.log('Candidate sample (first 40)')
    for (const row of report.candidates.slice(0, 40)) {
      console.log(
        `- ${row.canonicalName} | pos=${row.position ?? 'NA'} | team=${row.currentTeam ?? 'NA'} | candidate=${row.candidateSleeperId ?? 'NA'} | source=${row.sourceTable ?? 'NA'} | safe=${row.safeToApply} | risk=${row.collisionRisk}`,
      )
    }
    console.log('')
    console.log('Named checks')
    for (const row of report.namedChecks) {
      console.log(
        `- ${row.canonicalName} | normalized=${row.normalizedName} | pos=${row.position ?? 'NA'} | team=${row.currentTeam ?? 'NA'} | sleeperId=${row.sleeperId ?? 'NA'}`,
      )
    }
  }
}

void main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[player-identity:sleeper-carry-forward] failed:', message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
