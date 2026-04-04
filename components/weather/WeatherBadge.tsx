'use client'

export type WeatherBadgeData = {
  conditionLabel: string | null
  tempF: number | null
  windMph: number | null
  precipChancePct: number | null
} | null

function emojiForCondition(label: string | null): string {
  if (!label) return '🌤'
  const l = label.toLowerCase()
  if (l.includes('rain') || l.includes('shower')) return '🌧'
  if (l.includes('snow')) return '❄️'
  if (l.includes('cloud')) return '☁️'
  if (l.includes('clear') || l.includes('sun')) return '☀️'
  if (l.includes('fog') || l.includes('mist')) return '🌫'
  if (l.includes('storm') || l.includes('thunder')) return '⛈'
  return '🌤'
}

export function WeatherBadge({ weather }: { weather: WeatherBadgeData }) {
  if (!weather?.conditionLabel && weather?.tempF == null && weather?.windMph == null) return null
  const em = emojiForCondition(weather.conditionLabel)
  const temp =
    weather.tempF != null && Number.isFinite(weather.tempF) ? `${Math.round(weather.tempF)}°F` : '—'
  const wind =
    weather.windMph != null && Number.isFinite(weather.windMph)
      ? `${Math.round(weather.windMph)}mph wind`
      : null
  const precip =
    weather.precipChancePct != null && Number.isFinite(weather.precipChancePct)
      ? `${Math.round(weather.precipChancePct)}% precip`
      : null

  return (
    <span
      className="inline-flex max-w-[220px] items-center gap-1 truncate text-[11px] text-white/45"
      data-testid="weather-badge"
    >
      {em}{' '}
      {weather.conditionLabel ? `${weather.conditionLabel} · ` : ''}
      {temp}
      {wind ? ` · ${wind}` : ''}
      {precip ? ` · ${precip}` : ''}
    </span>
  )
}
