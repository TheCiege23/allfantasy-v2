/**
 * Meta Insights Dashboard API – full payload for dashboard (optional server-side preload).
 * GET ?sport=NFL&leagueFormat=&timeframe=7d
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadMetaInsightsDashboard } from '@/lib/meta-insights'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') ?? 'NFL'
    const leagueFormat = searchParams.get('leagueFormat') ?? undefined
    const timeframe = searchParams.get('timeframe') ?? undefined
    const data = await loadMetaInsightsDashboard({ sport, leagueFormat, timeframe })
    return NextResponse.json({ data })
  } catch (e) {
    console.error('Meta insights dashboard API error:', e)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
