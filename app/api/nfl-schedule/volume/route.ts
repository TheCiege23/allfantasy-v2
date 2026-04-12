/**
 * [NEW] app/api/nfl-schedule/volume/route.ts
 * GET: Returns NFL game volume profile for a given season/week.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getNflWeekVolumeProfile, getNflSeasonVolumeProfiles } from '@/lib/nfl-schedule'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const season = parseInt(req.nextUrl.searchParams.get('season') ?? '', 10) || new Date().getFullYear()
  const week = parseInt(req.nextUrl.searchParams.get('week') ?? '', 10)
  const startWeek = parseInt(req.nextUrl.searchParams.get('startWeek') ?? '', 10)
  const endWeek = parseInt(req.nextUrl.searchParams.get('endWeek') ?? '', 10)

  if (startWeek > 0 && endWeek > 0 && endWeek >= startWeek) {
    const profiles = await getNflSeasonVolumeProfiles(season, startWeek, Math.min(endWeek, startWeek + 20))
    return NextResponse.json({ season, sport: 'NFL', profiles }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    })
  }
  if (!week || week < 1) return NextResponse.json({ error: 'week or startWeek+endWeek required' }, { status: 400 })
  const profile = await getNflWeekVolumeProfile(season, week)
  return NextResponse.json({ season, week, sport: 'NFL', profile }, {
    headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' },
  })
}
