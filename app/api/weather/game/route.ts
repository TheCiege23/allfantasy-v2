import { NextResponse } from 'next/server';
import { CITY_WEATHER_TTL_MS, getCachedWeatherByCity } from '@/lib/weather/weatherService';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams?.get('city');
  const gameDate = searchParams?.get('date');

  if (!city || !gameDate) return NextResponse.json({ error: 'city & date required' }, { status: 400 });

  const { weather, meta } = await getCachedWeatherByCity({
    city,
    referenceDate: new Date(gameDate),
    ttlMs: CITY_WEATHER_TTL_MS,
  });
  if (!weather) {
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 502 });
  }

  const gameWeather = {
    temp: weather.temp,
    windSpeed: weather.windSpeed,
    rain: weather.rain1h || 0,
    description: weather.description,
    feelsLike: weather.feelsLike,
    humidity: weather.humidity,
    windGust: weather.windGust,
    condition: weather.condition,
    fantasyImpact: weather.fantasyImpact,
    fantasyImpactLevel: weather.fantasyImpactLevel,
  };

  return NextResponse.json({ ...gameWeather, meta });
}

