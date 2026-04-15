'use client'

import { useCallback, useEffect, useState } from 'react'
import { Swords, TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type SimResult = {
  winProbabilityA?: number
  winProbabilityB?: number
  projectedScoreA?: number
  projectedScoreB?: number
  keyFactors?: string[]
  swingPlayers?: string[]
}

export function MatchupPrepModal({ open, onClose, leagueId, leagueName, sport = 'NFL' }: { open: boolean; onClose: () => void; leagueId: string; leagueName: string; sport?: string }) {
  const [data, setData] = useState<SimResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!leagueId) return
    setLoading(true); setError(null)
    fetch('/api/sim-matchup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId, sport }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setData(j.simulation ?? j))
      .catch(() => setError('Could not simulate matchup.'))
      .finally(() => setLoading(false))
  }, [leagueId, sport])

  useEffect(() => { if (open && leagueId) load() }, [open, load, leagueId])

  const probA = data?.winProbabilityA ?? 50
  const probB = data?.winProbabilityB ?? 50

  return (
    <AIToolModalShell
      open={open} onClose={onClose}
      title="Matchup Prep" subtitle="Pregame intelligence"
      accentColor="sky"
      icon={<Swords className="h-5 w-5" />}
      loading={loading && !data} error={error}
      empty={!leagueId} emptyMessage="Select a league for matchup analysis."
      onRefresh={load} refreshing={loading && !!data}
      chimmyPrompt={`Prepare me for my matchup in ${leagueName} this week`}
    >
      {data ? (
        <div className="space-y-4">
          {/* Win probability */}
          <div className="rounded-xl border border-sky-500/10 bg-sky-500/[0.03] p-4">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-sky-400/50">Win Probability</p>
            <div className="mb-1 flex justify-between text-[11px] font-bold">
              <span className="text-cyan-300">You {Math.round(probA)}%</span>
              <span className="text-violet-300">Opponent {Math.round(probB)}%</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="rounded-l-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all" style={{ width: `${probA}%` }} />
              <div className="rounded-r-full bg-gradient-to-l from-violet-500 to-violet-400 transition-all" style={{ width: `${probB}%` }} />
            </div>
          </div>

          {/* Projected scores */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <p className="text-[8px] uppercase tracking-wide text-white/25">Your Projection</p>
              <p className="text-xl font-black text-cyan-300">{data.projectedScoreA?.toFixed(1) ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <p className="text-[8px] uppercase tracking-wide text-white/25">Opponent</p>
              <p className="text-xl font-black text-violet-300">{data.projectedScoreB?.toFixed(1) ?? '—'}</p>
            </div>
          </div>

          {/* Key factors */}
          {data.keyFactors && data.keyFactors.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/25">Key Factors</p>
              {data.keyFactors.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/50" />
                  <span className="text-[11px] text-white/50">{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Swing players */}
          {data.swingPlayers && data.swingPlayers.length > 0 && (
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/25">Swing Players</p>
              <div className="flex flex-wrap gap-1.5">
                {data.swingPlayers.slice(0, 6).map((p, i) => (
                  <span key={i} className="rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-2.5 py-1 text-[10px] font-semibold text-amber-200">
                    <Zap className="mr-0.5 inline h-2.5 w-2.5" />{p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        !loading && !error && leagueId && (
          <div className="py-8 text-center">
            <Swords className="mx-auto h-8 w-8 text-white/10" />
            <p className="mt-3 text-[12px] text-white/35">Click refresh to simulate your matchup.</p>
          </div>
        )
      )}
    </AIToolModalShell>
  )
}
