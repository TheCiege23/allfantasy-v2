/**
 * [NEW] app/api/nhl-schedule/volume/route.ts
 * GET: Returns NHL game volume profile for a given season/week.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getNhlWeekVolumeProfile, getNhlSeasonVolumeProfiles } from '@/lib/nhl-schedule'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const season = parseInt(req.nextUrl.searchParams.get('season') ?? '', 10) || new Date().getFullYear()
  const week = parseInt(req.nextUrl.searchParams.get('week') ?? '', 10)
  const startWeek = parseInt(req.nextUrl.searchParams.get('startWeek') ?? '', 10)
  const endWeek = parseInt(req.nextUrl.searchParams.get('endWeek') ?? '', 10)

  if (startWeek > 0 && endWeek > 0 && endWeek >= startWeek) {
    const profiles = await getNhlSeasonVolumeProfiles(season, startWeek, Math.min(endWeek, startWeek + 30))
    return NextResponse.json({ season, sport: 'NHL', profiles }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    })
  }

  if (!week || week < 1) {
    return NextResponse.json({ error: 'week or startWeek+endWeek required' }, { status: 400 })
  }

  const profile = await getNhlWeekVolumeProfile(season, week)
  return NextResponse.json({ season, week, sport: 'NHL', profile }, {
    headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' },
  })
}
