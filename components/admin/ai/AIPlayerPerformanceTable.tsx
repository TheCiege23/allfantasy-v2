'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { AdminAIMetricsBundle } from '@/lib/ai/admin/getAIMetrics'

function TrendIcon({ t }: { t: 'up' | 'down' | 'flat' }) {
  if (t === 'up') return <ArrowUpRight className="h-4 w-4 text-emerald-400" aria-label="up" />
  if (t === 'down') return <ArrowDownRight className="h-4 w-4 text-rose-400" aria-label="down" />
  return <Minus className="h-4 w-4 text-white/35" aria-label="flat" />
}

export function AIPlayerPerformanceTable({ rows }: { rows: AdminAIMetricsBundle['playerPerformance'] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.04] text-[11px] uppercase tracking-wide text-white/50">
          <tr>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">Recs</th>
            <th className="px-3 py-2">Follow rate</th>
            <th className="px-3 py-2">Avg outcome</th>
            <th className="px-3 py-2">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-white/45">
                No player-level payload keys yet — outcome rows need playerId in JSON.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.playerId} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-medium text-white">{r.playerName ?? r.playerId}</td>
                <td className="px-3 py-2 tabular-nums text-white/80">{r.recommendationCount}</td>
                <td className="px-3 py-2 tabular-nums text-cyan-200/90">
                  {r.followRatePct != null ? `${r.followRatePct.toFixed(1)}%` : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-violet-200/90">
                  {r.avgOutcomeScore != null ? r.avgOutcomeScore.toFixed(3) : '—'}
                </td>
                <td className="px-3 py-2">
                  <TrendIcon t={r.trend} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
