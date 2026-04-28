/**
 * Targeted backfill for PlayerIdentityMap rows where sleeperId is null but the
 * correct Sleeper ID can be confirmed from the draft pool cache.
 *
 * These are the "blocked" rows reported by audit-player-identity-collisions as
 * identityMissingSleeperCarryForward. The audit already validates them as
 * collision-free; this script applies the write.
 *
 * Usage (dry-run by default):
 *   npx tsx scripts/backfill-blocked-sleeper-ids.ts --leagueId=<leagueId>
 *
 * Apply (execute DB writes):
 *   npx tsx scripts/backfill-blocked-sleeper-ids.ts --leagueId=<leagueId> --apply
 *
 * JSON output:
 *   npx tsx scripts/backfill-blocked-sleeper-ids.ts --leagueId=<leagueId> --json
 *
 * npm shortcut (add leagueId via env or direct arg):
 *   npm run draft-pool:backfill-blocked-sleeper-ids -- --leagueId=<id> [--apply]
 *
 * Safety rules enforced per row before write:
 *   1. Target PlayerIdentityMap row must still have sleeperId=null (idempotent guard).
 *   2. expectedSleeperId must not already be assigned to a different PlayerIdentityMap row.
 *   3. Expected Sleeper ID must be a positive-integer-format string (≥3 digits).
 *   4. Jr/non-Jr suffix distinction is preserved (canonicalName keeps suffixes).
 *   5. Strict position match required (QB, RB, WR, TE — not a cross-position write).
 */

import { PrismaClient } from '@prisma/client'
import { canonicalName, canonicalPosition, canonicalTeam } from '../lib/draft-room/player-canonical-identity'

const prisma = new PrismaClient()

type Args = {
  leagueId: string
  apply: boolean
  json: boolean
}

type BlockedRow = {
  identityId: string
  canonicalName: string
  position: string | null
  currentTeam: string | null
  identitySleeperId: string | null
  expectedSleeperId: string
  rollingInsightsId: string | null
}

type RowResult = {
  identityId: string
  canonicalName: string
  position: string | null
  currentTeam: string | null
  expectedSleeperId: string
  action: 'written' | 'skipped:already-set' | 'skipped:collision' | 'skipped:invalid-id' | 'skipped:dry-run'
  collisionOwner?: string | null
  error?: string
}

