'use client'

import { useEffect } from 'react'
import { isWeatherSensitiveSport } from '@/lib/weather/outdoorSportMetadata'
import { resolvePlayerName, useSleeperPlayers } from '@/lib/hooks/useSleeperPlayers'
import { WeatherBadge } from '@/components/weather/WeatherBadge'
import { useAFProjection } from '@/components/weather/useAFProjection'
import { placeholderBaselineProjection } from '@/components/weather/placeholderBaseline'
import type { WeatherAdjustmentFactor } from '@/lib/weather/weatherImpactEngine'

export type PlayerStatCardProps = {
  playerId: string
  leagueId: string
  sport: string
  onClose: () => void
}

/** Global player modal — expanded in LEAGUE_PAGE_TASK Step 11. */
export function PlayerStatCard({ playerId, leagueId, sport, onClose }: PlayerStatCardProps) {
  const { players, loading } = useSleeperPlayers(sport)
  const resolved = resolvePlayerName(playerId, players)
  const name = loading ? `Player ${playerId.slice(-4)}` : resolved.name
  const position = resolved.position || '—'
  const baseline = placeholderBaselineProjection(playerId)

  const outdoor = isWeatherSensitiveSport(sport)

  const { loading: afLoading, data: af, fetch: fetchAf } = useAFProjection({
    playerId,
    playerName: name,
    sport,
    position,
    baselineProjection: baseline,
    week: 1,
    season: new Date().getFullYear(),
  })

  useEffect(() => {
    if (!outdoor) return
    void fetchAf()
  }, [outdoor, fetchAf])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const weatherSnap = af?.weatherSnapshot
  const badgeWeather =
    weatherSnap && (weatherSnap.conditionLabel != null || weatherSnap.temperatureF != null)
      ? {
          conditionLabel: weatherSnap.conditionLabel,
          tempF: weatherSnap.temperatureF,
          windMph: weatherSnap.windSpeedMph,
          precipChancePct: weatherSnap.precipChancePct,
        }
      : null

  const factors: WeatherAdjustmentFactor[] = Array.isArray(af?.adjustmentFactors) ? af!.adjustmentFactors : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="af-player-stat-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-[580px] overflow-y-auto rounded-3xl border border-white/[0.12] bg-[#0c0c1e] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="af-player-stat-title" className="text-[10px] uppercase tracking-wider text-white/40">
              Player
            </p>
            <p className="mt-1 text-lg font-semibold text-white/90">{name}</p>
            <p className="mt-2 text-xs text-white/45">
              {position} · League {leagueId} · {sport}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg leading-none text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="mt-4 text-xs text-white/35">
          Placeholder baseline {baseline.toFixed(1)} pts (wire your provider to replace). Player id {playerId}
        </p>

        {outdoor ? (
          <div className="mt-4 border-t border-white/[0.08] pt-4" data-testid="player-stat-weather-impact">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40">Weather Impact</span>
              <WeatherBadge weather={badgeWeather} />
            </div>
            {afLoading ? (
              <p className="text-xs text-white/45">Loading AF weather-adjusted projection…</p>
            ) : af ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <div className="text-xs text-white/40">Baseline</div>
                    <div className="text-lg font-bold text-white">{baseline.toFixed(1)}</div>
                  </div>
                  <div className="text-white/30">→</div>
                  <div>
                    <div className="text-xs text-white/40">AF Projected</div>
                    <div
                      className={`text-lg font-bold ${
                        af.afProjection > baseline ? 'text-green-400' : af.afProjection < baseline ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {af.afProjection.toFixed(1)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-xs italic text-white/50">{af.shortReason}</div>
                </div>
                {Math.abs(af.weatherAdjustment) > 0.05 && factors.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/40">
                    {factors.map((f) => (
                      <div key={`${f.factor}-${f.reason}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1">
                        <span className={f.direction === 'positive' ? 'text-green-400' : f.direction === 'negative' ? 'text-red-400' : 'text-white/50'}>
                          {f.impact > 0 ? '+' : ''}
                          {f.impact.toFixed(1)}
                        </span>{' '}
                        {f.reason}
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-white/40">Weather projection unavailable.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
