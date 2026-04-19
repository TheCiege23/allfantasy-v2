import { NextResponse } from 'next/server'
import { fetchGameWeather } from '@/lib/openweathermap'
import { fetchWeatherForTeamHomeWindow } from '@/lib/weather/venueResolver'
import { defaultGameTimeForSport } from '@/lib/weather/defaultGameTimes'
import { normalizeToSupportedSport, SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

const WEATHER_SUPPORTED = new Set(['NFL', 'NCAAF', 'MLB', 'SOCCER'])

/**
 * GET /api/start-sit/weather?sport=nfl&team=BUF
 * Returns live OpenWeather-backed data: current conditions at venue (outdoor) or dome notice.
 * Supports NFL, NCAAF, MLB (venue-based) and SOCCER (geocoded). Indoor sports return null forecast.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const sportRaw = (url.searchParams.get('sport') || 'nfl').toUpperCase()
  const sport = SUPPORTED_SPORTS.includes(sportRaw as (typeof SUPPORTED_SPORTS)[number])
    ? normalizeToSupportedSport(sportRaw)
    : null
  const team = url.searchParams.get('team')?.trim().toUpperCase()

  if (!sport || !team) {
    return NextResponse.json(
      { error: 'Provide sport=NFL|NCAAF|MLB|SOCCER and team=ABC.' },
      { status: 400 },
    )
  }

  if (!WEATHER_SUPPORTED.has(sport)) {
    return NextResponse.json({
      sport,
      team,
      supported: false,
      reason: 'Sport is indoor or not weather-relevant for fantasy decisions.',
    })
  }

  if (!process.env.OPENWEATHERMAP_API_KEY?.trim()) {
    return NextResponse.json({
      sport,
      team,
      supported: true,
      configured: false,
      reason: 'OPENWEATHERMAP_API_KEY not set.',
    })
  }

  const live = sport === 'NFL' ? await fetchGameWeather(team) : null
  const forecast = await fetchWeatherForTeamHomeWindow({
    sport,
    teamAbbrev: team,
    gameTime: defaultGameTimeForSport(sport),
  })

  return NextResponse.json({
    sport,
    team,
    live,
    forecast,
    source: 'openweathermap',
  })
}
