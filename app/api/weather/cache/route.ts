import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { getWeatherForEvent } from '@/lib/weather/weatherService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!requireCronAuth(request, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as {
      action?: string
      eventId?: string
      lat?: number
      lng?: number
      gameTime?: string
      sport?: string
    }

    if (body.action !== 'refresh' || body.lat == null || body.lng == null || !body.gameTime) {
      return NextResponse.json(
        { error: 'Expected { action: "refresh", lat, lng, gameTime, eventId?, sport? }' },
        { status: 400 }
      )
    }

    const weather = await getWeatherForEvent({
      lat: Number(body.lat),
      lng: Number(body.lng),
      gameTime: new Date(body.gameTime),
      sport: body.sport,
      eventId: body.eventId,
      forceRefresh: true,
    })

    return NextResponse.json({ ok: true, weather })
  } catch (e) {
    console.error('[api/weather/cache]', e)
    return NextResponse.json({ error: 'Refresh failed' }, { status: 500 })
  }
}
