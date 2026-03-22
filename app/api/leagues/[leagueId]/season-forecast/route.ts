/**
 * Season + Playoff Probability — GET (fetch) and POST (generate) forecast for a league/season/week.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSeasonForecast, runSeasonForecast } from '@/lib/season-forecast/SeasonForecastEngine'
import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

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
    const snapshot = await prisma.seasonForecastSnapshot.findUnique({
      where: {
        uniq_season_forecast_league_season_week: { leagueId, season, week },
      },
      select: { generatedAt: true },
    })
    return NextResponse.json({
      teamForecasts,
      generated: true,
      generatedAt: snapshot?.generatedAt?.toISOString?.() ?? null,
    })
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
    const league = await prisma.league.findFirst({
      where: { OR: [{ id: leagueId }, { platformLeagueId: leagueId }] },
      select: { sport: true },
    })
    const sport = normalizeToSupportedSport(league?.sport ?? 'NFL')

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

    await prisma.seasonSimulationResult.deleteMany({
      where: { leagueId, season, weekOrPeriod: week },
    })
    await prisma.seasonSimulationResult.createMany({
      data: result.teamForecasts.map((t) => ({
        sport,
        leagueId,
        teamId: t.teamId,
        season,
        weekOrPeriod: week,
        playoffProbability: t.playoffProbability,
        championshipProbability: t.championshipProbability,
        expectedWins: t.expectedWins,
        expectedRank: t.expectedFinalSeed,
        simulationsRun: body.simulations ?? 2000,
      })),
    })

    const snapshot = await prisma.seasonForecastSnapshot.findUnique({
      where: { id: result.snapshotId },
      select: { generatedAt: true },
    })
    return NextResponse.json({
      snapshotId: result.snapshotId,
      teamForecasts: result.teamForecasts,
      generatedAt: snapshot?.generatedAt?.toISOString?.() ?? new Date().toISOString(),
    })
  } catch (e) {
    console.error('[SeasonForecast POST]', e)
    return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 })
  }
}
