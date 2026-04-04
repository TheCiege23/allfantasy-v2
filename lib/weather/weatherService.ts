import { prisma } from '@/lib/prisma'
import {
  fetchForecastWeatherAtTime,
  type ForecastWeatherAtTime,
  NFL_VENUE_COORDS,
} from '@/lib/openweathermap'

type WeatherCacheDelegate = {
  upsert: (args: unknown) => Promise<unknown>
  findUnique: (args: unknown) => Promise<{
    temperatureF: number | null
    feelsLikeF: number | null
    windSpeedMph: number | null
    windGustsMph: number | null
    windDirectionDeg: number | null
    precipChancePct: number | null
    rainInches: number | null
    snowInches: number | null
    humidityPct: number | null
    visibilityMiles: number | null
    conditionCode: string | null
    conditionLabel: string | null
    cloudCoverPct: number | null
    isIndoor: boolean
    isDome: boolean
    roofClosed: boolean
    fetchedAt: Date
    expiresAt: Date
    dataSource: string
  } | null>
}

/** `$extends` + optional schema drift: delegate accessed narrowly for weather cache. */
function weatherCacheDb(): WeatherCacheDelegate {
  return (prisma as unknown as { weatherCache: WeatherCacheDelegate }).weatherCache
}

const MS = 1000
const MIN = 60 * MS
const HOUR = 60 * MIN

export type NormalizedWeather = {
  temperatureF: number
  feelsLikeF: number
  windSpeedMph: number
  windGustsMph: number
  windDirectionDeg: number
  precipChancePct: number
  rainInches: number
  snowInches: number
  humidityPct: number
  visibilityMiles: number
  conditionCode: string
  conditionLabel: string
  cloudCoverPct: number
  isIndoor: boolean
  isDome: boolean
  roofClosed: boolean
  fetchedAt: Date
  expiresAt: Date
  dataSource: string
  cacheHit: boolean
}

export type WeatherLookupParams = {
  lat: number
  lng: number
  gameTime: Date
  sport?: string
  eventId?: string
  isIndoor?: boolean
  isDome?: boolean
  roofClosed?: boolean
  /** Skip DB read and force API fetch */
  forceRefresh?: boolean
}

function metersToMiles(m: number): number {
  return m / 1609.344
}

function computeExpiresAt(gameTime: Date, fetchedAt: Date): Date {
  const hoursUntil = (gameTime.getTime() - fetchedAt.getTime()) / HOUR
  if (hoursUntil < 0) {
    return new Date(fetchedAt.getTime() + 10 * 365 * 24 * HOUR)
  }
  if (hoursUntil > 7 * 24) {
    return new Date(fetchedAt.getTime() + 6 * HOUR)
  }
  if (hoursUntil >= 48) {
    return new Date(fetchedAt.getTime() + 3 * HOUR)
  }
  if (hoursUntil >= 6) {
    return new Date(fetchedAt.getTime() + 30 * MIN)
  }
  return new Date(fetchedAt.getTime() + 10 * MIN)
}

