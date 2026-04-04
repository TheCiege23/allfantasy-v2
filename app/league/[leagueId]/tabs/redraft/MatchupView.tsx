'use client'

import { isWeatherSensitiveSport } from '@/lib/weather/outdoorSportMetadata'

export function MatchupView({
  matchup,
  userRosterName,
  sport,
  leagueId: _leagueId,
  week: _week,
  season: _season,
}: {
  matchup: { homeScore: number; awayScore: number }
  userRosterName: string
  sport: string
  leagueId?: string
  week?: number
  season?: number
}) {
  const showAfHint = isWeatherSensitiveSport(sport)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/[0.08] bg-[#0a1220] p-4">
        <div className="text-center">
          <p className="text-[11px] text-white/45">{userRosterName}</p>
          <p className="text-2xl font-bold text-white">{matchup.homeScore}</p>
        </div>
        <div className="flex flex-col items-center justify-center text-white/35">
          <span className="text-xs uppercase">vs</span>
          <span className="text-[10px]">{sport}</span>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-white/45">Opponent</p>
          <p className="text-2xl font-bold text-white">{matchup.awayScore}</p>
        </div>
      </div>

      {showAfHint ? (
        <div className="mt-2 text-[11px] text-white/35 flex items-center gap-1.5">
          <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent font-bold text-[10px]">
            AF
          </span>
          <span>Click AF on any player for weather-adjusted projections</span>
        </div>
      ) : null}
    </div>
  )
}
