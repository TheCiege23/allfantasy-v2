/**
 * [NEW] app/api/nba-schedule/volume/route.ts
 * GET: Returns NBA game volume profile for a given season/week.
 * Public data — no league-specific auth required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWeekVolumeProfile, getSeasonVolumeProfiles } from '@/lib/nba-schedule'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const season = parseInt(req.nextUrl.searchParams.get('season') ?? '', 10) || new Date().getFullYear()
  const week = parseInt(req.nextUrl.searchParams.get('week') ?? '', 10)
  const startWeek = parseInt(req.nextUrl.searchParams.get('startWeek') ?? '', 10)
  const endWeek = parseInt(req.nextUrl.searchParams.get('endWeek') ?? '', 10)

  // Range mode: return profiles for multiple weeks
  if (startWeek > 0 && endWeek > 0 && endWeek >= startWeek) {
    const profiles = await getSeasonVolumeProfiles(season, startWeek, Math.min(endWeek, startWeek + 30))
    return NextResponse.json({ season, profiles }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    })
  }

  // Single week mode
  if (!week || week < 1) {
    return NextResponse.json({ error: 'week or startWeek+endWeek required' }, { status: 400 })
  }

  const profile = await getWeekVolumeProfile(season, week)
  return NextResponse.json({ season, week, profile }, {
    headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' },
  })
}
