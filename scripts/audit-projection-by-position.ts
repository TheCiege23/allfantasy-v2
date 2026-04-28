/**
 * audit-projection-by-position.ts
 * Reads DraftPoolCache and breaks down missing projections by position bucket.
 * Identifies DEF, IDP, rookie, low-usage, and unmapped offensive players.
 * Audit-only — no writes.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const IDP_POSITIONS = new Set(['LB', 'CB', 'S', 'DT', 'DE', 'DL', 'EDGE', 'DB', 'FS', 'SS', 'OLB', 'ILB', 'MLB'])
const FANTASY_SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'FB'])

function bucket(pos: string, isRookie: boolean, gamesPlayed: number | null): string {
  const p = pos.toUpperCase()
  if (p === 'DEF' || p === 'DST') return 'team_def'
  if (IDP_POSITIONS.has(p)) return 'idp'
  if (isRookie) return 'rookie'
  if (gamesPlayed === 0 || gamesPlayed === null) return 'low_usage'
  return 'offensive_unmapped'
}

async function main() {
  const leagueId = 'ff789927-99f5-4346-9c1c-03308990ea63'

  const cacheRow = await prisma.draftPoolCache.findFirst({
    where: { leagueId, cacheKey: { contains: 'limit=300' } },
    orderBy: { syncedAt: 'desc' },
    select: { payload: true, entryCount: true, syncedAt: true, cacheKey: true },
  })

  if (!cacheRow) {
    console.error('[audit] No cache row found for league', leagueId)
    process.exit(1)
  }

  const pl = cacheRow.payload as Record<string, unknown>
  // Try common payload shapes
  let entries: unknown[] = []
  if (Array.isArray(pl)) {
    entries = pl
  } else if (pl && typeof pl === 'object') {
    // Try 'players', 'entries', 'pool', 'data', 'items'
    for (const key of ['players', 'entries', 'pool', 'data', 'items']) {
      if (Array.isArray((pl as Record<string, unknown>)[key])) {
        entries = (pl as Record<string, unknown>)[key] as unknown[]
        break
      }
    }
  }

  console.log(`[audit] cache: ${cacheRow.cacheKey}`)
  console.log(`[audit] syncedAt=${cacheRow.syncedAt} entryCount=${cacheRow.entryCount}`)
  console.log(`[audit] payload keys: ${Object.keys(pl).join(', ')}`)
  console.log(`[audit] entries resolved: ${entries.length}`)

  if (entries.length === 0) {
    // Inspect one entry if the root IS the object
    console.log('[audit] Sample payload (first 200 chars):', JSON.stringify(pl).slice(0, 200))
    process.exit(0)
  }

  // Position breakdown
  const byPos: Record<string, { total: number; hasProj: number; missing: number }> = {}
  // Bucket breakdown
  const byBucket: Record<string, { total: number; hasProj: number; missing: number; examples: string[] }> = {}
  // Missing entries detail
  const missingDetail: Array<{
    name: string
    pos: string
    team: string | null
    isRookie: boolean
    yearsExp: number | null
    gamesPlayed: number | null
    riSeason: string | null
    sleeperStatus: string | null
    fppgInRI: number | null
  }> = []

  for (const raw of entries) {
    const e = raw as Record<string, unknown>
    const name = String(e.name ?? e.playerName ?? e.full_name ?? '')
    const pos = String(e.position ?? e.pos ?? 'UNKNOWN').toUpperCase()
    const team = (e.team ?? e.teamAbbr ?? null) as string | null
    const isRookie = e.isRookie === true || (typeof e.yearsExp === 'number' && (e.yearsExp as number) === 0)
    const yearsExp = typeof e.yearsExp === 'number' ? (e.yearsExp as number) : null
    const gamesPlayed = typeof e.gamesPlayed === 'number' ? (e.gamesPlayed as number) : null
    const riSeason = (e.riSeason ?? e.statsSeason ?? null) as string | null
    const status = (e.status ?? e.sleeperStatus ?? null) as string | null

    // Check projection
    const display = (e.display ?? {}) as Record<string, unknown>
    const displayStats = (display.stats ?? {}) as Record<string, unknown>
    const fppg =
      (displayStats.fantasyPointsPerGame as number | null) ??
      (e.fantasyPointsPerGame as number | null) ??
      null
    const hasProj = typeof fppg === 'number' && Number.isFinite(fppg)

    // RI supplemental data
    const riSupplemental = (e.rollingInsightsSupplemental ?? e.riSupplemental ?? {}) as Record<string, unknown>
    const fppgInRI = (riSupplemental.fantasyPointsPerGame as number | null) ?? null
    const gamesInRI = (riSupplemental.gamesPlayed as number | null) ?? gamesPlayed

    if (!byPos[pos]) byPos[pos] = { total: 0, hasProj: 0, missing: 0 }
    byPos[pos].total++
    if (hasProj) byPos[pos].hasProj++; else byPos[pos].missing++

    const bkt = bucket(pos, isRookie, gamesInRI)
    if (!byBucket[bkt]) byBucket[bkt] = { total: 0, hasProj: 0, missing: 0, examples: [] }
    byBucket[bkt].total++
    if (hasProj) {
      byBucket[bkt].hasProj++
    } else {
      byBucket[bkt].missing++
      if (missingDetail.length < 500) {
        missingDetail.push({ name, pos, team, isRookie, yearsExp, gamesPlayed: gamesInRI, riSeason, sleeperStatus: status, fppgInRI })
      }
      if (byBucket[bkt].examples.length < 5) {
        byBucket[bkt].examples.push(`${name} (${pos}, ${team ?? 'FA'})`)
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════')
  console.log('MISSING PROJECTIONS BY POSITION')
  console.log('═══════════════════════════════════════════════')
  const sortedPos = Object.entries(byPos).sort((a, b) => b[1].missing - a[1].missing)
  console.log(`${'POS'.padEnd(10)} ${'TOTAL'.padStart(6)} ${'HAS'.padStart(6)} ${'MISSING'.padStart(8)} ${'COV%'.padStart(6)}`)
  for (const [pos, v] of sortedPos) {
    const cov = Math.round((v.hasProj / v.total) * 100)
    console.log(`${pos.padEnd(10)} ${String(v.total).padStart(6)} ${String(v.hasProj).padStart(6)} ${String(v.missing).padStart(8)} ${(cov + '%').padStart(6)}`)
  }

  console.log('\n═══════════════════════════════════════════════')
  console.log('MISSING PROJECTIONS BY BUCKET')
  console.log('═══════════════════════════════════════════════')
  const sortedBucket = Object.entries(byBucket).sort((a, b) => b[1].missing - a[1].missing)
  for (const [bkt, v] of sortedBucket) {
    const cov = Math.round((v.hasProj / v.total) * 100)
    console.log(`\n[${bkt}] total=${v.total} hasProj=${v.hasProj} missing=${v.missing} cov=${cov}%`)
    if (v.examples.length) console.log('  Examples:', v.examples.join(' | '))
  }

  // For offensive_unmapped: check how many have gamesPlayed > 0 in RI supplemental
  const offUnmapped = missingDetail.filter((r) => bucket(r.pos, r.isRookie, r.gamesPlayed) === 'offensive_unmapped')
  const offUnmappedWithGames = offUnmapped.filter((r) => (r.gamesPlayed ?? 0) > 0)
  const offUnmappedWithRiData = offUnmapped.filter((r) => r.fppgInRI !== null)
  console.log('\n═══════════════════════════════════════════════')
  console.log('OFFENSIVE_UNMAPPED DETAIL')
  console.log('═══════════════════════════════════════════════')
  console.log(`Total: ${offUnmapped.length}`)
  console.log(`  With gamesPlayed > 0: ${offUnmappedWithGames.length}`)
  console.log(`  With RI fppg in supplemental: ${offUnmappedWithRiData.length}`)
  if (offUnmapped.length > 0) {
    console.log('  Sample (up to 10):')
    for (const r of offUnmapped.slice(0, 10)) {
      console.log(`    ${r.name} (${r.pos}, ${r.team ?? 'FA'}) gp=${r.gamesPlayed} riSeason=${r.riSeason} fppgRI=${r.fppgInRI}`)
    }
  }
}

main()
  .catch((e) => { console.error('[audit] FAILED:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
