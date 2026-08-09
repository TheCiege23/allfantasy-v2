import { NextRequest, NextResponse } from 'next/server'
import { ingestSportStats, type IngestSportStatsInput } from '@/lib/schedule-stats'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.STATS_INGESTION_API_KEY
  if (!expected) return false
  const provided = req.headers.get('x-ingestion-key')
  return typeof provided === 'string' && provided.length > 0 && provided === expected
}

export async function POST(req: NextRequest) {
  if (!process.env.STATS_INGESTION_API_KEY) {
    return NextResponse.json(
      { error: 'Stats ingestion is not configured' },
      { status: 503 }
    )
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<IngestSportStatsInput>
  const rawSport =
    typeof body.sportType === 'string' ? body.sportType.trim().toUpperCase() : ''
  if (!isSupportedSport(rawSport)) {
    return NextResponse.json(
      { error: 'sportType must be one of NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER' },
      { status: 400 }
    )
  }

  const season = Number(body.season)
  const weekOrRound = Number(body.weekOrRound)
  const source = typeof body.source === 'string' ? body.source.trim() : ''
  if (!Number.isFinite(season) || season < 1900) {
    return NextResponse.json({ error: 'season is required' }, { status: 400 })
  }
  if (!Number.isFinite(weekOrRound) || weekOrRound < 1) {
    return NextResponse.json({ error: 'weekOrRound is required' }, { status: 400 })
  }
  if (!source) {
    return NextResponse.json({ error: 'source is required' }, { status: 400 })
  }

  try {
    const result = await ingestSportStats({
      sportType: normalizeToSupportedSport(rawSport),
      season: Math.floor(season),
      weekOrRound: Math.floor(weekOrRound),
      source,
      leagueId: typeof body.leagueId === 'string' ? body.leagueId : undefined,
      formatType: typeof body.formatType === 'string' ? body.formatType : undefined,
      schedules: Array.isArray(body.schedules) ? body.schedules : [],
      playerStats: Array.isArray(body.playerStats) ? body.playerStats : [],
      teamStats: Array.isArray(body.teamStats) ? body.teamStats : [],
    })
    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to ingest schedule/stats',
      },
      { status: 500 }
    )
  }
}
