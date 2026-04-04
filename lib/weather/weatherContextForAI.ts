import type { WeatherImpactResult } from '@/lib/weather/weatherImpactEngine'
import type { NormalizedWeather } from '@/lib/weather/weatherService'

/**
 * Short line for LLM prompts when weather materially adjusts projections.
 */
export async function buildWeatherContextForAI(
  sport: string,
  position: string,
  weather: NormalizedWeather | null,
  impact: WeatherImpactResult | null
): Promise<string> {
  void sport
  void position
  if (!impact?.hasWeatherData || !weather) return ''
  if (Math.abs(impact.totalAdjustment) <= 1) return ''
  const adj =
    (impact.totalAdjustment >= 0 ? '+' : '') + impact.totalAdjustment.toFixed(1)
  return `Game weather context: ${weather.conditionLabel}, ${weather.temperatureF.toFixed(0)}°F, wind ${weather.windSpeedMph.toFixed(0)}mph, ${weather.precipChancePct.toFixed(0)}% precip chance. AF weather adjustment: ${impact.shortReason} (${adj} pts).`
}
