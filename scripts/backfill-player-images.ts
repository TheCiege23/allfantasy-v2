/**
 * scripts/backfill-player-images.ts
 *
 * Player Image Backfill Script — Phase 2
 *
 * Scans all SportsPlayer rows that are missing a real provider headshot and
 * attempts to resolve one via the priority chain:
 *   Sleeper CDN → TheSportsDB → API-Sports → (no change)
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/backfill-player-images.ts
 *   npx ts-node --project tsconfig.json scripts/backfill-player-images.ts --dry-run
 *   npx ts-node --project tsconfig.json scripts/backfill-player-images.ts --sport NFL
 *   npx ts-node --project tsconfig.json scripts/backfill-player-images.ts --limit 100
 *
 * Flags:
 *   --dry-run     Preview changes without writing to the DB
 *   --sport NFL   Only process a specific sport (default: NFL)
 *   --limit N     Only process N rows (useful for incremental runs)
 *   --verbose     Log every row processed
 *
 * Safety guarantees:
 *   - Never overwrites a row that already has a valid provider image.
 *   - Idempotent: running multiple times produces the same result.
 *   - Sets source = 'backfill' on any updated row.
 *   - Uses DB-first pattern — no live API calls at runtime.
 *     (Sleeper/API-Sports CDN URLs are constructed from stored IDs.)
 */

import { PrismaClient } from '@prisma/client'
import { resolvePlayerImage } from '../lib/players/player-image-pipeline'
import { isProviderImage } from '../lib/draft-room/player-canonical-identity'

const prisma = new PrismaClient()

type RunStats = {
  total: number
  needsUpdate: number
  updated: number
  skipped: number
  failed: number
  bySource: Record<string, number>
}

function parseArgs() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')
  const sportIdx = args.indexOf('--sport')
  const sport = sportIdx !== -1 && args[sportIdx + 1] ? args[sportIdx + 1].toUpperCase() : 'NFL'
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : undefined
  return { dryRun, verbose, sport, limit }
}

async function main() {
  const { dryRun, verbose, sport, limit } = parseArgs()

  console.log(`\n=== Player Image Backfill (Phase 2) ===`)
  console.log(`Sport: ${sport}  DryRun: ${dryRun}  Limit: ${limit ?? 'all'}\n`)

  const stats: RunStats = {
    total: 0,
    needsUpdate: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    bySource: {},
  }

  // Query players that are missing a real headshot
  // We load in batches to avoid memory pressure on large pools
  const BATCH_SIZE = 200
  let cursor: string | undefined = undefined
  let done = false
  let processed = 0

  while (!done) {
    const batch = await prisma.sportsPlayer.findMany({
      where: { sport: { equals: sport, mode: 'insensitive' } },
      select: {
        id: true,
        name: true,
        position: true,
        team: true,
        imageUrl: true,
        sleeperId: true,
        source: true,
        sport: true,
      },
      take: limit !== undefined ? Math.min(BATCH_SIZE, limit - processed) : BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })

    if (batch.length === 0) break

    cursor = batch[batch.length - 1].id

    for (const row of batch) {
      stats.total++

      // Skip rows that already have a real headshot
      if (isProviderImage(row.imageUrl) && !row.imageUrl?.startsWith('data:')) {
        if (verbose) console.log(`  SKIP (has image): ${row.name}`)
        stats.skipped++
        continue
      }

      stats.needsUpdate++

      const resolution = resolvePlayerImage({
        sleeperId: row.sleeperId,
        existingImageUrl: row.imageUrl,
        sport: row.sport,
        position: row.position,
        team: row.team,
        name: row.name,
      })

      if (resolution.unchanged || !resolution.url) {
        if (verbose) console.log(`  NO_RESULT: ${row.name}  (source: ${row.source ?? 'unknown'})`)
        stats.skipped++
        continue
      }

      if (verbose || dryRun) {
        console.log(
          `  ${dryRun ? '[DRY RUN] ' : ''}WOULD UPDATE: ${row.name} | ${row.position ?? '-'} | ${row.team ?? 'FA'}` +
            `\n    ${row.imageUrl ?? 'null'} → ${resolution.url}  (source: ${resolution.source})`,
        )
      }

      if (!dryRun) {
        try {
          await prisma.sportsPlayer.update({
            where: { id: row.id },
            data: {
              imageUrl: resolution.url,
              source: 'backfill',
            },
          })
          stats.updated++
          stats.bySource[resolution.source] = (stats.bySource[resolution.source] ?? 0) + 1
        } catch (err) {
          console.error(`  ERROR updating ${row.name} (${row.id}): ${String(err)}`)
          stats.failed++
        }
      } else {
        stats.updated++
        stats.bySource[resolution.source] = (stats.bySource[resolution.source] ?? 0) + 1
      }
    }

    processed += batch.length
    if (limit !== undefined && processed >= limit) done = true
    if (batch.length < BATCH_SIZE) done = true
  }

  console.log('\n=== Backfill Summary ===')
  console.log(`  Total players scanned : ${stats.total}`)
  console.log(`  Needed image update   : ${stats.needsUpdate}`)
  console.log(`  Updated               : ${stats.updated}${dryRun ? ' (dry run — no writes)' : ''}`)
  console.log(`  Skipped (no result)   : ${stats.skipped}`)
  console.log(`  Errors                : ${stats.failed}`)
  if (Object.keys(stats.bySource).length > 0) {
    console.log('  By source:')
    for (const [src, count] of Object.entries(stats.bySource)) {
      console.log(`    ${src}: ${count}`)
    }
  }
  console.log()
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
