import { NextRequest, NextResponse } from 'next/server'
import { getWeatherForEvent } from '@/lib/weather/weatherService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const gameTime = sp.get('gameTime')
  const sport = sp.get('sport') ?? undefined
  const eventId = sp.get('eventId') ?? undefined
  const isIndoor = sp.get('isIndoor') === '1' || sp.get('isIndoor') === 'true'
  const isDome = sp.get('isDome') === '1' || sp.get('isDome') === 'true'
  const roofClosed = sp.get('roofClosed') === '1' || sp.get('roofClosed') === 'true'

  if (!lat || !lng || !gameTime) {
    return NextResponse.json(
      { error: 'Required: lat, lng, gameTime (ISO 8601)' },
      { status: 400 }
    )
  }

  const weather = await getWeatherForEvent({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    gameTime: new Date(gameTime),
    sport,
    eventId,
    isIndoor,
    isDome,
    roofClosed,
  })

  return NextResponse.json({ weather })
}
