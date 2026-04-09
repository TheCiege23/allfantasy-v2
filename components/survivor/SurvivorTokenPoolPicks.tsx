'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coins, Check, X } from 'lucide-react'

interface TokenPoolPick {
  id: string
  week: number
  sport: string
  pickType: string
  pick: Record<string, unknown>
  isCorrect: boolean
  tokensEarned: number
  tokensLost: number
  submittedAt: string
}

interface SurvivorTokenPoolPicksProps {
  leagueId: string
  currentWeek: number
}

export function SurvivorTokenPoolPicks({ leagueId, currentWeek }: SurvivorTokenPoolPicksProps) {
  const [picks, setPicks] = useState<TokenPoolPick[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchPicks = useCallback(async () => {
    try {
      const res = await fetch(`/api/survivor/token-pool?leagueId=${leagueId}`)
      if (res.ok) {
        const data = await res.json()
        setPicks(data.picks ?? [])
        setBalance(data.balance ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => { fetchPicks() }, [fetchPicks])

  const thisWeekPicks = picks.filter((p) => p.week === currentWeek)
  const pastPicks = picks.filter((p) => p.week < currentWeek)

  if (loading) {
    return <div className="text-sm text-white/40">Loading token pool...</div>
  }

  return (
    <div className="space-y-5">
      {/* Token balance */}
      <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-950/10 px-5 py-4">
        <Coins className="h-6 w-6 text-amber-400" />
        <div>
          <div className="text-xs uppercase tracking-wide text-amber-300/60">Token Balance</div>
          <div className="text-2xl font-bold text-amber-100">{balance}</div>
        </div>
      </div>

      {/* This week's picks */}
      <div>
        <div className="mb-2 text-sm font-medium text-white/80">Week {currentWeek} Picks</div>
        {thisWeekPicks.length === 0 ? (
          <p className="text-sm text-white/40">No picks submitted this week.</p>
        ) : (
          <div className="space-y-2">
            {thisWeekPicks.map((pick) => (
              <div
                key={pick.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <div>
                  <span className="text-white/60">{pick.pickType.replace(/_/g, ' ')}</span>
                  <span className="mx-2 text-white/30">·</span>
                  <span className="text-white/80">{pick.sport}</span>
                </div>
                <div className="flex items-center gap-2">
                  {pick.tokensEarned > 0 || pick.tokensLost > 0 ? (
                    pick.isCorrect ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> +{pick.tokensEarned}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400">
                        <X className="h-3.5 w-3.5" /> -{pick.tokensLost}
                      </span>
                    )
                  ) : (
                    <span className="text-white/30">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past picks */}
      {pastPicks.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium text-white/80">Past Picks</div>
          <div className="space-y-1.5">
            {pastPicks.map((pick) => (
              <div
                key={pick.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs"
              >
                <span className="text-white/50">
                  Wk {pick.week} · {pick.pickType.replace(/_/g, ' ')} · {pick.sport}
                </span>
                <span className={pick.isCorrect ? 'text-emerald-400' : 'text-red-400/60'}>
                  {pick.isCorrect ? `+${pick.tokensEarned}` : pick.tokensLost > 0 ? `-${pick.tokensLost}` : 'Miss'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
