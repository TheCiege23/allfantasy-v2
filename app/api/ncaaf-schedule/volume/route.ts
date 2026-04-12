/**
 * [NEW] GET: NCAAF game volume profile for a given season/week.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getNcaafWeekVolumeProfile, getNcaafSeasonVolumeProfiles } from '@/lib/ncaaf-schedule'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const season = parseInt(req.nextUrl.searchParams.get('season') ?? '', 10) || new Date().getFullYear()
  const week = parseInt(req.nextUrl.searchParams.get('week') ?? '', 10)
  const startWeek = parseInt(req.nextUrl.searchParams.get('startWeek') ?? '', 10)
  const endWeek = parseInt(req.nextUrl.searchParams.get('endWeek') ?? '', 10)

  if (startWeek >= 0 && endWeek > 0 && endWeek >= startWeek) {
    const profiles = await getNcaafSeasonVolumeProfiles(season, startWeek, Math.min(endWeek, startWeek + 20))
    return NextResponse.json({ season, sport: 'NCAAF', profiles }, { headers: { 'Cache-Control': 'public, max-age=300' } })
  }
  if (week < 0) return NextResponse.json({ error: 'week or startWeek+endWeek required' }, { status: 400 })
  const profile = await getNcaafWeekVolumeProfile(season, week)
  return NextResponse.json({ season, week, sport: 'NCAAF', profile }, { headers: { 'Cache-Control': 'public, max-age=120' } })
}
