/**
 * [NEW] GET: NCAAB game volume profile for a given season/week.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getNcaabWeekVolumeProfile, getNcaabSeasonVolumeProfiles } from '@/lib/ncaab-schedule'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const season = parseInt(req.nextUrl.searchParams.get('season') ?? '', 10) || new Date().getFullYear()
  const week = parseInt(req.nextUrl.searchParams.get('week') ?? '', 10)
  const startWeek = parseInt(req.nextUrl.searchParams.get('startWeek') ?? '', 10)
  const endWeek = parseInt(req.nextUrl.searchParams.get('endWeek') ?? '', 10)
  if (startWeek > 0 && endWeek > 0 && endWeek >= startWeek) {
    return NextResponse.json({ season, sport: 'NCAAB', profiles: await getNcaabSeasonVolumeProfiles(season, startWeek, Math.min(endWeek, startWeek + 25)) }, { headers: { 'Cache-Control': 'public, max-age=300' } })
  }
  if (!week || week < 1) return NextResponse.json({ error: 'week or startWeek+endWeek required' }, { status: 400 })
  return NextResponse.json({ season, week, sport: 'NCAAB', profile: await getNcaabWeekVolumeProfile(season, week) }, { headers: { 'Cache-Control': 'public, max-age=120' } })
}
