/**
 * Meta Insights Dashboard API – full payload for dashboard (optional server-side preload).
 * GET ?sport=NFL&leagueFormat=&timeframe=7d
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadMetaInsightsDashboard } from '@/lib/meta-insights'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeTimeframe } from '@/lib/global-meta-engine/timeframe'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = normalizeToSupportedSport(searchParams.get('sport') ?? DEFAULT_SPORT)
    const leagueFormat = searchParams.get('leagueFormat') ?? undefined
    const timeframe = normalizeTimeframe(searchParams.get('timeframe'))
    const data = await loadMetaInsightsDashboard({ sport, leagueFormat, timeframe })
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
    )
  } catch (e) {
    console.error('Meta insights dashboard API error:', e)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
