'use client'

import { useEffect, useState } from 'react'
import { useRedraftStream } from '@/lib/hooks/useRedraftStream'
import { MatchupView } from './redraft/MatchupView'
import { RosterManager } from './redraft/RosterManager'
import { StandingsView } from './redraft/StandingsView'
import { TradeCenter } from './redraft/TradeCenter'
import { WaiverCenter } from './redraft/WaiverCenter'
import { IDPWaiverSection } from '@/app/idp/components/IDPWaiverSection'
import { fetchRedraftSeason, fetchRedraftStandings } from '@/lib/redraft/client'

export function RedraftTab({ leagueId, idpLeagueUi = false }: { leagueId: string; idpLeagueUi?: boolean }) {
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [standings, setStandings] = useState<
    { id: string; teamName: string | null; wins: number; losses: number; pointsFor: number }[]
  >([])

  useRedraftStream(seasonId)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const season = await fetchRedraftSeason(leagueId)
        if (!cancelled && season?.id) setSeasonId(season.id)
      } catch {
        if (!cancelled) setSeasonId(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [leagueId])

  useEffect(() => {
    if (!seasonId) return
    let cancelled = false
    ;(async () => {
      try {
        const rows = await fetchRedraftStandings(seasonId)
        if (!cancelled) setStandings(rows)
      } catch {
        if (!cancelled) setStandings([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [seasonId])

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <h2 className="text-[15px] font-bold text-white">Redraft</h2>
        <p className="text-[11px] text-white/45">
          Multi-sport redraft engine UI — connect an active `RedraftSeason` for this league to load live data.
        </p>
      </div>

      <MatchupView
        matchup={{ homeScore: 0, awayScore: 0 }}
        userRosterName="Your team"
        sport="NFL"
        leagueId={leagueId}
        week={1}
        season={new Date().getFullYear()}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <RosterManager seasonId={seasonId} />
        <div className="space-y-3">
          <WaiverCenter seasonId={seasonId} />
          {idpLeagueUi ? <IDPWaiverSection leagueId={leagueId} week={1} /> : null}
        </div>
      </div>

      <TradeCenter leagueId={leagueId} seasonId={seasonId} standings={standings} />

      <StandingsView rows={standings} seasonId={seasonId} />
    </div>
  )
}
