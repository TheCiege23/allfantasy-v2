/**
 * GET /api/health/player-valuations
 *
 * Reports DB cache health for the cross-sport player valuation store.
 * Returns per-sport freshness, player counts, and last sync time.
 */

import { NextResponse } from 'next/server'
import { getValuationCacheHealth } from '@/lib/player-valuation-features'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const health = await getValuationCacheHealth()

    return NextResponse.json({
      ok: health.freshKeys > 0,
      source: 'db-cache',
      cache: {
        totalKeys: health.totalKeys,
        freshKeys: health.freshKeys,
      },
      perSport: health.perSport,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[health/player-valuations] failed:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to read player valuation cache health' },
      { status: 500 }
    )
  }
}
