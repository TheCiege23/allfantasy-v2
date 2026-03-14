/**
 * Season + Playoff Probability — GET (fetch) and POST (generate) forecast for a league/season/week.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSeasonForecast, runSeasonForecast } from '@/lib/season-forecast/SeasonForecastEngine'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params
  const { searchParams } = new URL(req.url)
  const season = parseInt(searchParams.get('season') ?? '', 10)
  const week = parseInt(searchParams.get('week') ?? '', 10)

  if (!leagueId || !Number.isFinite(season) || !Number.isFinite(week)) {
    return NextResponse.json(
      { error: 'Missing or invalid leagueId, season, or week' },
      { status: 400 }
    )
  }

  try {
    const teamForecasts = await getSeasonForecast(leagueId, season, week)
    if (!teamForecasts) {
      return NextResponse.json({ teamForecasts: null, generated: false })
    }
    return NextResponse.json({ teamForecasts, generated: true })
  } catch (e) {
    console.error('[SeasonForecast GET]', e)
    return NextResponse.json({ error: 'Failed to load forecast' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params
  let body: { season?: number; week?: number; totalWeeks?: number; playoffSpots?: number; byeSpots?: number; simulations?: number } = {}
  try {
    body = await req.json().catch(() => ({}))
  } catch {}

  const season = body.season ?? new Date().getFullYear()
  const week = body.week ?? 1
  if (!leagueId || !Number.isFinite(season) || !Number.isFinite(week)) {
    return NextResponse.json(
      { error: 'Missing or invalid leagueId, season, or week' },
      { status: 400 }
    )
  }

  try {
    const result = await runSeasonForecast({
      leagueId,
      season,
      week,
      totalWeeks: body.totalWeeks,
      playoffSpots: body.playoffSpots,
      byeSpots: body.byeSpots,
      simulations: body.simulations,
    })
    if (!result) {
      return NextResponse.json(
        { error: 'No rankings/snapshots found for this league and week; run rankings first.' },
        { status: 404 }
      )
    }
    return NextResponse.json({
      snapshotId: result.snapshotId,
      teamForecasts: result.teamForecasts,
    })
  } catch (e) {
    console.error('[SeasonForecast POST]', e)
    return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 })
  }
}
