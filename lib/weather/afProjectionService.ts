import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { isWeatherSensitiveSport } from '@/lib/weather/outdoorSportMetadata'
import { calculateWeatherImpact, type WeatherAdjustmentFactor } from '@/lib/weather/weatherImpactEngine'
import { getWeatherForEvent, type NormalizedWeather } from '@/lib/weather/weatherService'

export type AFProjection = {
  playerId: string
  playerName: string
  sport: string
  position: string
  baselineProjection: number
  weatherAdjustment: number
  afProjection: number
  adjustmentFactors: WeatherAdjustmentFactor[]
  shortReason: string
  confidenceLevel: string
  isOutdoorGame: boolean
  hasWeatherData: boolean
  weatherSnapshot: {
    temperatureF: number | null
    windSpeedMph: number | null
    precipChancePct: number | null
    conditionLabel: string | null
  } | null
  computedAt: Date
}

const SNAPSHOT_TTL_MS = 30 * 60 * 1000

function buildSnapshotLookupKey(args: {
  playerId: string
  season: number
  week: number | null | undefined
  eventId: string | null | undefined
}): string {
  const w = args.week != null ? String(args.week) : 'n'
  const e = args.eventId?.trim() ? args.eventId : 'n'
  return `${args.playerId}|${args.season}|${w}|${e}`
}

function mapRowToAf(row: {
  playerId: string
  playerName: string
  sport: string
  position: string
  baselineProjection: number
  weatherAdjustment: number
  afProjection: number
  adjustmentFactors: unknown
  adjustmentReason: string | null
  confidenceLevel: string
  isOutdoorGame: boolean
  computedAt: Date
}): AFProjection {
  const factors = Array.isArray(row.adjustmentFactors)
    ? (row.adjustmentFactors as WeatherAdjustmentFactor[])
    : []
  return {
    playerId: row.playerId,
    playerName: row.playerName,
    sport: row.sport,
    position: row.position,
    baselineProjection: row.baselineProjection,
    weatherAdjustment: row.weatherAdjustment,
    afProjection: row.afProjection,
    adjustmentFactors: factors,
    shortReason: row.adjustmentReason ?? '',
    confidenceLevel: row.confidenceLevel,
    isOutdoorGame: row.isOutdoorGame,
    hasWeatherData: factors.length > 0,
    weatherSnapshot: null,
    computedAt: row.computedAt,
  }
}

async function persistSnapshot(
  lookupKey: string,
  params: {
    playerId: string
    playerName: string
    sport: string
    position: string
    week?: number
    season: number
    eventId?: string
  },
  body: {
    baselineProjection: number
    weatherAdjustment: number
    afProjection: number
    adjustmentFactors: WeatherAdjustmentFactor[]
    adjustmentReason: string | null
    confidenceLevel: string
    isOutdoorGame: boolean
  },
  computedAt: Date
): Promise<void> {
  try {
    await prisma.aFProjectionSnapshot.upsert({
      where: { snapshotLookupKey: lookupKey },
      create: {
        snapshotLookupKey: lookupKey,
        playerId: params.playerId,
        playerName: params.playerName,
        sport: params.sport,
        position: params.position,
        week: params.week ?? null,
        season: params.season,
        eventId: params.eventId ?? null,
        baselineProjection: body.baselineProjection,
        weatherAdjustment: body.weatherAdjustment,
        afProjection: body.afProjection,
        adjustmentFactors: body.adjustmentFactors as unknown as Prisma.InputJsonValue,
        adjustmentReason: body.adjustmentReason,
        confidenceLevel: body.confidenceLevel,
        isOutdoorGame: body.isOutdoorGame,
        venueOverride: false,
        computedAt,
      },
      update: {
        playerName: params.playerName,
        sport: params.sport,
        position: params.position,
        baselineProjection: body.baselineProjection,
        weatherAdjustment: body.weatherAdjustment,
        afProjection: body.afProjection,
        adjustmentFactors: body.adjustmentFactors as unknown as Prisma.InputJsonValue,
        adjustmentReason: body.adjustmentReason,
        confidenceLevel: body.confidenceLevel,
        isOutdoorGame: body.isOutdoorGame,
        computedAt,
      },
    })
  } catch (e) {
    console.error('[AFProjection] snapshot write failed:', e)
  }
}

function buildAfResult(
  params: {
    playerId: string
    playerName: string
    sport: string
    position: string
    baselineProjection: number
  },
  weather: NormalizedWeather | null,
  impact: ReturnType<typeof calculateWeatherImpact>,
  computedAt: Date
): AFProjection {
  let af = params.baselineProjection + impact.totalAdjustment
  if (af < 0) af = 0
  return {
    playerId: params.playerId,
    playerName: params.playerName,
    sport: params.sport,
    position: params.position,
    baselineProjection: params.baselineProjection,
    weatherAdjustment: impact.totalAdjustment,
    afProjection: af,
    adjustmentFactors: impact.factors,
    shortReason: impact.shortReason,
    confidenceLevel: impact.confidenceLevel,
    isOutdoorGame: impact.isOutdoor,
    hasWeatherData: impact.hasWeatherData,
    weatherSnapshot: weather
      ? {
          temperatureF: weather.temperatureF,
          windSpeedMph: weather.windSpeedMph,
          precipChancePct: weather.precipChancePct,
          conditionLabel: weather.conditionLabel,
        }
      : null,
    computedAt,
  }
}

