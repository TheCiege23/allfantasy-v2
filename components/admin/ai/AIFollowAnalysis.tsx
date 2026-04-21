'use client'

import { GitCompare } from 'lucide-react'
import type { AdminAIMetricsBundle } from '@/lib/ai/admin/getAIMetrics'

export function AIFollowAnalysis({ data }: { data: AdminAIMetricsBundle['followVsIgnore'] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-transparent p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <GitCompare className="h-4 w-4 text-indigo-400" aria-hidden />
        Follow vs ignore
      </div>
      <p className="mt-1 text-[12px] text-white/50">User-level tendency from resolved outcomes (per-user majority)</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="text-[11px] uppercase text-white/45">Users leaning follow</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">
            {data.pctUsersFollowing != null ? `${data.pctUsersFollowing.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="text-[11px] uppercase text-white/45">Users leaning ignore</p>
          <p className="mt-1 text-xl font-bold text-rose-300">
            {data.pctUsersIgnoring != null ? `${data.pctUsersIgnoring.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="text-[11px] uppercase text-white/45">Avg outcome (followed)</p>
          <p className="mt-1 font-mono text-lg text-cyan-200">
            {data.avgOutcomeWhenFollowed != null ? data.avgOutcomeWhenFollowed.toFixed(3) : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="text-[11px] uppercase text-white/45">Avg outcome (ignored)</p>
          <p className="mt-1 font-mono text-lg text-amber-200">
            {data.avgOutcomeWhenIgnored != null ? data.avgOutcomeWhenIgnored.toFixed(3) : '—'}
          </p>
        </div>
      </div>
      <p className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3 text-[13px] leading-relaxed text-white/75">
        {data.insight}
      </p>
    </div>
  )
}
