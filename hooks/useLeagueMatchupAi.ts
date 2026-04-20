'use client'

import { useCallback, useState } from 'react'
import type { LeagueMatchupAiResult, StartSitAiResult } from '@/lib/ai-matchup-engine/types'
import type { MatchupPlayerSlot } from '@/lib/matchup-center/types'

export function useLeagueMatchupAi(leagueId: string) {
  const [matchupLoading, setMatchupLoading] = useState(false)
  const [startSitLoading, setStartSitLoading] = useState(false)

  const runMatchupAnalysis = useCallback(
    async (args: { season: number; week: number }) => {
      setMatchupLoading(true)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/ai/matchup`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ season: args.season, week: args.week }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error ?? 'Matchup AI failed')
        return json.analysis as LeagueMatchupAiResult
      } finally {
        setMatchupLoading(false)
      }
    },
    [leagueId],
  )

  const runStartSit = useCallback(
    async (args: { sport: string; playerA: MatchupPlayerSlot; playerB: MatchupPlayerSlot }) => {
      setStartSitLoading(true)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/ai/start-sit`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sport: args.sport,
            playerA: args.playerA,
            playerB: args.playerB,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error ?? 'Start/sit AI failed')
        return json.result as StartSitAiResult
      } finally {
        setStartSitLoading(false)
      }
    },
    [leagueId],
  )

  return { runMatchupAnalysis, runStartSit, matchupLoading, startSitLoading }
}
