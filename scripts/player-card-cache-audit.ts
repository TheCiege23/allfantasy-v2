#!/usr/bin/env tsx
/**
 * scripts/player-card-cache-audit.ts
 *
 * Audit the PlayerGameLogCache and AiResult (player-card-analytics) tables.
 * Reports: total rows, stale rows, missing playerIds, newest/oldest cache age.
 *
 * Usage: npm run player-card:cache:audit
 */

import { prisma } from '../lib/prisma'

async function main() {
  console.log('\n=== Player Card Cache Audit ===\n')

  // ── PlayerGameLogCache ────────────────────────────────────────────────────
  console.log('--- PlayerGameLogCache ---')

  const now = new Date()

  const totalLogs = await prisma.playerGameLogCache.count()
  console.log(`Total cached log rows:   ${totalLogs}`)

  if (totalLogs > 0) {
    const staleLogs = await prisma.playerGameLogCache.count({
      where: { expiresAt: { lt: now } },
    })
    console.log(`Stale rows (expired):    ${staleLogs}`)

    const missingPlayerId = await prisma.playerGameLogCache.count({
      where: { playerId: '' },
    })
    console.log(`Rows with empty playerId: ${missingPlayerId}`)

    const newestRow = await prisma.playerGameLogCache.findFirst({
      orderBy: { syncedAt: 'desc' },
      select: { playerId: true, sport: true, season: true, syncedAt: true, expiresAt: true },
    })
    const oldestRow = await prisma.playerGameLogCache.findFirst({
      orderBy: { syncedAt: 'asc' },
      select: { playerId: true, sport: true, season: true, syncedAt: true, expiresAt: true },
    })

    if (newestRow) {
      const ageMinutes = Math.round((now.getTime() - newestRow.syncedAt.getTime()) / 60000)
      console.log(`Newest entry:           ${newestRow.playerId} (${newestRow.sport}/${newestRow.season}) synced ${ageMinutes}m ago`)
    }
    if (oldestRow) {
      const ageHours = ((now.getTime() - oldestRow.syncedAt.getTime()) / 3600000).toFixed(1)
      console.log(`Oldest entry:           ${oldestRow.playerId} (${oldestRow.sport}/${oldestRow.season}) synced ${ageHours}h ago`)
    }

    // Distribution by season
    const bySeasonRaw = await prisma.$queryRaw<Array<{ season: string; count: bigint }>>`
      SELECT season, COUNT(*) as count FROM player_game_log_cache GROUP BY season ORDER BY season DESC
    `
    if (bySeasonRaw.length > 0) {
      console.log('\nBy season:')
      for (const row of bySeasonRaw) {
        console.log(`  ${row.season}: ${row.count} rows`)
      }
    }
  }

  // ── AiResult (player-card-analytics feature) ─────────────────────────────
  console.log('\n--- AiResult (feature=player-card-analytics) ---')

  const totalAi = await prisma.aiResult.count({
    where: { feature: 'player-card-analytics' },
  })
  console.log(`Total cached AI results: ${totalAi}`)

  if (totalAi > 0) {
    const staleAi = await prisma.aiResult.count({
      where: { feature: 'player-card-analytics', expiresAt: { lt: now } },
    })
    console.log(`Stale AI results:        ${staleAi}`)

    const newestAi = await prisma.aiResult.findFirst({
      where: { feature: 'player-card-analytics' },
      orderBy: { syncedAt: 'desc' },
      select: { scopeId: true, syncedAt: true, expiresAt: true },
    })
    const oldestAi = await prisma.aiResult.findFirst({
      where: { feature: 'player-card-analytics' },
      orderBy: { syncedAt: 'asc' },
      select: { scopeId: true, syncedAt: true, expiresAt: true },
    })

    if (newestAi) {
      const ageMinutes = Math.round((now.getTime() - newestAi.syncedAt.getTime()) / 60000)
      console.log(`Newest AI entry:        scopeId=${newestAi.scopeId} synced ${ageMinutes}m ago`)
    }
    if (oldestAi) {
      const ageHours = ((now.getTime() - oldestAi.syncedAt.getTime()) / 3600000).toFixed(1)
      console.log(`Oldest AI entry:        scopeId=${oldestAi.scopeId} synced ${ageHours}h ago`)
    }
  }

  console.log('\n=== End of Audit ===\n')
}

main()
  .catch((e) => {
    console.error('Audit failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
