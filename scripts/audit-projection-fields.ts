/**
 * audit-projection-fields.ts
 * Checks ADP coverage, nflDraftProjectionSplits, lifetimeValue, and SportsPlayerRecord
 * for pool entries that are missing FPPG projections.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const row = await prisma.draftPoolCache.findFirst({
    where: { leagueId: 'ff789927-99f5-4346-9c1c-03308990ea63', cacheKey: { contains: 'limit=300' } },
    orderBy: { syncedAt: 'desc' },
    select: { payload: true },
  })

  const pl = row!.payload as Record<string, unknown>
  const entries = pl.entries as Record<string, unknown>[]

  let adpPresent = 0, adpNull = 0
  let ltvPresent = 0, ltvNull = 0
  let splitsPresent = 0, splitsAllZero = 0
  const missingNames: string[] = []

  for (const e of entries) {
    const stats = ((e.display as Record<string, unknown>)?.stats ?? {}) as Record<string, unknown>
    const fppg = stats.fantasyPointsPerGame as number | null
    const hasProj = typeof fppg === 'number' && Number.isFinite(fppg)
    if (hasProj) continue

    const adp = (e.adp ?? stats.adp) as number | null
    const ltv = stats.lifetimeValue as number | null
    const splits = e.nflDraftProjectionSplits as Record<string, unknown> | null

    if (adp !== null && adp !== undefined) adpPresent++; else adpNull++
    if (ltv !== null && ltv !== undefined && ltv !== 0) ltvPresent++; else ltvNull++

    if (splits) {
      splitsPresent++
      const vals = Object.values(splits)
      const allZero = vals.every((v) => !v || (typeof v === 'number' && v === 0))
      if (allZero) splitsAllZero++
    }

    const name = String(e.name ?? e.playerName ?? '')
    if (missingNames.length < 200 && name) missingNames.push(name)
  }

  console.log('Missing FPPG entries:', adpPresent + adpNull)
  console.log('  ADP present:', adpPresent, '| ADP null:', adpNull)
  console.log('  LTV present (non-zero):', ltvPresent, '| LTV null/zero:', ltvNull)
  console.log('  nflDraftProjectionSplits present:', splitsPresent, '| all-zero:', splitsAllZero)

  // Show 3 example entries with their fields
  let shown = 0
  for (const e of entries) {
    if (shown >= 5) break
    const stats = ((e.display as Record<string, unknown>)?.stats ?? {}) as Record<string, unknown>
    const fppg = stats.fantasyPointsPerGame as number | null
    if (typeof fppg === 'number' && Number.isFinite(fppg)) continue
    const pos = String(e.position ?? 'UNKNOWN').toUpperCase()
    if (!['WR', 'RB', 'QB', 'TE'].includes(pos)) continue
    const adp = (e.adp ?? stats.adp) as number | null
    const ltv = stats.lifetimeValue as number | null
    const splits = e.nflDraftProjectionSplits as Record<string, unknown> | null
    const isRookie = e.isRookie === true
    const riSupplemental = stats.rollingInsightsSupplemental as Record<string, unknown> | null
    console.log(`\n${e.name} (${pos}) yrsExp=${e.yearsExp} isRookie=${isRookie}`)
    console.log(`  adp=${adp} lifetimeValue=${ltv}`)
    console.log(`  riSupplemental=${riSupplemental ? JSON.stringify(riSupplemental).slice(0, 100) : 'null'}`)
    console.log(`  splits=${splits ? JSON.stringify(splits).slice(0, 150) : 'null'}`)
    shown++
  }

  // SportsPlayerRecord check: look up by exact player name (not lowercased)
  const sprRows = await prisma.sportsPlayerRecord.findMany({
    where: { sport: 'NFL', name: { in: missingNames.slice(0, 100) } },
    select: { name: true, position: true, projections: true, stats: true, currentAdp: true },
    take: 100,
  })
  const sprWithProj = sprRows.filter((r) => r.projections !== null)
  const sprWithStats = sprRows.filter((r) => r.stats !== null)
  const sprWithAdp = sprRows.filter((r) => r.currentAdp !== null)
  console.log('\n[SportsPlayerRecord check]')
  console.log('  Queried names:', missingNames.slice(0, 100).length)
  console.log('  Matched rows:', sprRows.length)
  console.log('  With projections field:', sprWithProj.length)
  console.log('  With stats field:', sprWithStats.length)
  console.log('  With currentAdp:', sprWithAdp.length)
  if (sprWithProj.length > 0) {
    const s = sprWithProj[0]
    console.log('  Sample projections:', JSON.stringify(s.projections).slice(0, 300))
  }
  if (sprWithStats.length > 0) {
    const s = sprWithStats[0]
    console.log('  Sample stats:', JSON.stringify(s.stats).slice(0, 300))
  }

  // Check AllFantasyAdpSnapshot for kicker/DEF coverage
  const adpKickerDef = await prisma.allFantasyAdpSnapshot.findMany({
    where: { playerKey: { startsWith: 'DEF:' } },
    select: { playerKey: true, adpValue: true, positionRank: true },
    take: 10,
  })
  const adpKicker = await prisma.allFantasyAdpSnapshot.findMany({
    where: { playerKey: { startsWith: 'K:' } },
    select: { playerKey: true, adpValue: true, positionRank: true },
    take: 10,
  })
  console.log('\n[AllFantasyAdpSnapshot DEF entries]:', adpKickerDef.length)
  if (adpKickerDef.length > 0) console.log('  Sample:', JSON.stringify(adpKickerDef[0]))
  console.log('[AllFantasyAdpSnapshot K entries]:', adpKicker.length)
  if (adpKicker.length > 0) console.log('  Sample:', JSON.stringify(adpKicker[0]))

  // Check AllFantasyAdpSnapshot total for skill positions 
  const adpTotal = await prisma.allFantasyAdpSnapshot.count()
  const adpWithWr = await prisma.allFantasyAdpSnapshot.count({ where: { playerKey: { startsWith: 'WR:' } } })
  console.log('\n[AllFantasyAdpSnapshot] total:', adpTotal, ' WR keys:', adpWithWr)

  // RI veteran bucket detail: players in veteran_skill_ri_null_fppg who have riGp > 0 but fppg null
  // These might have total fantasy points which we can divide by gamesPlayed
  const riNullFppg: Array<{ name: string; pos: string; riGp: number; riTotalFp: number | null }> = []
  for (const e of entries) {
    const stats = ((e.display as Record<string, unknown>)?.stats ?? {}) as Record<string, unknown>
    const fppg = stats.fantasyPointsPerGame as number | null
    if (typeof fppg === 'number' && Number.isFinite(fppg)) continue
    const riSupplemental = stats.rollingInsightsSupplemental as Record<string, unknown> | null
    if (!riSupplemental) continue
    const riGp = riSupplemental.gamesPlayed as number | null
    const riFppg = riSupplemental.fantasyPointsPerGame as number | null
    if (riGp !== null && riGp > 0 && riFppg === null) {
      riNullFppg.push({
        name: String(e.name ?? ''),
        pos: String(e.position ?? 'UNKNOWN').toUpperCase(),
        riGp,
        riTotalFp: riSupplemental.fantasyPointsSeason as number | null,
      })
    }
  }
  console.log('\n[veteran_skill_ri_null_fppg] riGp>0 but riFppg=null:', riNullFppg.length)
  for (const r of riNullFppg.slice(0, 5)) {
    console.log(`  ${r.name} (${r.pos}) riGp=${r.riGp} riTotalFp=${r.riTotalFp}`)
  }
}

main()
  .catch((e) => { console.error('[audit] FAILED:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
