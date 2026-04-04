import { getPositionWeatherFactors, isWeatherSensitiveSport } from '@/lib/weather/outdoorSportMetadata'
import type { NormalizedWeather } from '@/lib/weather/weatherService'

export type WeatherAdjustmentFactor = {
  factor: string
  rawValue: string
  impact: number
  direction: 'positive' | 'negative' | 'neutral'
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

export type WeatherImpactResult = {
  sport: string
  position: string
  totalAdjustment: number
  factors: WeatherAdjustmentFactor[]
  shortReason: string
  isOutdoor: boolean
  hasWeatherData: boolean
  confidenceLevel: 'high' | 'medium' | 'low' | 'unavailable'
}

function factorConfidenceScore(c: WeatherAdjustmentFactor['confidence']): number {
  return c === 'high' ? 3 : c === 'medium' ? 2 : 1
}

function minFactorConfidence(factors: WeatherAdjustmentFactor[]): 'high' | 'medium' | 'low' {
  if (factors.length === 0) return 'low'
  let min = 3
  for (const f of factors) {
    min = Math.min(min, factorConfidenceScore(f.confidence))
  }
  return min === 3 ? 'high' : min === 2 ? 'medium' : 'low'
}

function clampAdjustment(total: number, baseline: number): number {
  const cap = Math.abs(baseline) * 0.4
  if (total > cap) return cap
  if (total < -cap) return -cap
  return total
}

export function calculateWeatherImpact(
  sport: string,
  position: string,
  weather: NormalizedWeather | null,
  baselineProjection: number
): WeatherImpactResult {
  const sportKey = sport.trim().toUpperCase()
  const pos = position.trim().toUpperCase()

  if (!weather || !isWeatherSensitiveSport(sportKey)) {
    return {
      sport: sportKey,
      position: pos,
      totalAdjustment: 0,
      factors: [],
      shortReason: 'No meaningful weather impact',
      isOutdoor: true,
      hasWeatherData: false,
      confidenceLevel: 'unavailable',
    }
  }

  if (weather.isIndoor || weather.isDome || weather.roofClosed) {
    return {
      sport: sportKey,
      position: pos,
      totalAdjustment: 0,
      factors: [],
      shortReason: 'No meaningful weather impact',
      isOutdoor: false,
      hasWeatherData: true,
      confidenceLevel: 'high',
    }
  }

  const factors: WeatherAdjustmentFactor[] = []
  const posFactors = getPositionWeatherFactors(sportKey, pos)

  const push = (f: WeatherAdjustmentFactor) => {
    factors.push(f)
  }

  const base = baselineProjection

  // ─── NFL / NCAAF / NCAAFB ───
  if (sportKey === 'NFL' || sportKey === 'NCAAF' || sportKey === 'NCAAFB') {
    const windMph = weather.windSpeedMph
    if (posFactors.includes('wind')) {
      if (windMph >= 25) {
        if (['QB', 'WR', 'TE'].includes(pos)) {
          push({
            factor: 'wind',
            rawValue: `${windMph.toFixed(0)} mph`,
            impact: -(base * 0.15),
            direction: 'negative',
            reason: `${windMph.toFixed(0)}mph wind severely limits passing`,
            confidence: 'high',
          })
        }
        if (pos === 'K') {
          push({
            factor: 'wind',
            rawValue: `${windMph.toFixed(0)} mph`,
            impact: -(base * 0.2),
            direction: 'negative',
            reason: `${windMph.toFixed(0)}mph wind significantly hurts kicking range/accuracy`,
            confidence: 'high',
          })
        }
        if (['DL', 'LB', 'DB'].includes(pos)) {
          push({
            factor: 'wind',
            rawValue: `${windMph.toFixed(0)} mph`,
            impact: -(base * 0.03),
            direction: 'negative',
            reason: `${windMph.toFixed(0)}mph wind slightly affects perimeter play`,
            confidence: 'medium',
          })
        }
      } else if (windMph >= 15) {
        if (['QB', 'WR', 'TE'].includes(pos)) {
          push({
            factor: 'wind',
            rawValue: `${windMph.toFixed(0)} mph`,
            impact: -(base * 0.07),
            direction: 'negative',
            reason: `${windMph.toFixed(0)}mph wind reduces passing efficiency`,
            confidence: 'high',
          })
        }
        if (pos === 'K') {
          push({
            factor: 'wind',
            rawValue: `${windMph.toFixed(0)} mph`,
            impact: -(base * 0.1),
            direction: 'negative',
            reason: `${windMph.toFixed(0)}mph wind impacts kicking accuracy`,
            confidence: 'high',
          })
        }
      } else if (windMph >= 10 && pos === 'K') {
        push({
          factor: 'wind',
          rawValue: `${windMph.toFixed(0)} mph`,
          impact: -(base * 0.05),
          direction: 'negative',
          reason: `${windMph.toFixed(0)}mph wind minor kicking concern`,
          confidence: 'medium',
        })
      }
    }

    if (posFactors.includes('rain') && weather.precipChancePct >= 60) {
      if (['QB', 'WR', 'TE'].includes(pos)) {
        const severity = weather.rainInches > 0.3 ? 'heavy' : 'moderate'
        push({
          factor: 'rain',
          rawValue: `${weather.precipChancePct.toFixed(0)}% chance`,
          impact: severity === 'heavy' ? -(base * 0.1) : -(base * 0.05),
          direction: 'negative',
          reason: `${severity} rain reduces passing volume and accuracy`,
          confidence: weather.rainInches > 0 ? 'high' : 'medium',
        })
      }
      if (pos === 'RB') {
        push({
          factor: 'rain',
          rawValue: `${weather.precipChancePct.toFixed(0)}% chance`,
          impact: base * 0.05,
          direction: 'positive',
          reason: 'Rain may increase rushing volume',
          confidence: weather.rainInches > 0 ? 'high' : 'medium',
        })
      }
    }

    if (posFactors.includes('snow') && weather.snowInches > 0) {
      if (['QB', 'WR', 'TE'].includes(pos)) {
        push({
          factor: 'snow',
          rawValue: `${weather.snowInches.toFixed(2)} in`,
          impact: -(base * 0.12),
          direction: 'negative',
          reason: 'Snow conditions significantly reduce passing efficiency',
          confidence: 'high',
        })
      }
      if (pos === 'RB') {
        push({
          factor: 'snow',
          rawValue: `${weather.snowInches.toFixed(2)} in`,
          impact: base * 0.08,
          direction: 'positive',
          reason: 'Snow game likely increases rushing attempts',
          confidence: 'high',
        })
      }
      if (pos === 'K') {
        push({
          factor: 'snow',
          rawValue: `${weather.snowInches.toFixed(2)} in`,
          impact: -(base * 0.15),
          direction: 'negative',
          reason: 'Snow severely impacts kicking',
          confidence: 'high',
        })
      }
    }

    if (posFactors.includes('cold') && weather.temperatureF < 20 && pos === 'K') {
      push({
        factor: 'cold',
        rawValue: `${weather.temperatureF.toFixed(0)}°F`,
        impact: -(base * 0.12),
        direction: 'negative',
        reason: `${weather.temperatureF.toFixed(0)}°F reduces kicking range and accuracy`,
        confidence: 'high',
      })
    }
  }

  // ─── MLB ───
  if (sportKey === 'MLB') {
    const hitterLike = ['OF', '1B', '3B', 'SS', '2B', 'C']
    if (posFactors.includes('wind') && weather.windSpeedMph >= 12) {
      if (hitterLike.includes(pos)) {
        push({
          factor: 'wind',
          rawValue: `${weather.windSpeedMph.toFixed(0)} mph`,
          impact: base * (weather.windSpeedMph >= 18 ? 0.06 : 0.03),
          direction: 'positive',
          reason: `${weather.windSpeedMph.toFixed(0)}mph wind elevates run environment`,
          confidence: 'low',
        })
      }
      if (pos === 'SP') {
        push({
          factor: 'wind',
          rawValue: `${weather.windSpeedMph.toFixed(0)} mph`,
          impact: -(base * 0.05),
          direction: 'negative',
          reason: 'Windy conditions increase HR risk for pitchers',
          confidence: 'medium',
        })
      }
    }
    if (posFactors.includes('cold') && weather.temperatureF < 45) {
      if (pos === 'SP') {
        push({
          factor: 'cold',
          rawValue: `${weather.temperatureF.toFixed(0)}°F`,
          impact: -(base * 0.04),
          direction: 'negative',
          reason: 'Cold suppresses ball carry, favors pitcher',
          confidence: 'medium',
        })
      }
      if (['OF', '1B', '3B'].includes(pos)) {
        push({
          factor: 'cold',
          rawValue: `${weather.temperatureF.toFixed(0)}°F`,
          impact: -(base * 0.05),
          direction: 'negative',
          reason: 'Cold reduces ball carry, suppresses HRs',
          confidence: 'medium',
        })
      }
    }
    if (
      posFactors.includes('precipitation_delay_risk') &&
      weather.precipChancePct >= 50 &&
      pos === 'SP'
    ) {
      push({
        factor: 'precipitation_delay_risk',
        rawValue: `${weather.precipChancePct.toFixed(0)}%`,
        impact: -(base * 0.2),
        direction: 'negative',
        reason: `${weather.precipChancePct.toFixed(0)}% rain chance creates delay/cancelation risk for SP`,
        confidence: 'medium',
      })
    }
  }

  // ─── SOCCER ───
  if (sportKey === 'SOCCER') {
    if (posFactors.includes('wind') && weather.windSpeedMph >= 20 && ['FWD', 'MID'].includes(pos)) {
      push({
        factor: 'wind',
        rawValue: `${weather.windSpeedMph.toFixed(0)} mph`,
        impact: -(base * 0.06),
        direction: 'negative',
        reason: 'Strong wind reduces crossing and chance creation',
        confidence: 'medium',
      })
    }
    if (posFactors.includes('rain') && weather.precipChancePct >= 70) {
      push({
        factor: 'rain',
        rawValue: `${weather.precipChancePct.toFixed(0)}%`,
        impact: -(base * 0.05),
        direction: 'negative',
        reason: 'Heavy rain affects touch, passing, and shot quality',
        confidence: 'medium',
      })
    }
  }

  // ─── GOLF ───
  if (sportKey === 'GOLF') {
    let golfImpact = 0
    const bits: string[] = []
    if (weather.windSpeedMph >= 20) {
      golfImpact += -(base * 0.12)
      bits.push(`${weather.windSpeedMph.toFixed(0)}mph wind significantly raises scoring difficulty`)
    } else if (weather.windSpeedMph >= 12) {
      golfImpact += -(base * 0.06)
      bits.push(`${weather.windSpeedMph.toFixed(0)}mph wind raises scoring difficulty moderately`)
    }
    if (weather.rainInches > 0) {
      golfImpact += -(base * 0.05)
      bits.push('rain adds scoring challenge')
    }
    if (weather.precipChancePct >= 60) {
      golfImpact += -(base * 0.08)
      bits.push('delay risk')
    }
    if (bits.length) {
      push({
        factor: 'golf_conditions',
        rawValue: `${weather.windSpeedMph.toFixed(0)}mph / ${weather.rainInches.toFixed(2)}in / ${weather.precipChancePct.toFixed(0)}%`,
        impact: golfImpact,
        direction: golfImpact >= 0 ? 'neutral' : 'negative',
        reason: bits.join(' + '),
        confidence: 'medium',
      })
    }
  }

  // ─── NASCAR ───
  if (sportKey === 'NASCAR') {
    if (weather.precipChancePct >= 50) {
      push({
        factor: 'rain',
        rawValue: `${weather.precipChancePct.toFixed(0)}%`,
        impact: -(base * 0.15),
        direction: 'negative',
        reason: `${weather.precipChancePct.toFixed(0)}% rain chance creates race delay/postponement risk`,
        confidence: 'medium',
      })
    }
  }

  // ─── TENNIS ───
  if (sportKey === 'TENNIS') {
    let tImpact = 0
    const parts: string[] = []
    if (weather.windSpeedMph >= 15) {
      tImpact += -(base * 0.08)
      parts.push(`${weather.windSpeedMph.toFixed(0)}mph wind disrupts serve and groundstroke consistency`)
    }
    if (weather.temperatureF >= 95) {
      tImpact -= base * 0.05
      parts.push('extreme heat increases physical attrition risk')
    }
    if (weather.precipChancePct >= 60) {
      tImpact -= base * 0.1
      parts.push(`${weather.precipChancePct.toFixed(0)}% rain chance risks suspension of play`)
    }
    if (parts.length) {
      push({
        factor: 'tennis_conditions',
        rawValue: 'combined',
        impact: tImpact,
        direction: tImpact >= 0 ? 'neutral' : 'negative',
        reason: parts.join('; '),
        confidence: 'medium',
      })
    }
  }

  // ─── HORSE RACING ───
  if (sportKey === 'HORSE_RACING') {
    if (weather.rainInches > 0.1) {
      push({
        factor: 'track_condition',
        rawValue: `${weather.rainInches.toFixed(2)} in rain`,
        impact: base * 0,
        direction: 'neutral',
        reason: 'Rain changes track condition — check horse preferences',
        confidence: 'low',
      })
    } else if (weather.precipChancePct >= 60) {
      push({
        factor: 'rain',
        rawValue: `${weather.precipChancePct.toFixed(0)}%`,
        impact: 0,
        direction: 'neutral',
        reason: `${weather.precipChancePct.toFixed(0)}% rain chance may change track condition`,
        confidence: 'low',
      })
    }
  }

  // ─── CRICKET ───
  if (sportKey === 'CRICKET') {
    if (posFactors.includes('precipitation_delay_risk') && weather.precipChancePct >= 50) {
      push({
        factor: 'precipitation_delay_risk',
        rawValue: `${weather.precipChancePct.toFixed(0)}%`,
        impact: -(base * 0.2),
        direction: 'negative',
        reason: `${weather.precipChancePct.toFixed(0)}% rain chance reduces expected overs (DLS risk)`,
        confidence: 'medium',
      })
    }
    if (pos === 'BOWLER' && weather.humidityPct >= 70) {
      push({
        factor: 'humidity',
        rawValue: `${weather.humidityPct.toFixed(0)}%`,
        impact: base * 0.05,
        direction: 'positive',
        reason: 'High humidity assists swing bowling',
        confidence: 'low',
      })
    }
  }

  let totalAdjustment = factors.reduce((s, f) => s + f.impact, 0)
  totalAdjustment = clampAdjustment(totalAdjustment, base)

  const significant = factors.filter((f) => Math.abs(f.impact) > 1e-6)
  const top =
    significant.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))[0] ?? null
  const shortReason = top?.reason ?? 'No meaningful weather impact'

  if (significant.length === 0) {
    return {
      sport: sportKey,
      position: pos,
      totalAdjustment: 0,
      factors: [],
      shortReason: 'No meaningful weather impact',
      isOutdoor: true,
      hasWeatherData: true,
      confidenceLevel: 'low',
    }
  }

  return {
    sport: sportKey,
    position: pos,
    totalAdjustment,
    factors,
    shortReason,
    isOutdoor: true,
    hasWeatherData: true,
    confidenceLevel: minFactorConfidence(significant),
  }
}
