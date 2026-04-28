import { NextResponse } from 'next/server'
import { fetchWeatherForTeamHomeWindow } from '@/lib/weather/venueResolver'
import { defaultGameTimeForSport } from '@/lib/weather/defaultGameTimes'
import { getCachedGameWeather } from '@/lib/weather/weatherService'
import { normalizeToSupportedSport, SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

const WEATHER_SUPPORTED = new Set(['NFL', 'NCAAF', 'MLB', 'SOCCER'])

/**
 * GET /api/start-sit/weather?sport=nfl&team=BUF
 * Returns WeatherCache-first data: current venue conditions or dome notice plus forecast window.
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

  const live = sport === 'NFL' ? await getCachedGameWeather({ sport, homeTeam: team }) : null
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
    meta: {
      live: live?.meta ?? null,
      forecast: forecast?.meta ?? null,
    },
    source:
      live?.meta?.cacheHit || forecast?.meta?.cacheHit
        ? 'weather-cache'
        : 'openweathermap',
  })
}
