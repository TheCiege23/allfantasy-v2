'use client'

import type { AdminAIMetricsBundle } from '@/lib/ai/admin/getAIMetrics'

export function AIUserSegments({ rows }: { rows: AdminAIMetricsBundle['userSegments'] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {rows.map((r) => (
        <div key={r.segment} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-white/45">{r.label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{r.userCount}</p>
          <p className="text-[11px] text-white/40">users (tendency table)</p>
          <div className="mt-3 space-y-1 text-[12px]">
            <div className="flex justify-between gap-2">
              <span className="text-white/45">Avg AI follow rate</span>
              <span className="font-mono text-cyan-300">
                {r.avgFollowRatePct != null ? `${r.avgFollowRatePct.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/45">Avg outcome</span>
              <span className="font-mono text-violet-300">
                {r.avgOutcomeScore != null ? r.avgOutcomeScore.toFixed(3) : '—'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
