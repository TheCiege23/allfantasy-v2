/**
 * GET /api/warehouse/league-history — warehouse-backed league history summary.
 * Used by league page "Previous Leagues" / archived season and analytics dashboards.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLeagueHistorySummary } from '@/lib/data-warehouse'

export async function GET(request: NextRequest) {
  try {
    const leagueId = request.nextUrl.searchParams.get('leagueId')
    const seasonParam = request.nextUrl.searchParams.get('season')
    const fromWeek = request.nextUrl.searchParams.get('fromWeek')
    const toWeek = request.nextUrl.searchParams.get('toWeek')
    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
    }
    const season = seasonParam != null ? parseInt(seasonParam, 10) : undefined
    const summary = await getLeagueHistorySummary(leagueId, {
      season: Number.isNaN(season) ? undefined : season,
      fromWeek: fromWeek != null ? parseInt(fromWeek, 10) : undefined,
      toWeek: toWeek != null ? parseInt(toWeek, 10) : undefined,
    })
    return NextResponse.json(summary)
  } catch (e) {
    console.error('[warehouse/league-history]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load league history' },
      { status: 500 }
    )
  }
}
