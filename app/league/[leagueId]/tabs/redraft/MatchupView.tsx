'use client'

import { isWeatherSensitiveSport } from '@/lib/weather/outdoorSportMetadata'
import type { RedraftMatchupClient } from '@/lib/redraft/client'

function rosterLabel(matchup: RedraftMatchupClient, side: 'home' | 'away') {
  const roster = side === 'home' ? matchup.homeRoster : matchup.awayRoster
  return roster?.teamName ?? roster?.ownerName ?? (side === 'home' ? 'Home roster' : 'Away roster')
}

function scoringSnapshot(matchup: RedraftMatchupClient | null) {
  const raw = matchup?.lineupSnapshots
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const scoring = (raw as Record<string, unknown>).redraftScoring
  return scoring && typeof scoring === 'object' && !Array.isArray(scoring)
    ? (scoring as Record<string, unknown>)
    : null
}

export function MatchupView({
  matchup,
  selectedRosterId,
  sport,
}: {
  matchup: RedraftMatchupClient | null
  selectedRosterId: string | null
  sport: string
}) {
  const showAfHint = isWeatherSensitiveSport(sport)
  const snapshot = scoringSnapshot(matchup)
  const missing = Array.isArray(snapshot?.missingPlayerIds) ? snapshot.missingPlayerIds.length : 0
  const isSelectedAway = matchup?.awayRosterId === selectedRosterId
  const selectedScore = matchup ? (isSelectedAway ? matchup.awayScore : matchup.homeScore) : 0
  const opponentScore = matchup ? (isSelectedAway ? matchup.homeScore : matchup.awayScore) : 0
  const selectedName = matchup ? rosterLabel(matchup, isSelectedAway ? 'away' : 'home') : 'Your roster'
  const opponentName = matchup ? rosterLabel(matchup, isSelectedAway ? 'home' : 'away') : 'Opponent'

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cyan-300/15 bg-[#0a1220] p-4 shadow-[0_0_32px_rgba(34,211,238,0.08)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">Week matchup</p>
            <p className="text-[11px] text-white/40">
              {matchup ? `Week ${matchup.week} - ${matchup.status}` : 'No matchup scheduled for this week.'}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-white/55">
            {sport}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="truncate text-[11px] text-white/50">{selectedName}</p>
            <p className="text-2xl font-bold text-white">{selectedScore.toFixed(2)}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-white/35">
            <span className="text-xs uppercase">vs</span>
            <span className="text-[10px]">cached scoring</span>
          </div>
          <div className="text-center">
            <p className="truncate text-[11px] text-white/50">{opponentName}</p>
            <p className="text-2xl font-bold text-white">{opponentScore.toFixed(2)}</p>
          </div>
        </div>

        {missing > 0 ? (
          <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100">
            {missing} starter score{missing === 1 ? '' : 's'} still missing from the cache. Run NFL score sync
            after the weekly stat cache is refreshed.
          </p>
        ) : null}
      </div>

      {showAfHint ? (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/35">
          <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-[10px] font-bold text-transparent">
            AF
          </span>
          <span>Weather-sensitive scoring surfaces use cached data before any AI analysis.</span>
        </div>
      ) : null}
    </div>
  )
}
