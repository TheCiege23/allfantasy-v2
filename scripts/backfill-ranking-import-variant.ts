/**
 * One-time backfill: restore leagueVariant='legacy_summary' on ranking-import
 * Sleeper leagues whose variant was overwritten to null by a subsequent sync.
 *
 * Identification criteria (must match ALL):
 *   - platform = 'sleeper'
 *   - leagueVariant IS NULL          (marker was overwritten)
 *   - status IS NOT NULL             (sync ran and wrote a real Sleeper status)
 *   - at least one import field set  (importWins / importLosses / importFinalStanding)
 *
 * Real Sleeper leagues created by the active-import flow never have import
 * stats populated, so this safely targets only ranking-import rows.
 *
 * Usage:
 *   npx ts-node -e "require('./scripts/backfill-ranking-import-variant')"
 *   -- or --
 *   npx tsx scripts/backfill-ranking-import-variant.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  // Find affected rows first so we can log them
  const affected = await (prisma as any).league.findMany({
    where: {
      platform: 'sleeper',
      leagueVariant: null,
      status: { not: null },
      OR: [
        { importWins: { not: null } },
        { importLosses: { not: null } },
        { importFinalStanding: { not: null } },
      ],
    },
    select: {
      id: true,
      userId: true,
      name: true,
      season: true,
      status: true,
      importWins: true,
      importLosses: true,
    },
    orderBy: [{ userId: 'asc' }, { season: 'desc' }],
  })

  console.log(`Found ${affected.length} ranking-import league(s) with overwritten leagueVariant.`)
  if (affected.length > 0) {
    console.table(affected)
  }

  if (dryRun) {
    console.log('Dry run — no changes made.')
    return
  }

  if (affected.length === 0) {
    console.log('Nothing to fix.')
    return
  }

  const ids = affected.map((r: { id: string }) => r.id)
  const result = await (prisma as any).league.updateMany({
    where: { id: { in: ids } },
    data: { leagueVariant: 'legacy_summary' },
  })

  console.log(`Updated ${result.count} league(s) → leagueVariant='legacy_summary'.`)
}

main()
  .catch((err) => {
    console.error('[backfill-ranking-import-variant] failed', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
