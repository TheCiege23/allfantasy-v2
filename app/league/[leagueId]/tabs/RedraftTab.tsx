'use client'

import { useEffect, useState } from 'react'
import { useRedraftStream } from '@/lib/hooks/useRedraftStream'
import { MatchupView } from './redraft/MatchupView'
import { RosterManager } from './redraft/RosterManager'
import { StandingsView } from './redraft/StandingsView'
import { TradeCenter } from './redraft/TradeCenter'
import { WaiverCenter } from './redraft/WaiverCenter'

export function RedraftTab({ leagueId }: { leagueId: string }) {
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [standings, setStandings] = useState<
    { id: string; teamName: string | null; wins: number; losses: number; pointsFor: number }[]
  >([])

  useRedraftStream(seasonId)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/redraft/season?leagueId=${encodeURIComponent(leagueId)}`, {
        credentials: 'include',
      })
      if (!res.ok || cancelled) return
      const j = (await res.json()) as { season?: { id: string } }
      if (j.season?.id) setSeasonId(j.season.id)
    })()
    return () => {
      cancelled = true
    }
  }, [leagueId])

  useEffect(() => {
    if (!seasonId) return
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/redraft/standings?seasonId=${encodeURIComponent(seasonId)}`, {
        credentials: 'include',
      })
      if (!res.ok || cancelled) return
      const j = (await res.json()) as {
        rosters: { id: string; teamName: string | null; wins: number; losses: number; pointsFor: number }[]
      }
      setStandings(j.rosters ?? [])
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
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <RosterManager seasonId={seasonId} />
        <WaiverCenter seasonId={seasonId} />
      </div>

      <TradeCenter leagueId={leagueId} />

      <StandingsView rows={standings} />
    </div>
  )
}
