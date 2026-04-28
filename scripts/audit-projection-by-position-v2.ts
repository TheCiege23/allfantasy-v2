/**
 * audit-projection-by-position-v2.ts
 * Better bucket logic based on actual field inspection from cache entries.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const IDP_POSITIONS = new Set(['LB', 'CB', 'S', 'DT', 'DE', 'DL', 'EDGE', 'DB', 'FS', 'SS', 'OLB', 'ILB', 'MLB', 'LOLB', 'ROLB'])
const FANTASY_SKILL = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'FB', 'PK', 'KICKER'])

async function main() {
  const leagueId = 'ff789927-99f5-4346-9c1c-03308990ea63'

  const cacheRow = await prisma.draftPoolCache.findFirst({
    where: { leagueId, cacheKey: { contains: 'limit=300' } },
    orderBy: { syncedAt: 'desc' },
    select: { payload: true, entryCount: true, syncedAt: true },
  })

  if (!cacheRow) { console.error('No cache row'); process.exit(1) }

  const pl = cacheRow.payload as Record<string, unknown>
  const entries = (pl.entries ?? []) as Record<string, unknown>[]

  // Print full shape of 3 missing entries
  const sampleMissing: Record<string, unknown>[] = []
  for (const e of entries) {
    const fppg = ((e.display as Record<string,unknown>)?.stats as Record<string,unknown>)?.fantasyPointsPerGame
    if (sampleMissing.length < 3 && (fppg === null || fppg === undefined)) {
      sampleMissing.push(e)
    }
  }
  console.log('=== SAMPLE MISSING ENTRY KEYS ===')
  for (const e of sampleMissing) {
    console.log('\nName:', e.name, '| pos:', e.position)
    console.log('Top-level keys:', Object.keys(e).join(', '))
    const disp = e.display as Record<string,unknown>
    if (disp) console.log('display keys:', Object.keys(disp).join(', '))
    const stats = disp?.stats as Record<string,unknown>
    if (stats) console.log('display.stats keys:', Object.keys(stats).join(', '))
  }

  // Print full shape of 2 PRESENT entries
  const samplePresent: Record<string, unknown>[] = []
  for (const e of entries) {
    const fppg = ((e.display as Record<string,unknown>)?.stats as Record<string,unknown>)?.fantasyPointsPerGame
    if (samplePresent.length < 2 && typeof fppg === 'number') {
      samplePresent.push(e)
    }
  }
  console.log('\n=== SAMPLE PRESENT ENTRY KEYS ===')
  for (const e of samplePresent) {
    console.log('\nName:', e.name, '| pos:', e.position)
    console.log('Top-level keys:', Object.keys(e).join(', '))
    const disp = e.display as Record<string,unknown>
    if (disp) console.log('display keys:', Object.keys(disp).join(', '))
    const stats = disp?.stats as Record<string,unknown>
    if (stats) console.log('display.stats keys:', Object.keys(stats).join(', '), '| fppg=', stats.fantasyPointsPerGame)
  }

  // Now compute proper breakdowns
  // Bucket by: position type, rookie status, whether any RI data was attached
  const byPos: Record<string, { total: number; hasProj: number; missing: number }> = {}

  const buckets = {
    team_def: { total: 0, hasProj: 0, missing: 0, examples: [] as string[] },
    idp:      { total: 0, hasProj: 0, missing: 0, examples: [] as string[] },
    rookie_skill: { total: 0, hasProj: 0, missing: 0, examples: [] as string[] },
    veteran_skill_no_ri:   { total: 0, hasProj: 0, missing: 0, examples: [] as string[] },
    veteran_skill_ri_null_fppg: { total: 0, hasProj: 0, missing: 0, examples: [] as string[] },
    kicker:   { total: 0, hasProj: 0, missing: 0, examples: [] as string[] },
  }

  let totalMissing = 0
  let totalHas = 0

  for (const e of entries) {
    const name = String(e.name ?? e.playerName ?? '')
    const pos = String(e.position ?? e.pos ?? 'UNKNOWN').toUpperCase()
    const isRookie = e.isRookie === true
    const yearsExp = typeof e.yearsExp === 'number' ? e.yearsExp : null
    const isRookieLike = isRookie || yearsExp === 0

    const display = (e.display ?? {}) as Record<string, unknown>
    const displayStats = (display.stats ?? {}) as Record<string, unknown>
    const fppg = displayStats.fantasyPointsPerGame as number | null
    const hasProj = typeof fppg === 'number' && Number.isFinite(fppg)
    const primarySource = displayStats.primarySource as string | null
    const riSupplemental = displayStats.rollingInsightsSupplemental as Record<string, unknown> | null
    const hasRiSupplemental = riSupplemental !== null && riSupplemental !== undefined
    const riGames = riSupplemental?.gamesPlayed as number | null
    const riFppg = riSupplemental?.fantasyPointsPerGame as number | null

    // Position coverage tracking
    if (!byPos[pos]) byPos[pos] = { total: 0, hasProj: 0, missing: 0 }
    byPos[pos].total++
    if (hasProj) { byPos[pos].hasProj++; totalHas++ } else { byPos[pos].missing++; totalMissing++ }

    if (hasProj) {
      // Still categorize for total counts
      const bk = pos === 'DEF' || pos === 'DST' ? buckets.team_def :
                 IDP_POSITIONS.has(pos) ? buckets.idp :
                 (pos === 'K' || pos === 'PK' || pos === 'KICKER') ? buckets.kicker :
                 isRookieLike ? buckets.rookie_skill :
                 hasRiSupplemental ? buckets.veteran_skill_ri_null_fppg : buckets.veteran_skill_no_ri
      bk.total++; bk.hasProj++
      continue
    }

    // Missing projection — bucket it
    const team = String(e.team ?? e.teamAbbr ?? 'FA')
    const example = `${name} (${pos}, ${team})`

    if (pos === 'DEF' || pos === 'DST') {
      buckets.team_def.total++; buckets.team_def.missing++
      if (buckets.team_def.examples.length < 5) buckets.team_def.examples.push(example)
    } else if (IDP_POSITIONS.has(pos)) {
      buckets.idp.total++; buckets.idp.missing++
      if (buckets.idp.examples.length < 5) buckets.idp.examples.push(example)
    } else if (pos === 'K' || pos === 'PK' || pos === 'KICKER') {
      buckets.kicker.total++; buckets.kicker.missing++
      if (buckets.kicker.examples.length < 5) buckets.kicker.examples.push(example)
    } else if (isRookieLike) {
      buckets.rookie_skill.total++; buckets.rookie_skill.missing++
      if (buckets.rookie_skill.examples.length < 5) buckets.rookie_skill.examples.push(example)
    } else if (hasRiSupplemental) {
      // RI found the player but FPPG came back null (likely 0-game seasons)
      buckets.veteran_skill_ri_null_fppg.total++; buckets.veteran_skill_ri_null_fppg.missing++
      if (buckets.veteran_skill_ri_null_fppg.examples.length < 5) buckets.veteran_skill_ri_null_fppg.examples.push(`${example} riGp=${riGames} riFppg=${riFppg}`)
    } else {
      // Skill position, not rookie, no RI data at all — primary loader missed completely
      buckets.veteran_skill_no_ri.total++; buckets.veteran_skill_no_ri.missing++
      if (buckets.veteran_skill_no_ri.examples.length < 5) buckets.veteran_skill_no_ri.examples.push(`${example} yrsExp=${yearsExp} src=${primarySource}`)
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
  console.log(`  TOTAL: ${entries.length} hasProj=${totalHas} missing=${totalMissing}`)

  console.log('\n═══════════════════════════════════════════════')
  console.log('MISSING PROJECTIONS BY BUCKET')
  console.log('═══════════════════════════════════════════════')
  for (const [bkt, v] of Object.entries(buckets)) {
    const cov = v.total > 0 ? Math.round((v.hasProj / v.total) * 100) : 0
    console.log(`\n[${bkt}]  total=${v.total}  hasProj=${v.hasProj}  missing=${v.missing}  cov=${cov}%`)
    if (v.examples.length) console.log('  Examples:', v.examples.join('\n           '))
  }

  // Check how many "veteran_skill_no_ri" players have data in SportsPlayerRecord
  const noRiNames = entries
    .filter((e) => {
      const pos = String(e.position ?? '').toUpperCase()
      const isRookieLike = e.isRookie === true || (typeof e.yearsExp === 'number' && e.yearsExp === 0)
      const disp = (e.display ?? {}) as Record<string, unknown>
      const dStats = (disp.stats ?? {}) as Record<string, unknown>
      const fppg = dStats.fantasyPointsPerGame as number | null
      const hasProj = typeof fppg === 'number' && Number.isFinite(fppg)
      const hasRiSuppl = !!(dStats.rollingInsightsSupplemental)
      return !hasProj && FANTASY_SKILL.has(pos) && !isRookieLike && !hasRiSuppl
    })
    .map((e) => String(e.name ?? e.playerName ?? '').toLowerCase())
    .filter(Boolean)
    .slice(0, 50)

  if (noRiNames.length > 0) {
    const sprRows = await prisma.sportsPlayerRecord.findMany({
      where: { sport: 'NFL', name: { in: noRiNames } },
      select: { name: true, position: true, projections: true, stats: true },
      take: 50,
    })
    const sprWithProjections = sprRows.filter((r) => r.projections !== null)
    const sprWithStats = sprRows.filter((r) => r.stats !== null)
    console.log(`\n[veteran_skill_no_ri] SportsPlayerRecord cross-check (sample n=${noRiNames.length}):`)
    console.log(`  Matched SPR rows: ${sprRows.length}`)
    console.log(`  SPR with projections field: ${sprWithProjections.length}`)
    console.log(`  SPR with stats field: ${sprWithStats.length}`)
    if (sprWithProjections.length > 0) {
      const s = sprWithProjections[0]
      console.log(`  Sample projections: ${JSON.stringify(s.projections).slice(0, 200)}`)
    }
  }
}

main()
  .catch((e) => { console.error('[audit] FAILED:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
