import { NextRequest, NextResponse } from 'next/server'
import { getAFProjection, getAFProjectionBatch } from '@/lib/weather/afProjectionService'

export const dynamic = 'force-dynamic'

type SingleBody = {
  playerId: string
  playerName: string
  sport: string
  position: string
  baselineProjection: number
  lat?: number
  lng?: number
  gameTime?: string
  isIndoor?: boolean
  isDome?: boolean
  roofClosed?: boolean
  week?: number
  season?: number
  eventId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SingleBody | { players: SingleBody[] }

    if (body && Array.isArray((body as { players?: unknown }).players)) {
      const players = (body as { players: SingleBody[] }).players
      const mapped = players.map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        sport: p.sport,
        position: p.position,
        baselineProjection: Number(p.baselineProjection),
        gameLocation:
          p.lat != null && p.lng != null ? { lat: Number(p.lat), lng: Number(p.lng) } : null,
        gameTime: p.gameTime ? new Date(p.gameTime) : null,
        isIndoor: p.isIndoor,
        isDome: p.isDome,
        roofClosed: p.roofClosed,
        week: p.week,
        season: p.season,
        eventId: p.eventId,
      }))
      const results = await getAFProjectionBatch(mapped)
      return NextResponse.json({ projections: results })
    }

    const p = body as SingleBody
    if (!p?.playerId || !p.playerName || p.baselineProjection == null) {
      return NextResponse.json({ error: 'Missing playerId, playerName, or baselineProjection' }, { status: 400 })
    }

    const result = await getAFProjection({
      playerId: p.playerId,
      playerName: p.playerName,
      sport: p.sport ?? 'NFL',
      position: p.position ?? 'UNK',
      baselineProjection: Number(p.baselineProjection),
      gameLocation: p.lat != null && p.lng != null ? { lat: Number(p.lat), lng: Number(p.lng) } : null,
      gameTime: p.gameTime ? new Date(p.gameTime) : null,
      isIndoor: p.isIndoor,
      isDome: p.isDome,
      roofClosed: p.roofClosed,
      week: p.week,
      season: p.season,
      eventId: p.eventId,
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('[api/weather/af-projection]', e)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
