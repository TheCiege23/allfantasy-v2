/**
 * Strategy Meta API — list reports; optionally trigger report generation (admin).
 * GET ?sport=NFL&leagueFormat=dynasty_sf
 * POST (body: { sport?, leagueFormat? }) to generate reports
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStrategyMetaReports, generateStrategyMetaReports } from '@/lib/strategy-meta'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') ?? undefined
    const leagueFormat = searchParams.get('leagueFormat') ?? undefined
    const data = await getStrategyMetaReports({ sport, leagueFormat })
    return NextResponse.json({ data })
  } catch (e) {
    console.error('Strategy meta GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch strategy meta' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sport = body.sport ?? undefined
    const leagueFormat = body.leagueFormat ?? undefined
    const leagueIds = Array.isArray(body.leagueIds) ? body.leagueIds : undefined
    const result = await generateStrategyMetaReports({
      sport: sport as any,
      leagueFormat: leagueFormat as any,
      leagueIds,
    })
    return NextResponse.json({ reports: result.reports, errors: result.errors })
  } catch (e) {
    console.error('Strategy meta POST error:', e)
    return NextResponse.json({ error: 'Failed to generate strategy meta' }, { status: 500 })
  }
}
