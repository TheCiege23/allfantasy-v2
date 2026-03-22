/**
 * Global Meta API – weekly reports, sport-specific views, platform rollups, AI summaries.
 * GET ?sport=NFL&season=2025&week=1 | ?report=weekly
 * GET ?sport=NFL&summary=ai&timeframe=7d
 */
import { NextRequest, NextResponse } from 'next/server'
import { GlobalMetaEngine } from '@/lib/global-meta-engine'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeTimeframe } from '@/lib/global-meta-engine/timeframe'
import type { MetaType } from '@/lib/global-meta-engine'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sportParam = searchParams.get('sport')
    const sport = sportParam ? normalizeToSupportedSport(sportParam) : undefined
    const season = searchParams.get('season') ?? undefined
    const week = searchParams.get('week') ?? searchParams.get('weekOrPeriod')
    const parsedWeek = week != null ? Number.parseInt(week, 10) : NaN
    const weekOrPeriod = Number.isFinite(parsedWeek) ? parsedWeek : undefined
    const report = searchParams.get('report') // weekly
    const summary = searchParams.get('summary') // ai
    const timeframe = normalizeTimeframe(searchParams.get('timeframe'))
    const metaType = (searchParams.get('metaType') ?? undefined) as MetaType | undefined

    if (report === 'weekly') {
      const s = sport ?? DEFAULT_SPORT
      const se = season ?? String(new Date().getFullYear())
      const data = await GlobalMetaEngine.getWeeklyReport(s, se, weekOrPeriod, timeframe ?? '7d')
      return NextResponse.json(
        { data },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } }
      )
    }

    if (summary === 'ai') {
      const data = await GlobalMetaEngine.getAIMetaSummary(sport, metaType, timeframe)
      return NextResponse.json(
        { data },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
      )
    }

    const snapshots = await GlobalMetaEngine.getSnapshots({
      sport,
      season,
      weekOrPeriod,
      metaType,
      timeframe,
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
