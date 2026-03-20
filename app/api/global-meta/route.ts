/**
 * Global Meta API – weekly reports, sport-specific views, platform rollups, AI summaries.
 * GET ?sport=NFL&season=2025&week=1 | ?report=weekly
 * GET ?sport=NFL&summary=ai&timeframe=7d
 */
import { NextRequest, NextResponse } from 'next/server'
import { GlobalMetaEngine } from '@/lib/global-meta-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') ?? undefined
    const season = searchParams.get('season') ?? undefined
    const week = searchParams.get('week')
    const weekOrPeriod = week != null ? parseInt(week, 10) : undefined
    const report = searchParams.get('report') // weekly
    const summary = searchParams.get('summary') // ai
    const timeframe = searchParams.get('timeframe') ?? undefined
    const metaType = searchParams.get('metaType') ?? undefined

    if (report === 'weekly') {
      const s = sport ?? 'NFL'
      const se = season ?? String(new Date().getFullYear())
      const data = await GlobalMetaEngine.getWeeklyReport(s, se, weekOrPeriod)
      return NextResponse.json(
        { data },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } }
      )
    }

    if (summary === 'ai') {
      const data = await GlobalMetaEngine.getAIMetaSummary(sport, metaType as any, timeframe)
      return NextResponse.json(
        { data },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
      )
    }

    const snapshots = await GlobalMetaEngine.getSnapshots({
      sport,
      season,
      weekOrPeriod,
      metaType: metaType as any,
      limit: 50,
    })
    return NextResponse.json(
      { data: snapshots },
      { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=600' } }
    )
  } catch (e) {
    console.error('Global meta API error:', e)
    return NextResponse.json({ error: 'Failed to fetch global meta' }, { status: 500 })
  }
}