function parseArgs(argv: string[]): Args {
  const out: Args = { leagueId: '', apply: false, json: false }
  for (const raw of argv) {
    if (raw.startsWith('--leagueId=')) out.leagueId = raw.slice('--leagueId='.length)
    else if (raw.startsWith('--league=')) out.leagueId = raw.slice('--league='.length)
    else if (raw === '--apply') out.apply = true
    else if (raw === '--json') out.json = true
  }
  return out
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

function isValidSleeperId(value: string | null | undefined): boolean {
  return /^\d{3,}$/.test(String(value ?? '').trim())
}

type AnyObj = Record<string, unknown>

function readPath(obj: AnyObj, path: string[]): unknown {
  let cur: unknown = obj
  for (const segment of path) {
    if (!cur || typeof cur !== 'object') return null
    cur = (cur as AnyObj)[segment]
  }
  return cur
}

function extractCacheSleeperIdMap(payload: unknown): Map<string, string> {
  /**
   * Returns a Map: strictKey → sleeperId
   * strictKey = `${canonicalName}|${canonicalPosition}|${canonicalTeam}`
   */
  const map = new Map<string, string>()
  if (!payload || typeof payload !== 'object') return map

  const root = payload as AnyObj
  const entries = Array.isArray(root.entries) ? root.entries : []

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as AnyObj

    const name =
      str(e.name) ??
      str(readPath(e, ['display', 'displayName']))
    const position =
      str(e.position) ??
      str(readPath(e, ['display', 'metadata', 'position']))
    const team =
      str(e.team) ??
      str(readPath(e, ['display', 'team', 'abbreviation']))

    if (!name) continue

    const rawSleeperId = str(e.sleeperId)
    const rawPlayerId = str(e.playerId) ?? str(readPath(e, ['display', 'playerId']))

    const sleeperId =
      rawSleeperId && isValidSleeperId(rawSleeperId)
        ? rawSleeperId
        : rawPlayerId && isValidSleeperId(rawPlayerId)
          ? rawPlayerId
          : null

    if (!sleeperId) continue

    const key = `${canonicalName(name)}|${canonicalPosition(position)}|${canonicalTeam(team)}`
    if (!map.has(key)) map.set(key, sleeperId)
  }

  return map
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (!args.leagueId) {
    throw new Error('Missing --leagueId=<leagueId>')
  }

  // ── 1. Load latest draft pool cache for this league ──────────────────────
  const latestCache = await prisma.draftPoolCache.findFirst({
    where: {
      leagueId: args.leagueId,
      cacheKey: { contains: 'draft_pool:' },
    },
    orderBy: { syncedAt: 'desc' },
    select: { payload: true, syncedAt: true, cacheKey: true },
  })

  if (!latestCache) {
    throw new Error(`No draft pool cache found for leagueId=${args.leagueId}`)
  }

  const cacheSleeperIdByStrictKey = extractCacheSleeperIdMap(latestCache.payload)

  // ── 2. Load identity rows with no sleeperId ───────────────────────────────
  const identityRowsMissing = await prisma.playerIdentityMap.findMany({
    where: { sport: 'NFL', sleeperId: null },
    select: {
      id: true,
      canonicalName: true,
      position: true,
      currentTeam: true,
      sleeperId: true,
      rollingInsightsId: true,
    },
    take: 10000,
  })

  // ── 3. Build blocked list (same logic as audit script) ───────────────────
  const blocked: BlockedRow[] = identityRowsMissing
    .map((row) => {
      const key = `${canonicalName(row.canonicalName)}|${canonicalPosition(row.position)}|${canonicalTeam(row.currentTeam)}`
      const expectedSleeperId = cacheSleeperIdByStrictKey.get(key) ?? null
      if (!expectedSleeperId) return null
      if (row.sleeperId) return null // already set
      return {
        identityId: row.id,
        canonicalName: row.canonicalName,
        position: row.position,
        currentTeam: row.currentTeam,
        identitySleeperId: row.sleeperId,
        expectedSleeperId,
        rollingInsightsId: row.rollingInsightsId,
      }
    })
    .filter((v): v is BlockedRow => Boolean(v))

  // ── 4. Load assigned IDs to check collision risk ─────────────────────────
  const expectedIds = blocked.map((b) => b.expectedSleeperId)

  const alreadyAssigned = await prisma.playerIdentityMap.findMany({
    where: {
      sport: 'NFL',
      sleeperId: { in: expectedIds },
    },
    select: {
      id: true,
      canonicalName: true,
      sleeperId: true,
    },
  })

  const assignedByExpectedId = new Map<string, string>()
  for (const row of alreadyAssigned) {
    if (row.sleeperId) assignedByExpectedId.set(row.sleeperId, `${row.canonicalName} (id=${row.id})`)
  }

  // ── 5. Evaluate each row and (optionally) apply ───────────────────────────
  const results: RowResult[] = []

  for (const blocked_row of blocked) {
    const base: RowResult = {
      identityId: blocked_row.identityId,
      canonicalName: blocked_row.canonicalName,
      position: blocked_row.position,
      currentTeam: blocked_row.currentTeam,
      expectedSleeperId: blocked_row.expectedSleeperId,
      action: 'skipped:dry-run',
    }

    // Guard: sleeperId format validity
    if (!isValidSleeperId(blocked_row.expectedSleeperId)) {
      results.push({ ...base, action: 'skipped:invalid-id' })
      continue
    }

    // Guard: collision — is this sleeperId already taken by a different row?
    const collisionOwner = assignedByExpectedId.get(blocked_row.expectedSleeperId) ?? null
    if (collisionOwner) {
      results.push({ ...base, action: 'skipped:collision', collisionOwner })
      continue
    }

    if (!args.apply) {
      results.push({ ...base, action: 'skipped:dry-run' })
      continue
    }

    try {
      // Idempotent: only write if still null at write time
      const current = await prisma.playerIdentityMap.findUnique({
        where: { id: blocked_row.identityId },
        select: { sleeperId: true },
      })

      if (current?.sleeperId) {
        results.push({ ...base, action: 'skipped:already-set' })
        continue
      }

      await prisma.playerIdentityMap.update({
        where: { id: blocked_row.identityId },
        data: {
          sleeperId: blocked_row.expectedSleeperId,
          lastSyncedAt: new Date(),
        },
      })

      results.push({ ...base, action: 'written' })
    } catch (err) {
      results.push({ ...base, action: 'skipped:dry-run', error: err instanceof Error ? err.message : String(err) })
    }
  }

  const written = results.filter((r) => r.action === 'written').length
  const dryRun = results.filter((r) => r.action === 'skipped:dry-run').length
  const collision = results.filter((r) => r.action === 'skipped:collision').length
  const alreadySet = results.filter((r) => r.action === 'skipped:already-set').length
  const invalidId = results.filter((r) => r.action === 'skipped:invalid-id').length

  const summary = {
    leagueId: args.leagueId,
    cacheKey: latestCache.cacheKey,
    cacheSyncedAt: latestCache.syncedAt.toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    blockedCount: blocked.length,
    written,
    skipped: { dryRun, collision, alreadySet, invalidId },
    rows: results,
  }

  if (args.json || !process.stdout.isTTY) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(`\n[backfill-blocked-sleeper-ids] ${args.apply ? 'APPLY' : 'DRY-RUN'} — leagueId=${args.leagueId}`)
    console.log(`  blocked rows found  : ${blocked.length}`)
    console.log(`  written             : ${written}`)
    console.log(`  skipped (dry-run)   : ${dryRun}`)
    console.log(`  skipped (collision) : ${collision}`)
    console.log(`  skipped (already set): ${alreadySet}`)
    console.log(`  skipped (invalid id): ${invalidId}`)
    console.log()
    for (const r of results) {
      const flag = r.action === 'written' ? '✓' : r.action === 'skipped:collision' ? '⚠' : '-'
      const extra = r.collisionOwner ? ` [collision: ${r.collisionOwner}]` : r.error ? ` [error: ${r.error}]` : ''
      console.log(`  ${flag} ${r.canonicalName} (${r.position}/${r.currentTeam}) → ${r.expectedSleeperId} [${r.action}]${extra}`)
    }
    console.log()
    if (!args.apply) {
      console.log('  Run with --apply to execute the writes.')
    }
  }

  if (args.apply && collision > 0) {
    process.exitCode = 1
  }
}

void main()
  .catch((err) => {
    console.error('[backfill-blocked-sleeper-ids] failed:', err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