function buildCacheKey(lat: number, lng: number, gameTime: Date): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${gameTime.toISOString().slice(0, 13)}`
}

function forecastToNormalized(
  f: ForecastWeatherAtTime,
  fetchedAt: Date,
  expiresAt: Date,
  ctx: {
    isIndoor: boolean
    isDome: boolean
    roofClosed: boolean
    cacheHit: boolean
  }
): NormalizedWeather {
  return {
    temperatureF: f.temp,
    feelsLikeF: f.feelsLike,
    windSpeedMph: f.windSpeed,
    windGustsMph: f.windGust ?? 0,
    windDirectionDeg: f.windDeg,
    precipChancePct: f.pop * 100,
    rainInches: f.rainInches3h,
    snowInches: f.snowInches3h,
    humidityPct: f.humidity,
    visibilityMiles: metersToMiles(f.visibilityMeters),
    conditionCode: f.conditionCode,
    conditionLabel: f.description || f.conditionMain,
    cloudCoverPct: f.clouds,
    isIndoor: ctx.isIndoor,
    isDome: ctx.isDome,
    roofClosed: ctx.roofClosed,
    fetchedAt,
    expiresAt,
    dataSource: 'openweathermap',
    cacheHit: ctx.cacheHit,
  }
}

function indoorNormalized(params: WeatherLookupParams, fetchedAt: Date): NormalizedWeather {
  const far = new Date(fetchedAt.getTime() + 10 * 365 * 24 * HOUR)
  return {
    temperatureF: 72,
    feelsLikeF: 72,
    windSpeedMph: 0,
    windGustsMph: 0,
    windDirectionDeg: 0,
    precipChancePct: 0,
    rainInches: 0,
    snowInches: 0,
    humidityPct: 50,
    visibilityMiles: 10,
    conditionCode: 'indoor',
    conditionLabel: 'Indoor / climate controlled',
    cloudCoverPct: 0,
    isIndoor: true,
    isDome: Boolean(params.isDome),
    roofClosed: Boolean(params.roofClosed),
    fetchedAt,
    expiresAt: far,
    dataSource: 'none',
    cacheHit: false,
  }
}

async function persistWeatherCache(args: {
  cacheKey: string
  lat: number
  lng: number
  forecastForTime: Date
  expiresAt: Date
  normalized: NormalizedWeather
  sport?: string
  eventId?: string
  raw?: unknown
}): Promise<void> {
  const n = args.normalized
  await weatherCacheDb().upsert({
    where: { cacheKey: args.cacheKey },
    create: {
      cacheKey: args.cacheKey,
      latitude: args.lat,
      longitude: args.lng,
      forecastForTime: args.forecastForTime,
      fetchedAt: n.fetchedAt,
      expiresAt: args.expiresAt,
      temperatureF: n.temperatureF,
      feelsLikeF: n.feelsLikeF,
      windSpeedMph: n.windSpeedMph,
      windGustsMph: n.windGustsMph,
      windDirectionDeg: n.windDirectionDeg,
      precipChancePct: n.precipChancePct,
      rainInches: n.rainInches,
      snowInches: n.snowInches,
      humidityPct: n.humidityPct,
      visibilityMiles: n.visibilityMiles,
      conditionCode: n.conditionCode,
      conditionLabel: n.conditionLabel,
      cloudCoverPct: n.cloudCoverPct,
      isIndoor: n.isIndoor,
      isDome: n.isDome,
      roofClosed: n.roofClosed,
      sport: args.sport ?? null,
      eventId: args.eventId ?? null,
      dataSource: n.dataSource,
      apiResponseRaw: args.raw ? (args.raw as object) : undefined,
    },
    update: {
      forecastForTime: args.forecastForTime,
      fetchedAt: n.fetchedAt,
      expiresAt: args.expiresAt,
      temperatureF: n.temperatureF,
      feelsLikeF: n.feelsLikeF,
      windSpeedMph: n.windSpeedMph,
      windGustsMph: n.windGustsMph,
      windDirectionDeg: n.windDirectionDeg,
      precipChancePct: n.precipChancePct,
      rainInches: n.rainInches,
      snowInches: n.snowInches,
      humidityPct: n.humidityPct,
      visibilityMiles: n.visibilityMiles,
      conditionCode: n.conditionCode,
      conditionLabel: n.conditionLabel,
      cloudCoverPct: n.cloudCoverPct,
      isIndoor: n.isIndoor,
      isDome: n.isDome,
      roofClosed: n.roofClosed,
      sport: args.sport ?? null,
      eventId: args.eventId ?? null,
      dataSource: n.dataSource,
      apiResponseRaw: args.raw ? (args.raw as object) : undefined,
    },
  })
}

function rowToNormalized(row: {
  temperatureF: number | null
  feelsLikeF: number | null
  windSpeedMph: number | null
  windGustsMph: number | null
  windDirectionDeg: number | null
  precipChancePct: number | null
  rainInches: number | null
  snowInches: number | null
  humidityPct: number | null
  visibilityMiles: number | null
  conditionCode: string | null
  conditionLabel: string | null
  cloudCoverPct: number | null
  isIndoor: boolean
  isDome: boolean
  roofClosed: boolean
  fetchedAt: Date
  expiresAt: Date
  dataSource: string
}): NormalizedWeather {
  return {
    temperatureF: row.temperatureF ?? 0,
    feelsLikeF: row.feelsLikeF ?? 0,
    windSpeedMph: row.windSpeedMph ?? 0,
    windGustsMph: row.windGustsMph ?? 0,
    windDirectionDeg: row.windDirectionDeg ?? 0,
    precipChancePct: row.precipChancePct ?? 0,
    rainInches: row.rainInches ?? 0,
    snowInches: row.snowInches ?? 0,
    humidityPct: row.humidityPct ?? 0,
    visibilityMiles: row.visibilityMiles ?? 0,
    conditionCode: row.conditionCode ?? '',
    conditionLabel: row.conditionLabel ?? '',
    cloudCoverPct: row.cloudCoverPct ?? 0,
    isIndoor: row.isIndoor,
    isDome: row.isDome,
    roofClosed: row.roofClosed,
    fetchedAt: row.fetchedAt,
    expiresAt: row.expiresAt,
    dataSource: row.dataSource,
    cacheHit: true,
  }
}

export async function getWeatherForEvent(params: WeatherLookupParams): Promise<NormalizedWeather | null> {
  const { lat, lng, gameTime } = params
  if (params.isIndoor || params.isDome || params.roofClosed) {
    return indoorNormalized(params, new Date())
  }

  const cacheKey = buildCacheKey(lat, lng, gameTime)
  const now = new Date()

  if (!params.forceRefresh) {
    try {
      const cached = await weatherCacheDb().findUnique({ where: { cacheKey } })
      if (cached && cached.expiresAt > now) {
        return rowToNormalized(cached)
      }
    } catch (e) {
      console.error('[WeatherService] cache read failed:', e)
    }
  }

  try {
    const fetchedAt = new Date()
    const forecast = await fetchForecastWeatherAtTime(lat, lng, gameTime)
    if (!forecast) return null

    const expiresAt = computeExpiresAt(gameTime, fetchedAt)
    const normalized = forecastToNormalized(forecast, fetchedAt, expiresAt, {
      isIndoor: false,
      isDome: false,
      roofClosed: false,
      cacheHit: false,
    })

    try {
      await persistWeatherCache({
        cacheKey,
        lat,
        lng,
        forecastForTime: gameTime,
        expiresAt,
        normalized,
        sport: params.sport,
        eventId: params.eventId,
      })
    } catch (e) {
      console.error('[WeatherService] cache write failed:', e)
    }

    return normalized
  } catch (error) {
    console.error('[WeatherService] getWeatherForEvent failed:', error)
    return null
  }
}

/** MLB parks with retractable roof / dome flag for venue-aware checks */
export const MLB_VENUE_COORDS: Record<string, { lat: number; lng: number; dome: boolean }> = {
  'Tropicana Field': { lat: 27.7682, lng: -82.6534, dome: true },
  'Minute Maid Park': { lat: 29.7573, lng: -95.3555, dome: true },
  'Globe Life Field': { lat: 32.7473, lng: -97.0819, dome: true },
  'loanDepot park': { lat: 25.7781, lng: -80.2197, dome: true },
  'American Family Field': { lat: 43.028, lng: -87.9712, dome: true },
  'Chase Field': { lat: 33.4453, lng: -112.0667, dome: true },
  'Rogers Centre': { lat: 43.6414, lng: -79.3894, dome: true },
}

export const GOLF_VENUE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Augusta National': { lat: 33.503, lng: -82.0199 },
  'Pebble Beach': { lat: 36.5681, lng: -121.9505 },
  'TPC Sawgrass': { lat: 30.1984, lng: -81.394 },
  'Torrey Pines': { lat: 32.9047, lng: -117.2453 },
  'Oak Hill': { lat: 43.1152, lng: -77.525 },
  'Valhalla': { lat: 38.2542, lng: -85.5025 },
}

export const NASCAR_TRACK_COORDS: Record<string, { lat: number; lng: number }> = {
  Daytona: { lat: 29.1851, lng: -81.0705 },
  Talladega: { lat: 33.4335, lng: -86.3142 },
  Charlotte: { lat: 35.3517, lng: -80.6814 },
}

export const TENNIS_VENUE_COORDS: Record<string, { lat: number; lng: number; outdoor: boolean }> = {
  'Indian Wells': { lat: 33.7243, lng: -116.3033, outdoor: true },
  'Miami Open': { lat: 25.768, lng: -80.14, outdoor: true },
  Wimbledon: { lat: 51.4347, lng: -0.2147, outdoor: true },
}

const VENUE_TABLES: Array<Record<string, { lat: number; lng: number; dome?: boolean; outdoor?: boolean }>> = [
  Object.fromEntries(
    Object.entries(NFL_VENUE_COORDS).map(([k, v]) => [k, { lat: v.lat, lng: v.lon, dome: v.dome }])
  ),
  MLB_VENUE_COORDS,
  GOLF_VENUE_COORDS,
  NASCAR_TRACK_COORDS,
  Object.fromEntries(
    Object.entries(TENNIS_VENUE_COORDS).map(([k, v]) => [k, { lat: v.lat, lng: v.lng, outdoor: v.outdoor }])
  ),
]

function matchVenueTable(address: string): { lat: number; lng: number; isDome?: boolean } | null {
  const a = address.trim().toLowerCase()
  for (const table of VENUE_TABLES) {
    for (const [name, row] of Object.entries(table)) {
      if (a.includes(name.toLowerCase()) || name.toLowerCase().includes(a)) {
        return { lat: row.lat, lng: row.lng, isDome: 'dome' in row ? row.dome : undefined }
      }
    }
  }
  return null
}

async function geocodeOpenWeather(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) return null
  try {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(address)}&limit=1&appid=${apiKey}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ lat: number; lon: number }>
    if (!data?.length) return null
    return { lat: data[0]!.lat, lng: data[0]!.lon }
  } catch {
    return null
  }
}

export async function getWeatherForEventByAddress(
  address: string,
  gameTime: Date,
  params?: Partial<WeatherLookupParams>
): Promise<NormalizedWeather | null> {
  const fromTable = matchVenueTable(address)
  const coords = fromTable ?? (await geocodeOpenWeather(address))
  if (!coords) return null

  return getWeatherForEvent({
    lat: coords.lat,
    lng: coords.lng,
    gameTime,
    sport: params?.sport,
    eventId: params?.eventId,
    isIndoor: params?.isIndoor,
    isDome: params?.isDome ?? fromTable?.isDome,
    roofClosed: params?.roofClosed,
    forceRefresh: params?.forceRefresh,
  })
}
