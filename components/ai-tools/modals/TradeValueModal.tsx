'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AIToolModalShell } from '../AIToolModalShell'

type Insight = { title: string; description: string; score: number }

export function TradeValueModal({ open, onClose, leagueId, leagueName }: { open: boolean; onClose: () => void; leagueId: string; leagueName: string }) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!leagueId) return
    setLoading(true); setError(null)
    fetch('/api/roster/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setInsights(j.insights ?? []))
      .catch(() => setError('Could not analyze roster values.'))
      .finally(() => setLoading(false))
  }, [leagueId])

  useEffect(() => { if (open) load() }, [open, load])

  function scoreIcon(score: number) {
    if (score >= 70) return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
    if (score <= 30) return <TrendingDown className="h-3.5 w-3.5 text-red-400" />
    return <Minus className="h-3.5 w-3.5 text-white/30" />
  }

  function scoreBg(score: number) {
    if (score >= 70) return 'border-emerald-500/15 bg-emerald-500/[0.04]'
    if (score <= 30) return 'border-red-500/15 bg-red-500/[0.04]'
    return 'border-white/[0.06] bg-white/[0.02]'
  }

  return (
    <AIToolModalShell
      open={open} onClose={onClose}
      title="Trade Value" subtitle="Market analysis console"
      accentColor="purple"
      icon={<ArrowLeftRight className="h-5 w-5" />}
      loading={loading && insights.length === 0} error={error}
      empty={!leagueId} emptyMessage="Select a league for roster value analysis."
      onRefresh={load} refreshing={loading && insights.length > 0}
      chimmyPrompt={`Evaluate trade values and fairness for ${leagueName}`}
    >
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className={`rounded-xl border px-4 py-3 ${scoreBg(insight.score)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {scoreIcon(insight.score)}
                <span className="text-[12px] font-bold text-white/85">{insight.title}</span>
              </div>
              <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-white/50">{insight.score}/100</span>
            </div>
            <p className="mt-1.5 pl-5.5 text-[11px] leading-relaxed text-white/45">{insight.description}</p>
          </div>
        ))}
        {insights.length === 0 && !loading && !error && leagueId && (
          <p className="py-4 text-center text-[12px] text-white/35">No trade insights yet. Ensure your league is synced.</p>
        )}
      </div>
    </AIToolModalShell>
  )
}
