'use client'

import { isWeatherSensitiveSport } from '@/lib/weather/outdoorSportMetadata'
import { AFCrestButton } from '@/components/weather/AFCrestButton'

export function MatchupView({
  matchup,
  userRosterName,
  sport,
  leagueId,
  week = 1,
  season,
}: {
  matchup: { homeScore: number; awayScore: number }
  userRosterName: string
  sport: string
  leagueId?: string
  week?: number
  season?: number
}) {
  const yr = season ?? new Date().getFullYear()
  const lid = leagueId ?? 'league'
  const showAf = isWeatherSensitiveSport(sport)
  const homeBaseline = Math.max(0.1, matchup.homeScore)

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

      {showAf ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
          <AFCrestButton
            playerId={`${lid}-team-proj`}
            playerName={userRosterName}
            sport={sport}
            position="TEAM"
            baselineProjection={homeBaseline}
            week={week}
            season={yr}
            size="md"
          />
          <span>AF Projection available — tap AF for weather adjustments (team baseline).</span>
        </div>
      ) : null}
    </div>
  )
}