export async function getAFProjection(
  params: {
    playerId: string
    playerName: string
    sport: string
    position: string
    baselineProjection: number
    gameLocation: { lat: number; lng: number } | null
    gameTime: Date | null
    isIndoor?: boolean
    isDome?: boolean
    roofClosed?: boolean
    week?: number
    season?: number
    eventId?: string
  },
  opts?: { prefetchedWeather?: NormalizedWeather | null }
): Promise<AFProjection> {
  const season = params.season ?? new Date().getFullYear()
  const lookupKey = buildSnapshotLookupKey({
    playerId: params.playerId,
    season,
    week: params.week,
    eventId: params.eventId,
  })

  const now = Date.now()
  try {
    const existing = await prisma.aFProjectionSnapshot.findUnique({
      where: { snapshotLookupKey: lookupKey },
    })
    if (existing && now - existing.computedAt.getTime() < SNAPSHOT_TTL_MS) {
      return mapRowToAf(existing)
    }
  } catch (e) {
    console.error('[AFProjection] snapshot read failed:', e)
  }

  const computedAt = new Date()

  if (
    !isWeatherSensitiveSport(params.sport) ||
    !params.gameLocation ||
    !params.gameTime
  ) {
    const result = buildAfResult(
      params,
      null,
      calculateWeatherImpact(params.sport, params.position, null, params.baselineProjection),
      computedAt
    )
    await persistSnapshot(
      lookupKey,
      {
        playerId: params.playerId,
        playerName: params.playerName,
        sport: params.sport,
        position: params.position,
        week: params.week,
        season,
        eventId: params.eventId,
      },
      {
        baselineProjection: params.baselineProjection,
        weatherAdjustment: 0,
        afProjection: params.baselineProjection,
        adjustmentFactors: [],
        adjustmentReason: null,
        confidenceLevel: 'unavailable',
        isOutdoorGame: true,
      },
      computedAt
    )
    return {
      ...result,
      weatherAdjustment: 0,
      afProjection: params.baselineProjection,
      adjustmentFactors: [],
      shortReason: '',
      confidenceLevel: 'unavailable',
      hasWeatherData: false,
    }
  }

  const weather =
    opts?.prefetchedWeather !== undefined
      ? opts.prefetchedWeather
      : await getWeatherForEvent({
          lat: params.gameLocation.lat,
          lng: params.gameLocation.lng,
          gameTime: params.gameTime,
          sport: params.sport,
          eventId: params.eventId,
          isIndoor: params.isIndoor,
          isDome: params.isDome,
          roofClosed: params.roofClosed,
        })

  const impact = calculateWeatherImpact(
    params.sport,
    params.position,
    weather,
    params.baselineProjection
  )
  const result = buildAfResult(params, weather, impact, computedAt)

  await persistSnapshot(
    lookupKey,
    {
      playerId: params.playerId,
      playerName: params.playerName,
      sport: params.sport,
      position: params.position,
      week: params.week,
      season,
      eventId: params.eventId,
    },
    {
      baselineProjection: params.baselineProjection,
      weatherAdjustment: impact.totalAdjustment,
      afProjection: result.afProjection,
      adjustmentFactors: impact.factors,
      adjustmentReason: impact.shortReason,
      confidenceLevel: impact.confidenceLevel,
      isOutdoorGame: impact.isOutdoor,
    },
    computedAt
  )

  return result
}

function batchWeatherKey(p: {
  gameLocation: { lat: number; lng: number } | null
  gameTime: Date | null
  isIndoor?: boolean
  isDome?: boolean
  roofClosed?: boolean
}): string | null {
  if (!p.gameLocation || !p.gameTime) return null
  return [
    p.gameLocation.lat.toFixed(2),
    p.gameLocation.lng.toFixed(2),
    p.gameTime.toISOString().slice(0, 13),
    p.isIndoor ? '1' : '0',
    p.isDome ? '1' : '0',
    p.roofClosed ? '1' : '0',
  ].join('|')
}

export async function getAFProjectionBatch(
  players: Array<{
    playerId: string
    playerName: string
    sport: string
    position: string
    baselineProjection: number
    gameLocation: { lat: number; lng: number } | null
    gameTime: Date | null
    isIndoor?: boolean
    isDome?: boolean
    roofClosed?: boolean
    eventId?: string
    week?: number
    season?: number
  }>
): Promise<AFProjection[]> {
  const weatherMemo = new Map<string, NormalizedWeather | null>()

  for (const p of players) {
    const k = batchWeatherKey(p)
    if (!k || weatherMemo.has(k)) continue

    if (!isWeatherSensitiveSport(p.sport) || !p.gameLocation || !p.gameTime) {
      weatherMemo.set(k, null)
      continue
    }

    try {
      const w = await getWeatherForEvent({
        lat: p.gameLocation.lat,
        lng: p.gameLocation.lng,
        gameTime: p.gameTime,
        sport: p.sport,
        eventId: p.eventId,
        isIndoor: p.isIndoor,
        isDome: p.isDome,
        roofClosed: p.roofClosed,
      })
      weatherMemo.set(k, w)
    } catch {
      weatherMemo.set(k, null)
    }
  }

  const out: AFProjection[] = []
  for (const p of players) {
    const k = batchWeatherKey(p)
    const prefetched = k ? weatherMemo.get(k) : undefined
    out.push(
      await getAFProjection(
        p,
        prefetched !== undefined ? { prefetchedWeather: prefetched } : undefined
      )
    )
  }
  return out
}
